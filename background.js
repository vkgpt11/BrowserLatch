import {parseDomains, buildRules} from './policy.mjs';
import {createPasswordRecord, verifyPassword} from './auth.mjs';

const AUTH_KEY = 'parentPassword';
const FAILURE_KEY = 'authFailures';
const SAVED_LISTS_KEY = 'savedModeLists';
const SUPPORT_KEY = 'allowSupportingResources';
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
      const supporting = (await chrome.storage.local.get(SUPPORT_KEY))[SUPPORT_KEY] !== false;
      const blockedPage = chrome.runtime.getURL('blocked.html');
      let next;
      if (policy.mode === 'legacy') {
        next = [...buildRules(policy.legacyAllowed, 'allow', blockedPage, [], supporting),
          ...buildRules(policy.legacyBlocked, 'block', blockedPage).filter(rule => rule.id === 102 || rule.id === 103)];
      } else next = buildRules(policy.domains, policy.mode, blockedPage, policy.exceptions, supporting);
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
  const exceptions = rules.find(rule => rule.id === 100)?.condition.excludedRequestDomains ?? [];
  const blocked = rules.find(rule => rule.id === 102)?.condition.requestDomains ?? [];
  const mode = rules.some(rule => rule.id === 104) ? 'block' : blocked.length ? 'legacy' : 'allow';
  return {mode, domains: mode === 'block' ? blocked : allowed, exceptions: mode === 'allow' ? exceptions : [], legacyAllowed: allowed, legacyBlocked: blocked};
}

function revisionOf(rules, supporting) { return JSON.stringify({rules: [...rules].sort((a, b) => a.id - b.id), supporting}); }

async function recordFailure(failure, now) {
  const count = failure.count + 1;
  const lockedUntil = count >= 5 ? now + Math.min(15 * 60 * 1000, 30000 * 2 ** Math.min(count - 5, 5)) : 0;
  await chrome.storage.local.set({[FAILURE_KEY]: {count, lockedUntil}});
  return count;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('options.html')) return;
  if (!['status', 'setup', 'unlock', 'lock', 'read', 'save', 'setMode', 'setSupporting', 'changePassword'].includes(message?.type)) return;
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
    let supporting = (await chrome.storage.local.get(SUPPORT_KEY))[SUPPORT_KEY] !== false;
    let migrationNotice = '';
    if (message.type === 'save' || message.type === 'setMode' || message.type === 'setSupporting') {
      if (message.revision !== revisionOf(rules, supporting)) throw new Error('Settings changed in another tab. Reload before saving.');
      if (message.type === 'save') {
        if (policy.mode === 'legacy') throw new Error('Choose a list mode before editing websites.');
        const domains = parseDomains(message.domains);
        const requested = message.exceptions === undefined ? policy.exceptions : parseDomains(message.exceptions);
        const exceptions = requested.filter(child => domains.some(parent => child !== parent && child.endsWith(`.${parent}`)));
        if (message.exceptions !== undefined && exceptions.length !== requested.length) throw new Error('Each blocked exception must be below an allowed parent domain.');
        await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: rules.map(rule => rule.id), addRules: buildRules(domains, policy.mode, chrome.runtime.getURL('blocked.html'), exceptions, supporting)});
      } else if (message.type === 'setSupporting') {
        if (policy.mode !== 'allow') throw new Error('This setting applies only in Allowlist mode.');
        if (typeof message.enabled !== 'boolean') throw new Error('Choose whether supporting resources can load.');
        if (message.enabled === supporting) throw new Error('This resource setting is already active.');
        const next = buildRules(policy.domains, 'allow', chrome.runtime.getURL('blocked.html'), policy.exceptions, message.enabled);
        await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: rules.map(rule => rule.id), addRules: next});
        try { await chrome.storage.local.set({[SUPPORT_KEY]: message.enabled}); }
        catch (error) {
          await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: next.map(rule => rule.id), addRules: rules});
          throw error;
        }
        supporting = message.enabled;
      } else {
        if (!['allow', 'block'].includes(message.mode)) throw new Error('Choose Allowlist or Blocklist mode.');
        if (message.mode === policy.mode) throw new Error('This mode is already active.');
        const saved = (await chrome.storage.local.get(SAVED_LISTS_KEY))[SAVED_LISTS_KEY] ?? {};
        let lists;
        if (policy.mode === 'legacy') {
          const allow = policy.legacyAllowed.filter(domain => !policy.legacyBlocked.some(blocked => domain === blocked || domain.endsWith(`.${blocked}`)));
          const allowExceptions = policy.legacyBlocked.filter(child => allow.some(parent => child !== parent && child.endsWith(`.${parent}`)));
          lists = {allow, block: policy.legacyBlocked, allowExceptions, legacyAllowedBackup: policy.legacyAllowed};
          if (message.mode === 'allow' && allowExceptions.length) migrationNotice = `${allowExceptions.join(', ')} remain blocked as exceptions under their allowed parent websites. Review them below.`;
        } else lists = {...saved, [policy.mode]: policy.domains, ...(policy.mode === 'allow' ? {allowExceptions: policy.exceptions} : {})};
        const next = parseDomains((lists[message.mode] ?? []).join('\n'));
        const exceptions = message.mode === 'allow' ? parseDomains((lists.allowExceptions ?? []).join('\n')).filter(child => next.some(parent => child !== parent && child.endsWith(`.${parent}`))) : [];
        await chrome.storage.local.set({[SAVED_LISTS_KEY]: lists});
        await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: rules.map(rule => rule.id), addRules: buildRules(next, message.mode, chrome.runtime.getURL('blocked.html'), exceptions, supporting)});
      }
      rules = await chrome.declarativeNetRequest.getDynamicRules();
      policy = policyFromRules(rules);
    }
    let currentSite = '';
    let requestedUrl = '';
    let requestedTabId;
    if (message.type === 'read') {
      const {pendingSite} = await chrome.storage.session.get('pendingSite');
      await chrome.storage.session.remove('pendingSite');
      if (pendingSite && now - pendingSite.capturedAt < UNLOCK_MS) {
        currentSite = validBlockedHost(pendingSite.host);
        try {
          const url = new URL(pendingSite.requestedUrl);
          if (currentSite && ['http:', 'https:'].includes(url.protocol) && url.hostname.toLowerCase() === currentSite && url.href.length <= 8192 && Number.isSafeInteger(pendingSite.tabId) && pendingSite.tabId >= 0) {
            requestedUrl = url.href;
            requestedTabId = pendingSite.tabId;
          }
        } catch {}
      }
    }
    const savedLists = (await chrome.storage.local.get(SAVED_LISTS_KEY))[SAVED_LISTS_KEY] ?? {};
    unlockedUntil = Date.now() + UNLOCK_MS;
    return {ok: true, configured: true, unlocked: true, expiresAt: unlockedUntil, ...policy, supportingResources: supporting, revision: revisionOf(rules, supporting), currentSite, requestedUrl, requestedTabId, migrationNotice, legacyAllowedBackup: savedLists.legacyAllowedBackup ?? []};
  });
  queue = job.catch(() => {});
  job.then(respond, error => respond({ok: false, error: error.message}));
  return true;
});
