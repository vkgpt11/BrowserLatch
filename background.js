import {parseDomains, buildRules} from './policy.mjs';
import {createPasswordRecord, verifyPassword} from './auth.mjs';

const AUTH_KEY = 'parentPassword';
const FAILURE_KEY = 'authFailures';
const SAVED_LISTS_KEY = 'savedModeLists';
const UNLOCK_MS = 5 * 60 * 1000;
let unlockedUntil = 0;
let queue = Promise.resolve();

chrome.action.onClicked.addListener(async tab => {
  let host = '';
  try {
    const url = new URL(tab.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') host = url.hostname.toLowerCase();
    else if (url.origin === chrome.runtime.getURL('').slice(0, -1) && url.pathname === '/blocked.html') host = validBlockedHost(url.searchParams.get('site'));
  } catch {}
  if (host) await chrome.storage.session.set({pendingSite: {host, capturedAt: Date.now()}});
  else await chrome.storage.session.remove('pendingSite');
  await chrome.runtime.openOptionsPage();
});
chrome.runtime.onInstalled.addListener(({reason}) => {
  chrome.storage.local.setAccessLevel?.({accessLevel: 'TRUSTED_CONTEXTS'});
  if (reason === 'install') chrome.runtime.openOptionsPage();
  if (reason === 'install' || reason === 'update') {
    const migration = queue.then(async () => {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      const policy = policyFromRules(rules);
      const blockedPage = chrome.runtime.getURL('blocked.html');
      let next;
      if (policy.mode === 'legacy') {
        next = [...buildRules(policy.legacyAllowed, 'allow', blockedPage),
          ...buildRules(policy.legacyBlocked, 'block', blockedPage).filter(rule => rule.id === 102 || rule.id === 103)];
      } else next = buildRules(policy.domains, policy.mode, blockedPage);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(rule => rule.id), addRules: next
      });
    });
    queue = migration.catch(error => console.error('Could not update website rules:', error));
    return migration;
  }
});

function validBlockedHost(value) {
  if (!value || /[\s/:@?#*\\]/u.test(value)) return '';
  try {
    const host = new URL(`https://${value}`).hostname.toLowerCase();
    return host === value.toLowerCase() && host.length <= 253 && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ? host : '';
  } catch { return ''; }
}

// Dynamic rules are the single source of truth and persist across browser restarts.
// Serialize saves; a failed atomic rule update leaves the previous list intact.
function policyFromRules(rules) {
  const allowed = rules.find(rule => rule.id === 100)?.condition.requestDomains ?? [];
  const blocked = rules.find(rule => rule.id === 102)?.condition.requestDomains ?? [];
  const mode = rules.some(rule => rule.id === 104) ? 'block' : blocked.length ? 'legacy' : 'allow';
  return {mode, domains: mode === 'block' ? blocked : allowed, legacyAllowed: allowed, legacyBlocked: blocked};
}

function revisionOf(rules) { return JSON.stringify([...rules].sort((a, b) => a.id - b.id)); }

async function recordFailure(failure, now) {
  const count = failure.count + 1;
  const lockedUntil = count >= 5 ? now + Math.min(15 * 60 * 1000, 30000 * 2 ** Math.min(count - 5, 5)) : 0;
  await chrome.storage.local.set({[FAILURE_KEY]: {count, lockedUntil}});
  return count;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('options.html')) return;
  if (!['status', 'setup', 'unlock', 'lock', 'read', 'save', 'setMode', 'changePassword'].includes(message?.type)) return;
  const job = queue.then(async () => {
    const stored = await chrome.storage.local.get([AUTH_KEY, FAILURE_KEY]);
    const record = stored[AUTH_KEY];
    const failure = stored[FAILURE_KEY] ?? {count: 0, lockedUntil: 0};
    const now = Date.now();

    if (message.type === 'status') return {ok: true, configured: Boolean(record), unlocked: Boolean(record) && now < unlockedUntil, expiresAt: unlockedUntil, retryAfterMs: Math.max(0, failure.lockedUntil - now)};
    if (message.type === 'setup') {
      if (record) throw new Error('A parent password is already configured.');
      await chrome.storage.local.set({[AUTH_KEY]: await createPasswordRecord(message.password), [FAILURE_KEY]: {count: 0, lockedUntil: 0}});
      unlockedUntil = now + UNLOCK_MS;
      return {ok: true, configured: true, unlocked: true, expiresAt: unlockedUntil};
    }
    if (message.type === 'unlock') {
      if (!record) throw new Error('Create a parent password first.');
      if (failure.lockedUntil > now) throw new Error(`Too many attempts. Try again in ${Math.ceil((failure.lockedUntil - now) / 1000)} seconds.`);
      if (!await verifyPassword(message.password, record)) {
        const count = await recordFailure(failure, now);
        throw new Error(count >= 5 ? 'Too many attempts. Settings are temporarily locked.' : 'Incorrect password.');
      }
      await chrome.storage.local.set({[FAILURE_KEY]: {count: 0, lockedUntil: 0}});
      unlockedUntil = now + UNLOCK_MS;
      return {ok: true, configured: true, unlocked: true, expiresAt: unlockedUntil};
    }
    if (message.type === 'lock') {
      unlockedUntil = 0;
      await chrome.storage.session.set({accessLockVersion: now});
      return {ok: true, configured: Boolean(record), unlocked: false};
    }
    if (!record || now >= unlockedUntil) throw new Error('Settings are locked. Enter the parent password.');
    if (message.type === 'changePassword') {
      if (failure.lockedUntil > now) throw new Error('Too many attempts. Settings are temporarily locked.');
      if (!await verifyPassword(message.currentPassword, record)) {
        const count = await recordFailure(failure, now);
        if (count >= 5) { unlockedUntil = 0; await chrome.storage.session.set({accessLockVersion: now}); }
        throw new Error(count >= 5 ? 'Too many attempts. Settings are temporarily locked.' : 'Current password is incorrect.');
      }
      await chrome.storage.local.set({[AUTH_KEY]: await createPasswordRecord(message.newPassword), [FAILURE_KEY]: {count: 0, lockedUntil: 0}});
      unlockedUntil = Date.now() + UNLOCK_MS;
      return {ok: true, configured: true, unlocked: true, expiresAt: unlockedUntil};
    }
    let rules = await chrome.declarativeNetRequest.getDynamicRules();
    let policy = policyFromRules(rules);
    let migrationNotice = '';
    if (message.type === 'save' || message.type === 'setMode') {
      if (message.revision !== revisionOf(rules)) throw new Error('The list changed in another tab. Reload settings before saving.');
      if (message.type === 'save') {
        if (policy.mode === 'legacy') throw new Error('Choose a list mode before editing websites.');
        const domains = parseDomains(message.domains);
        await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: rules.map(rule => rule.id), addRules: buildRules(domains, policy.mode, chrome.runtime.getURL('blocked.html'))});
      } else {
        if (!['allow', 'block'].includes(message.mode)) throw new Error('Choose Allowlist or Blocklist mode.');
        if (message.mode === policy.mode) throw new Error('This mode is already active.');
        const saved = (await chrome.storage.local.get(SAVED_LISTS_KEY))[SAVED_LISTS_KEY] ?? {};
        let lists;
        if (policy.mode === 'legacy') {
          const conflicts = policy.legacyAllowed.filter(allowed => policy.legacyBlocked.some(blocked => blocked === allowed || blocked.endsWith(`.${allowed}`)));
          lists = {allow: policy.legacyAllowed.filter(domain => !conflicts.includes(domain)), block: policy.legacyBlocked, legacyAllowedBackup: policy.legacyAllowed, legacyConflicts: conflicts};
        } else lists = {...saved, [policy.mode]: policy.domains};
        if (message.mode === 'allow' && lists.legacyConflicts?.length) migrationNotice = `${lists.legacyConflicts.join(', ')} were left off the allowlist because they contain previously blocked subdomains. Review and add only domains you want fully allowed.`;
        const next = parseDomains((lists[message.mode] ?? []).join('\n'));
        await chrome.storage.local.set({[SAVED_LISTS_KEY]: lists});
        await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: rules.map(rule => rule.id), addRules: buildRules(next, message.mode, chrome.runtime.getURL('blocked.html'))});
      }
      rules = await chrome.declarativeNetRequest.getDynamicRules();
      policy = policyFromRules(rules);
    }
    let currentSite = '';
    if (message.type === 'read') {
      const {pendingSite} = await chrome.storage.session.get('pendingSite');
      await chrome.storage.session.remove('pendingSite');
      if (pendingSite && now - pendingSite.capturedAt < UNLOCK_MS) currentSite = pendingSite.host;
    }
    const savedLists = (await chrome.storage.local.get(SAVED_LISTS_KEY))[SAVED_LISTS_KEY] ?? {};
    unlockedUntil = Date.now() + UNLOCK_MS;
    return {ok: true, configured: true, unlocked: true, expiresAt: unlockedUntil, ...policy, revision: revisionOf(rules), currentSite, migrationNotice, legacyAllowedBackup: savedLists.legacyAllowedBackup ?? []};
  });
  queue = job.catch(() => {});
  job.then(respond, error => respond({ok: false, error: error.message}));
  return true;
});
