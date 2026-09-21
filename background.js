import {parseDomains, buildRules} from './policy.mjs';
import {createPasswordRecord, verifyPassword} from './auth.mjs';

const AUTH_KEY = 'parentPassword';
const FAILURE_KEY = 'authFailures';
const UNLOCK_MS = 5 * 60 * 1000;
let unlockedUntil = 0;
let queue = Promise.resolve();

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onInstalled.addListener(({reason}) => {
  chrome.storage.local.setAccessLevel?.({accessLevel: 'TRUSTED_CONTEXTS'});
  if (reason === 'install') chrome.runtime.openOptionsPage();
  if (reason === 'update') {
    const migration = queue.then(async () => {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      const domains = rules.find(rule => rule.id === 100)?.condition.requestDomains ?? [];
      if (!domains.length || rules.some(rule => rule.id === 101)) return;
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(rule => rule.id), addRules: buildRules(domains)
      });
    });
    queue = migration.catch(error => console.error('Could not update allowlist rules:', error));
    return migration;
  }
});

// Dynamic rules are the single source of truth and persist across browser restarts.
// Serialize saves; a failed atomic rule update leaves the previous list intact.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('options.html')) return;
  if (!['status', 'setup', 'unlock', 'lock', 'read', 'save', 'changePassword'].includes(message?.type)) return;
  const job = queue.then(async () => {
    const stored = await chrome.storage.local.get([AUTH_KEY, FAILURE_KEY]);
    const record = stored[AUTH_KEY];
    const failure = stored[FAILURE_KEY] ?? {count: 0, lockedUntil: 0};
    const now = Date.now();

    if (message.type === 'status') return {ok: true, configured: Boolean(record), unlocked: Boolean(record) && now < unlockedUntil, retryAfterMs: Math.max(0, failure.lockedUntil - now)};
    if (message.type === 'setup') {
      if (record) throw new Error('A parent password is already configured.');
      await chrome.storage.local.set({[AUTH_KEY]: await createPasswordRecord(message.password), [FAILURE_KEY]: {count: 0, lockedUntil: 0}});
      unlockedUntil = now + UNLOCK_MS;
      return {ok: true, configured: true, unlocked: true};
    }
    if (message.type === 'unlock') {
      if (!record) throw new Error('Create a parent password first.');
      if (failure.lockedUntil > now) throw new Error(`Too many attempts. Try again in ${Math.ceil((failure.lockedUntil - now) / 1000)} seconds.`);
      if (!await verifyPassword(message.password, record)) {
        const count = failure.count + 1;
        const lockedUntil = count >= 5 ? now + Math.min(15 * 60 * 1000, 30000 * 2 ** Math.min(count - 5, 5)) : 0;
        await chrome.storage.local.set({[FAILURE_KEY]: {count, lockedUntil}});
        throw new Error(count >= 5 ? 'Too many attempts. Settings are temporarily locked.' : 'Incorrect password.');
      }
      await chrome.storage.local.set({[FAILURE_KEY]: {count: 0, lockedUntil: 0}});
      unlockedUntil = now + UNLOCK_MS;
      return {ok: true, configured: true, unlocked: true};
    }
    if (message.type === 'lock') {
      unlockedUntil = 0;
      return {ok: true, configured: Boolean(record), unlocked: false};
    }
    if (!record || now >= unlockedUntil) throw new Error('Settings are locked. Enter the parent password.');
    unlockedUntil = now + UNLOCK_MS;
    if (message.type === 'changePassword') {
      if (!await verifyPassword(message.currentPassword, record)) throw new Error('Current password is incorrect.');
      await chrome.storage.local.set({[AUTH_KEY]: await createPasswordRecord(message.newPassword), [FAILURE_KEY]: {count: 0, lockedUntil: 0}});
      return {ok: true, configured: true, unlocked: true};
    }
    if (message.type === 'save') {
      const domains = parseDomains(message.text);
      const current = await chrome.declarativeNetRequest.getDynamicRules();
      await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: current.map(rule => rule.id), addRules: buildRules(domains)});
    }
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return {ok: true, configured: true, unlocked: true, domains: rules.find(rule => rule.id === 100)?.condition.requestDomains ?? []};
  });
  queue = job.catch(() => {});
  job.then(respond, error => respond({ok: false, error: error.message}));
  return true;
});
