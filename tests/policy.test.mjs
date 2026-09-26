import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {parseDomains, buildRules} from '../policy.mjs';
import {isPublicSuffix} from '../public-suffix.mjs';
import {createPasswordRecord, verifyPassword, validatePassword} from '../auth.mjs';

globalThis.crypto ??= webcrypto;
const BLOCKED_PAGE = 'chrome-extension://unit-test/blocked.html';

test('password records are salted and never store the plaintext', async () => {
  assert.throws(() => validatePassword('short'));
  const first = await createPasswordRecord('correct horse');
  const second = await createPasswordRecord('correct horse');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(JSON.stringify(first).includes('correct horse'), false);
  assert.equal(await verifyPassword('correct horse', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('domain input normalizes names and rejects unsafe broad entries', () => {
  assert.deepEqual(parseDomains('EXAMPLE.com\nexample.com\n\nbücher.de'), ['example.com', 'xn--bcher-kva.de']);
  assert.deepEqual(parseDomains(''), []);
  for (const input of ['com', 'co.uk', 'co.nz', 'com.mx', 'github.io', 'test.ck', 'xn--55qx5d.cn', 'https://example.com/path', '*.com', 'example.com:443', 'user@example.com', 'example.com?q=x', 'example.com.', '-bad.com', 'a..com', 'example.com\\evil', 'two words']) {
    assert.throws(() => parseDomains(input), undefined, input);
  }
  assert.throws(() => parseDomains(Array.from({length: 501}, (_, n) => `a${n}.test`).join('\n')));
});

test('bundled PSL handles country suffixes, private suffixes, wildcard rules and exceptions', () => {
  for (const suffix of ['com', 'co.uk', 'co.nz', 'com.mx', 'github.io', 'test.ck', 'c.kobe.jp', 'xn--55qx5d.cn']) {
    assert.equal(isPublicSuffix(suffix), true, suffix);
  }
  for (const site of ['youtube.com', 'www.ck', 'city.kobe.jp', 'my.github.io', 'xn--85x722f.xn--55qx5d.cn']) {
    assert.equal(isPublicSuffix(site), false, site);
    assert.deepEqual(parseDomains(site), [site]);
  }
});

test('allowlist mode only exempts listed page navigations and their supporting resources', async () => {
  assert.deepEqual(buildRules([], 'allow', BLOCKED_PAGE).map(rule => rule.id), [105]);
  const [fallback, allow, supporting] = buildRules(['youtube.com'], 'allow', BLOCKED_PAGE);
  assert.equal(fallback.action.redirect.regexSubstitution, `${BLOCKED_PAGE}?site=\\1#\\0`);
  assert.deepEqual(allow.condition.requestDomains, ['youtube.com']);
  assert.ok(allow.condition.resourceTypes.includes('main_frame'));
  assert.deepEqual(supporting.condition.initiatorDomains, ['youtube.com']);
  assert.equal(supporting.condition.resourceTypes.includes('main_frame'), false);
  assert.equal(supporting.condition.resourceTypes.includes('sub_frame'), false);
  const baseline = JSON.parse(await readFile(new URL('../rules.json', import.meta.url)));
  assert.ok(baseline.every(rule => rule.priority < allow.priority));
});

test('blocklist mode exempts unlisted requests and blocks listed destinations', () => {
  const rules = buildRules(['example.com'], 'block', BLOCKED_PAGE);
  assert.deepEqual(rules.map(rule => rule.id), [105, 104, 102, 103]);
  assert.ok(rules[1].condition.resourceTypes.includes('main_frame'));
  assert.equal(rules[1].condition.requestDomains, undefined);
  assert.ok(rules[2].priority > rules[1].priority);
  assert.deepEqual(rules[2].condition.requestDomains, ['example.com']);
  assert.equal(rules[2].action.redirect.regexSubstitution, `${BLOCKED_PAGE}?site=\\1#\\0`);
  assert.equal(rules[3].action.type, 'block');
  assert.deepEqual(buildRules([], 'block', BLOCKED_PAGE).map(rule => rule.id), [105, 104]);
  assert.throws(() => buildRules([], 'invalid', BLOCKED_PAGE));
});

test('allowlist can preserve blocked children without denying their allowed parent', () => {
  const rules = buildRules(['example.com'], 'allow', BLOCKED_PAGE, ['kids.example.com']);
  assert.deepEqual(rules.map(rule => rule.id), [105, 100, 101, 106]);
  assert.deepEqual(rules[1].condition.excludedRequestDomains, ['kids.example.com']);
  assert.deepEqual(rules[2].condition.excludedInitiatorDomains, ['kids.example.com']);
  assert.deepEqual(rules[3].condition.requestDomains, ['kids.example.com']);
  assert.ok(rules[3].priority > rules[2].priority);
  assert.throws(() => buildRules(['example.com'], 'allow', BLOCKED_PAGE, ['other.test']));
  assert.throws(() => buildRules(['example.com'], 'allow', BLOCKED_PAGE, ['example.com']));
});

test('strict content setting removes the unlisted supporting-request exemption', () => {
  const strict = buildRules(['youtube.com'], 'allow', BLOCKED_PAGE, [], false);
  assert.deepEqual(strict.map(rule => rule.id), [105, 100]);
  const compatible = buildRules(['youtube.com'], 'allow', BLOCKED_PAGE, [], true);
  assert.deepEqual(compatible.map(rule => rule.id), [105, 100, 101]);
  assert.equal(compatible[2].condition.resourceTypes.includes('sub_frame'), false);
  assert.throws(() => buildRules(['youtube.com'], 'allow', BLOCKED_PAGE, [], 'false'));
});

async function worker(initialRules = []) {
  let listener, installedListener, actionListener, persisted = structuredClone(initialRules), fail = false;
  const local = {};
  const session = {};
  const chrome = {
    action: {onClicked: {addListener(fn) {actionListener = fn;}}},
    runtime: {id: 'unit-test', getURL: path => `chrome-extension://unit-test/${path}`, openOptionsPage() {}, onInstalled: {addListener(fn) {installedListener = fn;}}, onMessage: {addListener(fn) {listener = fn;}}},
    storage: {
      local: {setAccessLevel() {}, get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in local).map(key => [key, structuredClone(local[key])])), set: async values => Object.assign(local, structuredClone(values))},
      session: {get: async key => ({[key]: session[key]}), set: async values => Object.assign(session, values), remove: async key => {delete session[key];}}
    },
    declarativeNetRequest: {
      getDynamicRules: async () => structuredClone(persisted),
      updateDynamicRules: async ({addRules}) => { if (fail) throw new Error('Rejected update'); persisted = structuredClone(addRules); }
    }
  };
  const source = (await readFile(new URL('../background.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(source, {chrome, parseDomains, buildRules, createPasswordRecord, verifyPassword, Date, URL});
  const sender = {id: chrome.runtime.id, url: chrome.runtime.getURL('options.html')};
  const send = message => new Promise(resolve => listener(message, sender, resolve));
  return {send, chrome, local, session, actionListener, installedListener, setFail(value) {fail = value;}, getRules() {return persisted;}};
}

test('worker requires a password, rejects stale saves, and preserves lists when modes change', async () => {
  const app = await worker();
  assert.equal((await app.send({type: 'save', domains: 'example.com'})).ok, false);
  assert.equal((await app.send({type: 'setup', password: 'parent passphrase'})).ok, true);
  let state = await app.send({type: 'read'});
  assert.equal(state.mode, 'allow');
  assert.deepEqual([...state.domains], []);
  const oldRevision = state.revision;
  state = await app.send({type: 'save', domains: 'youtube.com', revision: state.revision});
  assert.deepEqual([...state.domains], ['youtube.com']);
  state = await app.send({type: 'setSupporting', enabled: false, revision: state.revision});
  assert.equal(state.supportingResources, false);
  assert.deepEqual(app.getRules().map(rule => rule.id), [105, 100]);
  assert.equal((await app.send({type: 'setSupporting', enabled: 'false', revision: state.revision})).ok, false);
  assert.equal((await app.send({type: 'save', domains: 'other.test', revision: oldRevision})).ok, false);
  assert.deepEqual([...(await app.send({type: 'read'})).domains], ['youtube.com']);
  state = await app.send({type: 'setMode', mode: 'block', revision: state.revision});
  assert.equal(state.mode, 'block');
  assert.deepEqual([...state.domains], []);
  assert.deepEqual(app.getRules().map(rule => rule.id), [105, 104]);
  assert.equal((await app.send({type: 'setSupporting', enabled: true, revision: state.revision})).ok, false);
  state = await app.send({type: 'save', domains: 'bad.test', revision: state.revision});
  state = await app.send({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.deepEqual([...state.domains], ['youtube.com']);
  assert.equal(state.supportingResources, false);
  assert.deepEqual(app.getRules().map(rule => rule.id), [105, 100]);
  state = await app.send({type: 'setMode', mode: 'block', revision: state.revision});
  assert.deepEqual([...state.domains], ['bad.test']);
  app.setFail(true);
  assert.equal((await app.send({type: 'save', domains: 'other.test', revision: state.revision})).ok, false);
  assert.deepEqual([...(await app.send({type: 'read'})).domains], ['bad.test']);
  assert.equal((await app.send({type: 'save', domains: 'com', revision: state.revision})).ok, false);
  const expiry = (await app.send({type: 'status'})).expiresAt;
  assert.equal((await app.send({type: 'changePassword', currentPassword: 'wrong password', newPassword: 'replacement passphrase'})).ok, false);
  assert.equal((await app.send({type: 'status'})).expiresAt, expiry);
  const changed = await app.send({type: 'changePassword', currentPassword: 'parent passphrase', newPassword: 'replacement passphrase'});
  assert.ok(changed.expiresAt > 0);
  await app.send({type: 'lock'});
  assert.equal((await app.send({type: 'read'})).ok, false);
  assert.equal(app.chrome.runtime.id, 'unit-test');
});

test('legacy mixed rules require a choice and keep both previous lists available', async () => {
  const legacy = [
    {id: 100, priority: 3, action: {type: 'allow'}, condition: {requestDomains: ['example.com']}},
    {id: 102, priority: 4, action: {type: 'redirect'}, condition: {requestDomains: ['kids.example.com']}}
  ];
  const app = await worker(legacy);
  await app.send({type: 'setup', password: 'parent passphrase'});
  let state = await app.send({type: 'read'});
  assert.equal(state.mode, 'legacy');
  assert.equal((await app.send({type: 'save', domains: 'other.test', revision: state.revision})).ok, false);
  state = await app.send({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.deepEqual([...state.domains], ['example.com']);
  assert.deepEqual([...state.exceptions], ['kids.example.com']);
  assert.match(state.migrationNotice, /kids.example.com/);
  state = await app.send({type: 'setMode', mode: 'block', revision: state.revision});
  assert.deepEqual([...state.domains], ['kids.example.com']);
  state = await app.send({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.deepEqual([...state.domains], ['example.com']);
  assert.deepEqual([...state.exceptions], ['kids.example.com']);
  assert.deepEqual(app.getRules().map(rule => rule.id), [105, 100, 101, 106]);
  assert.equal((await app.send({type: 'save', domains: 'example.com', exceptions: 'other.test', revision: state.revision})).ok, false);
  state = await app.send({type: 'save', domains: 'example.com', exceptions: '', revision: state.revision});
  assert.deepEqual([...state.exceptions], []);
  state = await app.send({type: 'save', domains: 'example.com', exceptions: 'kids.example.com', revision: state.revision});
  assert.deepEqual([...state.exceptions], ['kids.example.com']);
  assert.deepEqual(app.local.savedModeLists.legacyAllowedBackup, ['example.com']);
});

test('repeated wrong current passwords lock every settings tab', async () => {
  const app = await worker();
  await app.send({type: 'setup', password: 'parent passphrase'});
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await app.send({type: 'changePassword', currentPassword: 'wrong password', newPassword: 'replacement passphrase'})).ok, false);
  const status = await app.send({type: 'status'});
  assert.equal(status.unlocked, false);
  assert.ok(status.retryAfterMs > 0);
  assert.ok(app.local.authFailures.lockedUntil > Date.now());
});

test('worker only accepts options-page messages and migrates old allow rules', async () => {
  const app = await worker([{id: 100, priority: 3, action: {type: 'allow'}, condition: {requestDomains: ['youtube.com'], excludedResourceTypes: []}}]);
  const listener = app.chrome.runtime.onMessage;
  assert.ok(listener);
  await app.installedListener({reason: 'update'});
  assert.deepEqual(app.getRules().map(rule => rule.id), [105, 100, 101]);
  await app.send({type: 'setup', password: 'parent passphrase'});
  await app.actionListener({url: 'https://www.youtube.com/watch?v=sample'});
  assert.equal((await app.send({type: 'read'})).currentSite, 'www.youtube.com');
  assert.equal((await app.send({type: 'read'})).currentSite, '');
});

test('parent settings receive the one-time denied address only when it matches the blocked host', async () => {
  const app = await worker();
  await app.send({type: 'setup', password: 'parent passphrase'});
  app.session.pendingSite = {host: 'www.example.net', requestedUrl: 'https://www.example.net/guardrail?value=sample&t=2', tabId: 42, capturedAt: Date.now()};
  const first = await app.send({type: 'read'});
  assert.equal(first.currentSite, 'www.example.net');
  assert.equal(first.requestedUrl, 'https://www.example.net/guardrail?value=sample&t=2');
  assert.equal(first.requestedTabId, 42);
  assert.equal((await app.send({type: 'read'})).requestedUrl, '');
  app.session.pendingSite = {host: 'www.example.net', requestedUrl: 'https://other.test/', tabId: 42, capturedAt: Date.now()};
  assert.equal((await app.send({type: 'read'})).requestedUrl, '');
});

test('installation adds hostname redirects and update keeps mixed legacy lists', async () => {
  const fresh = await worker();
  await fresh.installedListener({reason: 'install'});
  assert.deepEqual(fresh.getRules().map(rule => rule.id), [105]);

  const legacy = await worker([
    {id: 100, condition: {requestDomains: ['example.com']}},
    {id: 102, condition: {requestDomains: ['kids.example.com']}}
  ]);
  await legacy.installedListener({reason: 'update'});
  assert.deepEqual(legacy.getRules().map(rule => rule.id), [105, 100, 101, 102, 103]);
  await legacy.send({type: 'setup', password: 'parent passphrase'});
  const state = await legacy.send({type: 'read'});
  assert.equal(state.mode, 'legacy');
  assert.deepEqual([...state.legacyAllowed], ['example.com']);
  assert.deepEqual([...state.legacyBlocked], ['kids.example.com']);

  const existing = await worker(buildRules(['example.com'], 'allow', BLOCKED_PAGE, ['kids.example.com']));
  await existing.installedListener({reason: 'update'});
  assert.deepEqual(existing.getRules().find(rule => rule.id === 100).condition.excludedRequestDomains, ['kids.example.com']);

  const strict = await worker(buildRules(['youtube.com'], 'allow', BLOCKED_PAGE, [], false));
  strict.local.allowSupportingResources = false;
  await strict.installedListener({reason: 'update'});
  assert.deepEqual(strict.getRules().map(rule => rule.id), [105, 100]);
});
