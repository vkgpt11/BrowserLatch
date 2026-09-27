import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {parseDomains} from '../policy.mjs';
import {validateRulesBackup} from '../backup.mjs';

const html = await readFile(new URL('../options.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../options.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
const openWindows = new Set();
test.afterEach(() => { for (const window of openWindows) window.close(); openWindows.clear(); });

async function createPage({mode = 'allow', domains = [], exceptions = [], supportingResources = true, strictContentSites = supportingResources ? [] : domains, currentSite = '', requestedUrl = '', legacyAllowed = [], legacyBlocked = [], guidedSetupPending = false, expiryOffsetMs = 300000} = {}) {
  const dom = new JSDOM(html, {url: 'https://extension.test/options.html', runScripts: 'outside-only'});
  openWindows.add(dom.window);
  const state = {mode, domains, exceptions, strictContentSites, temporaryGrants: [], currentSite, requestedUrl, openTabUrl: 'chrome-extension://unit-test/blocked.html?site=' + currentSite, navigated: [], legacyAllowed, legacyBlocked, saved: {allow: [], block: [], allowExceptions: []}, revision: 1, unlocked: true, failSave: false, guidedSetupPending, expiryOffsetMs};
  let onStorageChanged;
  dom.window.confirm = () => true;
  dom.window.chrome = {storage: {onChanged: {addListener(fn) {onStorageChanged = fn;}}}, tabs: {get: async () => ({url: state.openTabUrl}), update: async (id, value) => {state.navigated.push({id, url: value.url});}}, runtime: {getURL: path => `chrome-extension://unit-test/${path}`, sendMessage: async message => {
    if (message.type === 'status') return {ok: true, configured: true, unlocked: state.unlocked, expiresAt: Date.now() + state.expiryOffsetMs};
    if (message.type === 'read') return {ok: true, mode: state.mode, domains: state.domains, exceptions: state.exceptions, strictContentSites: state.strictContentSites, temporaryGrants: state.temporaryGrants, revision: String(state.revision), currentSite: state.currentSite, requestedUrl: state.requestedUrl, requestedTabId: state.requestedUrl ? 42 : undefined, legacyAllowed: state.legacyAllowed, legacyBlocked: state.legacyBlocked, guidedSetupPending: state.guidedSetupPending, expiresAt: Date.now() + state.expiryOffsetMs};
    if (message.type === 'lock') {state.unlocked = false; return {ok: true};}
    if (!state.unlocked) return {ok: false, error: 'Settings are locked.'};
    if (message.type === 'clearPendingSite') return {ok: true};
    if (message.type === 'getTemporary') return {ok: true, temporaryGrants: state.temporaryGrants};
    if (message.type === 'inspectBackup') return {ok: true, backup: validateRulesBackup(message.backup), expiresAt: Date.now() + state.expiryOffsetMs};
    if (message.type === 'exportBackup') return {ok: true, backup: {format: 'browselatch-rules', version: 2, mode: state.mode, allowlist: state.mode === 'allow' ? state.domains : state.saved.allow, blocklist: state.mode === 'block' ? state.domains : state.saved.block, blockedSubdomains: state.exceptions, strictContentSites: state.strictContentSites}, expiresAt: Date.now() + state.expiryOffsetMs};
    if (message.revision !== String(state.revision)) return {ok: false, error: 'The list changed in another tab. Reload settings before saving.'};
    if (message.type === 'save') {
      if (state.failSave) return {ok: false, error: 'Rejected update'};
      try { const nextDomains = parseDomains(message.domains); const nextExceptions = parseDomains(message.exceptions ?? '');
        if (nextExceptions.some(child => !nextDomains.some(parent => child !== parent && child.endsWith(`.${parent}`)))) throw new Error('Each blocked exception must be below an allowed parent domain.');
        const nextStrict = message.strictContentSites === undefined ? state.strictContentSites.filter(site => nextDomains.includes(site)) : parseDomains(message.strictContentSites);
        if (state.mode === 'allow' && nextStrict.some(site => !nextDomains.includes(site))) throw new Error('A content choice has no allowed website.');
        state.domains = nextDomains; state.exceptions = nextExceptions; state.strictContentSites = nextStrict; }
      catch (error) { return {ok: false, error: error.message}; }
      state.revision++;
    } else if (message.type === 'setSupporting') {
      if (state.mode !== 'allow' || !state.domains.includes(message.domain) || typeof message.enabled !== 'boolean') return {ok: false, error: 'Invalid setting.'};
      state.strictContentSites = message.enabled ? state.strictContentSites.filter(site => site !== message.domain) : [...state.strictContentSites, message.domain];
      state.revision++;
    } else if (message.type === 'grantTemporary') {
      state.temporaryGrants.push({slot: state.temporaryGrants.length, domain: message.domain, kind: message.kind, ...(message.kind === 'visit' ? {tabId: message.tabId} : {expiresAt: Date.now() + 900000})});
    } else if (message.type === 'revokeTemporary') {
      state.temporaryGrants = state.temporaryGrants.filter(grant => grant.slot !== message.slot);
    } else if (message.type === 'completeSetup') {
      if (!state.guidedSetupPending) return {ok: false, error: 'The first-time setup is already complete.'};
      try { state.domains = parseDomains(message.domain); }
      catch (error) { return {ok: false, error: error.message}; }
      state.mode = message.mode;
      state.guidedSetupPending = false;
      state.revision++;
    } else if (message.type === 'importBackup') {
      state.mode = message.backup.mode;
      state.saved = {allow: message.backup.allowlist, block: message.backup.blocklist, allowExceptions: message.backup.blockedSubdomains};
      state.domains = [...state.saved[state.mode]];
      state.exceptions = state.mode === 'allow' ? [...state.saved.allowExceptions] : [];
      state.strictContentSites = [...message.backup.strictContentSites];
      state.revision++;
    } else if (message.type === 'setMode') {
      if (state.mode === 'legacy') {state.saved.allow = [...state.legacyAllowed]; state.saved.block = [...state.legacyBlocked];
        state.saved.allowExceptions = state.legacyBlocked.filter(child => state.saved.allow.some(parent => child !== parent && child.endsWith(`.${parent}`)));}
      else {state.saved[state.mode] = [...state.domains]; if (state.mode === 'allow') state.saved.allowExceptions = [...state.exceptions];}
      state.mode = message.mode;
      state.domains = [...state.saved[state.mode]];
      state.exceptions = state.mode === 'allow' ? [...state.saved.allowExceptions] : [];
      state.revision++;
    } else return {ok: false, error: `Unexpected message: ${message.type}`};
    return {ok: true, mode: state.mode, domains: state.domains, exceptions: state.exceptions, strictContentSites: state.strictContentSites, temporaryGrants: state.temporaryGrants, revision: String(state.revision), currentSite: '', guidedSetupPending: state.guidedSetupPending, expiresAt: Date.now() + state.expiryOffsetMs};
  }}};
  dom.window.eval(script);
  await settle();
  const $ = selector => dom.window.document.querySelector(selector);
  const fire = (selector, type) => $(selector).dispatchEvent(new dom.window.Event(type, {bubbles: true, cancelable: true}));
  return {dom, $, fire, state, triggerSite() {onStorageChanged({pendingSite: {newValue: {host: state.currentSite}}}, 'session');}, triggerLock() {onStorageChanged({accessLockVersion: {newValue: Date.now()}}, 'session');}};
}

test('one active list can be searched and checked against effective access', async () => {
  const page = await createPage({domains: ['example.com', 'youtube.com']});
  const {$, fire} = page;
  assert.equal($('#list-title').textContent, 'Allowed websites');
  assert.equal($('#sites').options.length, 2);
  assert.equal($('#match-count').hidden, true);
  $('#search').value = 'YOUTUBE';
  fire('#search', 'input');
  assert.equal($('#sites').options.length, 1);
  assert.equal($('#match-count').textContent, '1 result');
  $('#check-domain').value = 'https://www.youtube.com/watch?v=sample';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Allowed by youtube.com/);
  $('#check-domain').value = 'other.test';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Blocked because/);
  page.dom.window.close();
});

test('parent can grant one visit from a blocked page, return to it, and end access', async () => {
  const page = await createPage({currentSite: 'example.com', requestedUrl: 'https://example.com/article?id=2'});
  const {$, fire, state} = page;
  assert.equal($('#temporary-domain').value, 'example.com');
  assert.equal($('#temporary-kind').querySelector('option[value="visit"]').disabled, false);
  $('#temporary-kind').value = 'visit';
  fire('#temporary-form', 'submit');
  await settle();
  assert.equal(state.temporaryGrants[0].kind, 'visit');
  assert.deepEqual(state.navigated, [{id: 42, url: 'https://example.com/article?id=2'}]);
  assert.equal($('#temporary-list').options.length, 1);
  $('#temporary-list').value = '0';
  fire('#temporary-list', 'change');
  fire('#temporary-remove', 'click');
  await settle();
  assert.deepEqual(state.temporaryGrants, []);
  assert.equal($('#temporary-empty').hidden, false);
});

test('parent can give 15-minute access without changing saved website rules', async () => {
  const page = await createPage({domains: ['youtube.com']});
  const {$, fire, state} = page;
  assert.equal($('#temporary-kind').querySelector('option[value="visit"]').disabled, true);
  $('#temporary-domain').value = 'example.com';
  fire('#temporary-domain', 'input');
  fire('#temporary-form', 'submit');
  await settle();
  assert.equal(state.temporaryGrants[0].kind, 'timed');
  assert.deepEqual(state.domains, ['youtube.com']);
  assert.match($('#temporary-list').options[0].textContent, /example.com/);
});

test('diagnostic distinguishes a blocked main page and can allow it', async () => {
  const page = await createPage({domains: ['youtube.com']});
  const {$, fire, state} = page;
  $('#check-domain').value = 'https://news.example/path';
  fire('#check-form', 'submit');
  assert.match($('#diagnosis').textContent, /main website is blocked/);
  assert.equal($('#diagnostic-action').textContent, 'Allow news.example');
  fire('#diagnostic-action', 'click');
  await settle();
  assert.deepEqual(state.domains, ['news.example', 'youtube.com']);
  assert.match($('#diagnosis').textContent, /allows the main website/);
  assert.equal($('#diagnostic-action').hidden, true);
});

test('diagnostic checks an embedded provider and removes a blocked child exception', async () => {
  const page = await createPage({domains: ['example.com'], exceptions: ['login.example.com']});
  const {$, fire, state} = page;
  $('#check-domain').value = 'example.com';
  $('#problem-kind').value = 'frame';
  fire('#problem-kind', 'change');
  assert.equal($('#related-box').hidden, false);
  fire('#check-form', 'submit');
  assert.match($('#diagnosis').textContent, /cannot identify it from this page alone/);
  assert.equal($('#diagnostic-action').hidden, true);
  $('#related-domain').value = 'login.example.com';
  fire('#related-domain', 'input');
  fire('#check-form', 'submit');
  assert.match($('#diagnosis').textContent, /blocked in the sign-in or payment box/);
  assert.equal($('#diagnostic-action').textContent, 'Remove block for login.example.com');
  fire('#diagnostic-action', 'click');
  await settle();
  assert.deepEqual(state.exceptions, []);
  assert.match($('#diagnosis').textContent, /can open in the sign-in or payment box/);
});

test('diagnostic checks strict supporting content and refreshes after its setting changes', async () => {
  const page = await createPage({domains: ['example.com'], supportingResources: false});
  const {$, fire, state} = page;
  $('#check-domain').value = 'example.com';
  $('#problem-kind').value = 'content';
  fire('#problem-kind', 'change');
  fire('#check-form', 'submit');
  assert.match($('#diagnosis').textContent, /content from unlisted websites is blocked/);
  assert.equal($('#diagnostic-action').textContent, 'Review content setting');
  $('#related-domain').value = 'cdn.example.net';
  fire('#related-domain', 'input');
  assert.equal($('#diagnosis-results').hidden, true);
  fire('#check-form', 'submit');
  assert.match($('#diagnosis').textContent, /blocked by the content setting/);
  $('#supporting-resources').checked = true;
  fire('#supporting-resources', 'change');
  fire('#network-form', 'submit');
  await settle();
  assert.deepEqual(state.strictContentSites, []);
  assert.match($('#diagnosis').textContent, /is allowed under these rules/);
  assert.equal($('#diagnostic-action').hidden, true);
});

test('diagnostic reports a blocked provider in blocklist mode and can remove its rule', async () => {
  const page = await createPage({mode: 'block', domains: ['pay.example']});
  const {$, fire, state} = page;
  $('#check-domain').value = 'shop.example';
  $('#problem-kind').value = 'frame';
  fire('#problem-kind', 'change');
  $('#related-domain').value = 'login.pay.example';
  fire('#check-form', 'submit');
  assert.equal($('#diagnostic-action').textContent, 'Remove block for pay.example');
  fire('#diagnostic-action', 'click');
  await settle();
  assert.deepEqual(state.domains, []);
  assert.match($('#diagnosis').textContent, /can open in the sign-in or payment box/);
});

test('new users choose a rule and first site while existing users keep their settings', async () => {
  const existing = await createPage({domains: ['example.com']});
  assert.equal(existing.$('#guide-panel').hidden, true);
  assert.equal(existing.$('#main-settings').hidden, false);
  const page = await createPage({guidedSetupPending: true});
  const {$, fire, state} = page;
  assert.equal($('#guide-panel').hidden, false);
  assert.equal($('#main-settings').hidden, true);
  $('input[name="guide-mode"][value="block"]').checked = true;
  fire('input[name="guide-mode"][value="block"]', 'change');
  $('#guide-domain').value = 'games.test';
  fire('#guide-domain', 'input');
  assert.match($('#guide-outcome').textContent, /games.test and its subdomains will be blocked/);
  fire('#guide-form', 'submit');
  await settle();
  assert.equal(state.guidedSetupPending, false);
  assert.equal(state.mode, 'block');
  assert.deepEqual(state.domains, ['games.test']);
  assert.equal($('#guide-panel').hidden, true);
  assert.equal($('#main-settings').hidden, false);
  assert.equal($('#list-title').textContent, 'Blocked websites');
});

test('first-time guide keeps an invalid site open for correction', async () => {
  const page = await createPage({guidedSetupPending: true});
  const {$, fire, state} = page;
  $('input[name="guide-mode"][value="allow"]').checked = true;
  $('#guide-domain').value = 'com';
  fire('#guide-form', 'submit');
  await settle();
  assert.equal(state.guidedSetupPending, true);
  assert.equal($('#guide-panel').hidden, false);
  assert.match($('#guide-status').textContent, /Setup not saved/);
  $('#guide-domain').value = '';
  fire('#guide-domain', 'input');
  assert.match($('#guide-outcome').textContent, /No websites will open/);
});

test('first-time guide can use a blocked website and reopen its original page', async () => {
  const page = await createPage({guidedSetupPending: true, currentSite: 'www.youtube.com', requestedUrl: 'https://www.youtube.com/watch?v=sample&t=2'});
  assert.equal(page.$('#guide-domain').value, 'www.youtube.com');
  page.$('input[name="guide-mode"][value="allow"]').checked = true;
  page.fire('#guide-form', 'submit');
  await settle();
  assert.deepEqual(page.state.domains, ['www.youtube.com']);
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://www.youtube.com/watch?v=sample&t=2'}]);
});

test('import previews both lists and replaces them only after confirmation', async () => {
  const page = await createPage({domains: ['old.test']});
  const {$, fire, state, dom} = page;
  const backup = {format: 'browselatch-rules', version: 1, mode: 'block', allowlist: ['youtube.com'], blocklist: ['games.test'], blockedSubdomains: [], allowSupportingResources: false};
  Object.defineProperty($('#import-file'), 'files', {configurable: true, value: [{size: 200, text: async () => JSON.stringify(backup)}]});
  fire('#import-file', 'change');
  await settle();
  assert.deepEqual(state.domains, ['old.test']);
  assert.match($('#import-preview').textContent, /1 allowed, 1 blocked/);
  assert.equal($('#import-rules').disabled, false);
  dom.window.confirm = () => false;
  fire('#import-rules', 'click');
  await settle();
  assert.deepEqual(state.domains, ['old.test']);
  dom.window.confirm = () => true;
  fire('#import-rules', 'click');
  await settle();
  assert.equal(state.mode, 'block');
  assert.deepEqual(state.domains, ['games.test']);
  assert.deepEqual([...state.saved.allow], ['youtube.com']);
  assert.deepEqual(state.strictContentSites, ['youtube.com']);
  assert.match($('#backup-status').textContent, /password was not changed/);
  assert.equal($('#import-rules').disabled, true);
});

test('export downloads a dated rules file from the unlocked page', async () => {
  const page = await createPage({domains: ['example.com']});
  let filename = '';
  let file;
  page.dom.window.URL.createObjectURL = blob => { file = blob; return 'blob:backup'; };
  page.dom.window.URL.revokeObjectURL = () => {};
  page.dom.window.HTMLAnchorElement.prototype.click = function() { filename = this.download; };
  page.fire('#export-rules', 'click');
  await settle();
  assert.match(filename, /^browselatch-rules-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(file.type, 'application/json');
  assert.match(page.$('#backup-status').textContent, /Backup downloaded/);
});

test('add, remove, and undo keep the active list in sync', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  assert.equal($('#remove').closest('.site-list-box').querySelector('#sites'), $('#sites'));
  assert.equal($('#remove').disabled, true);
  $('#new-domain').value = 'youtube.com';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['example.com', 'youtube.com']);
  assert.equal($('#undo').hidden, false);
  $('#sites').value = 'youtube.com';
  fire('#sites', 'change');
  assert.equal($('#remove').disabled, false);
  assert.equal($('#remove').getAttribute('aria-label'), 'Remove youtube.com from allowed websites');
  fire('#remove', 'click');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  assert.equal($('#remove').disabled, true);
  fire('#undo', 'click');
  await settle();
  assert.deepEqual(state.domains, ['example.com', 'youtube.com']);
  page.dom.window.close();
});

test('mode switch changes default access and restores the other saved list', async () => {
  const page = await createPage({domains: ['youtube.com']});
  const {$, fire, state} = page;
  $('#mode-select').value = 'block';
  fire('#mode-select', 'change');
  fire('#mode-form', 'submit');
  await settle();
  assert.equal(state.mode, 'block');
  assert.deepEqual(state.domains, []);
  assert.match($('#mode-summary').textContent, /All others can open/);
  assert.equal($('#add-label').textContent, 'Website to block');
  assert.equal($('#add').textContent, 'Block website');
  $('#new-domain').value = 'bad.test';
  fire('#add-form', 'submit');
  await settle();
  $('#check-domain').value = 'bad.test';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Blocked by bad.test/);
  $('#mode-select').value = 'allow';
  fire('#mode-select', 'change');
  fire('#mode-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['youtube.com']);
  page.dom.window.close();
});

test('legacy mixed rules require a one-time choice without losing the other list', async () => {
  const page = await createPage({mode: 'legacy', domains: ['example.com'], legacyAllowed: ['example.com'], legacyBlocked: ['kids.example.com']});
  const {$, fire, state} = page;
  assert.equal($('#legacy-note').hidden, false);
  assert.equal($('#rules-panel').hidden, true);
  $('#mode-select').value = 'block';
  fire('#mode-form', 'submit');
  await settle();
  assert.equal($('#legacy-note').hidden, true);
  assert.deepEqual(state.domains, ['kids.example.com']);
  page.dom.window.close();
});

test('parent can inspect, add, remove, and undo blocked child exceptions', async () => {
  const page = await createPage({domains: ['example.com'], exceptions: ['kids.example.com'], currentSite: 'games.kids.example.com'});
  const {$, fire, state} = page;
  assert.equal($('#exceptions-panel').hidden, false);
  assert.match($('#current-site-state').textContent, /kids.example.com is a blocked subdomain/);
  assert.equal($('#current-site-action').textContent, 'Allow this website');
  $('#check-domain').value = 'www.example.com';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Allowed by example.com/);
  $('#check-domain').value = 'games.kids.example.com';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /blocked subdomain/);
  $('#exception-domain').value = 'video.example.com';
  fire('#exception-form', 'submit');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com', 'video.example.com']);
  $('#exceptions').value = 'video.example.com';
  fire('#exceptions', 'change');
  fire('#remove-exception', 'click');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com']);
  assert.equal($('#undo-exception').hidden, false);
  assert.match($('#exception-status').textContent, /no longer blocked/);
  fire('#undo-exception', 'click');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com', 'video.example.com']);
  $('#sites').value = 'example.com';
  fire('#sites', 'change');
  fire('#remove', 'click');
  await settle();
  assert.deepEqual(state.domains, []);
  assert.deepEqual(state.exceptions, []);
  fire('#undo', 'click');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  assert.deepEqual(state.exceptions, ['kids.example.com', 'video.example.com']);
  page.dom.window.close();
});

test('empty blocked-parts list uses a message and reveals controls only after an entry is added', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  assert.equal($('#exceptions-empty').hidden, false);
  assert.equal($('#exceptions').hidden, true);
  assert.equal($('#remove-exception').hidden, true);
  $('#exception-domain').value = 'kids.example.com';
  fire('#exception-form', 'submit');
  await settle();
  assert.deepEqual(state.exceptions, ['kids.example.com']);
  assert.equal($('#exceptions-empty').hidden, true);
  assert.equal($('#exceptions').hidden, false);
  assert.equal($('#remove-exception').hidden, false);
  assert.match($('#exception-status').textContent, /kids.example.com is now blocked/);
  assert.equal($('#undo-exception').hidden, false);
  fire('#undo-exception', 'click');
  await settle();
  assert.deepEqual(state.exceptions, []);
  assert.equal($('#exceptions-empty').hidden, false);
  page.dom.window.close();
});

test('parent chooses supporting content separately for each website and drafts survive unrelated edits', async () => {
  const page = await createPage({domains: ['school.example', 'youtube.com']});
  const {$, fire, state} = page;
  assert.equal($('#network-panel').hidden, false);
  assert.equal($('#network-site').value, 'school.example');
  assert.equal($('#supporting-resources').checked, true);
  assert.equal($('#apply-network').disabled, true);
  $('#supporting-resources').checked = false;
  fire('#supporting-resources', 'change');
  assert.equal($('#apply-network').disabled, false);
  $('#search').value = 'youtube';
  fire('#search', 'input');
  assert.equal($('#supporting-resources').checked, false);
  assert.equal($('#apply-network').disabled, false);
  assert.match($('#network-status').textContent, /Save change/);
  fire('#network-form', 'submit');
  await settle();
  assert.deepEqual(state.strictContentSites, ['school.example']);
  assert.equal($('#apply-network').disabled, true);
  assert.match($('#network-status').textContent, /Extra content from other websites is blocked/);
  $('#network-site').value = 'youtube.com';
  fire('#network-site', 'change');
  assert.equal($('#supporting-resources').checked, true);
  $('#new-domain').value = 'new.test';
  fire('#add-form', 'submit');
  await settle();
  $('#network-site').value = 'new.test';
  fire('#network-site', 'change');
  assert.equal($('#supporting-resources').checked, true);
  $('#mode-select').value = 'block';
  fire('#mode-form', 'submit');
  await settle();
  assert.equal($('#network-panel').hidden, true);
  $('#mode-select').value = 'allow';
  fire('#mode-form', 'submit');
  await settle();
  $('#network-site').value = 'school.example';
  fire('#network-site', 'change');
  assert.equal($('#supporting-resources').checked, false);
  page.dom.window.close();
});

test('invalid entries and rejected saves retain the previous list', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  $('#new-domain').value = 'com';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  assert.match($('#status').textContent, /Not saved/);
  state.failSave = true;
  $('#new-domain').value = 'other.test';
  fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(state.domains, ['example.com']);
  page.dom.window.close();
});

test('invalid blocked subdomain stays on settings and shows its validation error', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  $('#exception-domain').value = 'other.test';
  fire('#exception-form', 'submit');
  await settle();
  assert.equal($('#settings').hidden, false);
  assert.equal($('#auth-card').hidden, true);
  assert.deepEqual(state.exceptions, []);
  assert.match($('#exception-status').textContent, /Not saved: Each blocked exception/);
});

test('a pending mode choice survives searching, selecting, and saving a website', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire} = page;
  $('#mode-select').value = 'block';
  fire('#mode-select', 'change');
  $('#search').value = 'example';
  fire('#search', 'input');
  $('#sites').value = 'example.com';
  fire('#sites', 'change');
  $('#new-domain').value = 'youtube.com';
  fire('#add-form', 'submit');
  await settle();
  assert.equal($('#mode-select').value, 'block');
  assert.equal($('#apply-mode').disabled, false);
  assert.equal(page.state.mode, 'allow');
});

test('website check updates after rule and mode changes and clears when input changes', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire} = page;
  $('#check-domain').value = 'youtube.com';
  fire('#check-form', 'submit');
  assert.match($('#check-result').textContent, /Blocked because/);
  $('#new-domain').value = 'youtube.com';
  fire('#add-form', 'submit');
  await settle();
  assert.match($('#check-result').textContent, /Allowed by youtube.com/);
  $('#sites').value = 'youtube.com';
  fire('#sites', 'change');
  fire('#remove', 'click');
  await settle();
  assert.match($('#check-result').textContent, /Blocked because/);
  $('#mode-select').value = 'block';
  fire('#mode-form', 'submit');
  await settle();
  assert.match($('#check-result').textContent, /Allowed because/);
  $('#check-domain').value = 'other.test';
  fire('#check-domain', 'input');
  assert.equal($('#check-result').textContent, '');
});

test('save conflict keeps feedback visible after refreshing rules from another tab', async () => {
  const page = await createPage({domains: ['example.com']});
  const {$, fire, state} = page;
  state.domains = ['example.com', 'other.test'];
  state.revision++;
  $('#new-domain').value = 'youtube.com';
  fire('#add-form', 'submit');
  await settle();
  assert.equal($('#settings').hidden, false);
  assert.deepEqual([...$('#sites').options].map(option => option.value), ['example.com', 'other.test']);
  assert.match($('#status').textContent, /Not saved: The list changed in another tab/);
});

test('current-site shortcut opens an existing parent rule without adding a duplicate', async () => {
  const page = await createPage({domains: ['youtube.com'], currentSite: 'www.youtube.com'});
  const {$, fire, state} = page;
  assert.match($('#current-site-state').textContent, /Allowed by youtube.com/);
  assert.equal($('#current-site-action').textContent, 'View saved rule');
  fire('#current-site-action', 'click');
  assert.equal($('#sites').value, 'youtube.com');
  assert.deepEqual(state.domains, ['youtube.com']);
  page.dom.window.close();
});

test('current-site action adds an unlisted website and can be undone', async () => {
  const page = await createPage({domains: ['youtube.com'], currentSite: 'aajtak.com'});
  const {$, fire, state} = page;
  assert.equal($('#current-site-action').textContent, 'Allow this website');
  fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(state.domains, ['aajtak.com', 'youtube.com']);
  assert.equal($('#current-site-action').textContent, 'View saved rule');
  assert.match($('#status').textContent, /aajtak.com added to allowed websites/);
  fire('#undo', 'click');
  await settle();
  assert.deepEqual(state.domains, ['youtube.com']);
  page.dom.window.close();
});

test('allowing a blocked website reopens its exact page after saving', async () => {
  const page = await createPage({currentSite: 'www.youtube.com', requestedUrl: 'https://www.youtube.com/watch?v=sample&t=2'});
  assert.equal(page.$('#current-site-action').textContent, 'Allow and open website');
  page.fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(page.state.domains, ['www.youtube.com']);
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://www.youtube.com/watch?v=sample&t=2'}]);
  assert.match(page.$('#status').textContent, /Opening the requested website/);
});

test('adding a covering Allowlist domain reopens the exact requested URL', async () => {
  const page = await createPage({currentSite: 'www.youtube.com', requestedUrl: 'https://www.youtube.com/watch?v=sample&t=2'});
  page.$('#new-domain').value = 'youtube.com';
  page.fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(page.state.domains, ['youtube.com']);
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://www.youtube.com/watch?v=sample&t=2'}]);
});

test('the requested page survives a second settings read before the parent allows it', async () => {
  const page = await createPage({currentSite: 'www.youtube.com', requestedUrl: 'https://www.youtube.com/watch?v=sample&t=2'});
  page.state.currentSite = '';
  page.state.requestedUrl = '';
  page.triggerSite();
  await settle();
  assert.equal(page.$('#current-site-domain').textContent, 'www.youtube.com');
  page.fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://www.youtube.com/watch?v=sample&t=2'}]);
});

test('allowing a blocked subdomain removes every covering exception and opens its requested page', async () => {
  const page = await createPage({domains: ['example.com'], exceptions: ['kids.example.com', 'games.kids.example.com'], currentSite: 'games.kids.example.com', requestedUrl: 'https://games.kids.example.com/game?level=2'});
  assert.equal(page.$('#current-site-action').textContent, 'Allow and open website');
  page.fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(page.state.exceptions, []);
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://games.kids.example.com/game?level=2'}]);
});

test('allowing a blocked website in Blocklist mode removes covering rules and opens its requested page', async () => {
  const page = await createPage({mode: 'block', domains: ['example.com', 'kids.example.com', 'other.test'], currentSite: 'kids.example.com', requestedUrl: 'https://kids.example.com/watch?v=2'});
  assert.equal(page.$('#current-site-action').textContent, 'Allow and open website');
  page.fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(page.state.domains, ['other.test']);
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://kids.example.com/watch?v=2'}]);
});

test('failed saves and unrelated rules do not reopen the blocked tab', async () => {
  const page = await createPage({currentSite: 'www.youtube.com', requestedUrl: 'https://www.youtube.com/watch?v=sample'});
  page.state.failSave = true;
  page.fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(page.state.navigated, []);
  page.state.failSave = false;
  page.$('#new-domain').value = 'example.com';
  page.fire('#add-form', 'submit');
  await settle();
  assert.deepEqual(page.state.navigated, []);
});

test('removing a blocked subdomain reopens its denied page', async () => {
  const page = await createPage({domains: ['example.com'], exceptions: ['kids.example.com'], currentSite: 'games.kids.example.com', requestedUrl: 'https://games.kids.example.com/game?level=2'});
  page.$('#exceptions').value = 'kids.example.com';
  page.fire('#exceptions', 'change');
  page.fire('#remove-exception', 'click');
  await settle();
  assert.deepEqual(page.state.navigated, [{id: 42, url: 'https://games.kids.example.com/game?level=2'}]);
});

test('current-site action blocks a website in block mode', async () => {
  const page = await createPage({mode: 'block', currentSite: 'aajtak.com'});
  const {$, fire, state} = page;
  assert.equal($('#current-site-action').textContent, 'Block this website');
  fire('#current-site-action', 'click');
  await settle();
  assert.deepEqual(state.domains, ['aajtak.com']);
  assert.match($('#status').textContent, /aajtak.com added to blocked websites/);
  page.dom.window.close();
});

test('an already open settings page refreshes its current-site shortcut', async () => {
  const page = await createPage({domains: ['youtube.com']});
  page.state.currentSite = 'new.test';
  page.triggerSite();
  await settle();
  assert.equal(page.$('#current-site-domain').textContent, 'new.test');
  page.dom.window.close();
});

test('visible website rules hide when parent access expires', async () => {
  const page = await createPage({domains: ['youtube.com'], expiryOffsetMs: 20});
  const {$} = page;
  assert.equal($('#settings').hidden, false);
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal($('#settings').hidden, true);
  assert.equal($('#sites').options.length, 0);
  page.dom.window.close();
});

test('locking another settings tab hides this tab immediately', async () => {
  const page = await createPage({domains: ['youtube.com']});
  assert.equal(page.$('#settings').hidden, false);
  page.triggerLock();
  assert.equal(page.$('#settings').hidden, true);
  assert.equal(page.$('#sites').options.length, 0);
  page.dom.window.close();
});

test('locked settings explain the password step and can reveal or hide the password', async () => {
  const page = await createPage({domains: ['youtube.com']});
  const {$, fire} = page;
  page.triggerLock();
  assert.equal($('#unlock-panel').hidden, false);
  assert.match($('#auth-status').textContent, /Enter your parent password/);
  assert.equal($('#unlock-form').previousElementSibling, $('#auth-status'));
  assert.equal($('label[for="password"]').textContent, 'Parent password');
  assert.equal($('#password').type, 'password');
  $('#show-password').checked = true;
  fire('#show-password', 'change');
  assert.equal($('#password').type, 'text');
  $('#show-password').checked = false;
  fire('#show-password', 'change');
  assert.equal($('#password').type, 'password');
  page.dom.window.close();
});
