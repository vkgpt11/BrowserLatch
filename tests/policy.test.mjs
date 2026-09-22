import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {parseDomains, buildRules} from '../policy.mjs';
import {createPasswordRecord, verifyPassword, validatePassword} from '../auth.mjs';

globalThis.crypto ??= webcrypto;

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
  for (const input of ['com', 'co.uk', 'github.io', 'https://example.com/path', '*.com', 'example.com:443', 'user@example.com', 'example.com?q=x', 'example.com.', '-bad.com', 'a..com', 'example.com\\evil', 'two words']) {
    assert.throws(() => parseDomains(input), undefined, input);
  }
  assert.throws(() => parseDomains(Array.from({length: 501}, (_, n) => `a${n}.test`).join('\n')));
});

test('allowlist mode only exempts listed page navigations and their supporting resources', async () => {
  assert.deepEqual(buildRules([]), []);
  const [allow, supporting] = buildRules(['youtube.com'], 'allow');
  assert.deepEqual(allow.condition.requestDomains, ['youtube.com']);
  assert.ok(allow.condition.resourceTypes.includes('main_frame'));
  assert.deepEqual(supporting.condition.initiatorDomains, ['youtube.com']);
  assert.equal(supporting.condition.resourceTypes.includes('main_frame'), false);
  assert.equal(supporting.condition.resourceTypes.includes('sub_frame'), false);
  const baseline = JSON.parse(await readFile(new URL('../rules.json', import.meta.url)));
  assert.ok(baseline.every(rule => rule.priority < allow.priority));
});

test('blocklist mode exempts unlisted requests and blocks listed destinations', () => {
  const rules = buildRules(['example.com'], 'block');
  assert.deepEqual(rules.map(rule => rule.id), [104, 102, 103]);
  assert.ok(rules[0].condition.resourceTypes.includes('main_frame'));
  assert.equal(rules[0].condition.requestDomains, undefined);
  assert.ok(rules[1].priority > rules[0].priority);
  assert.deepEqual(rules[1].condition.requestDomains, ['example.com']);
  assert.equal(rules[1].action.redirect.extensionPath, '/blocked.html');
  assert.equal(rules[2].action.type, 'block');
  assert.deepEqual(buildRules([], 'block').map(rule => rule.id), [104]);
  assert.throws(() => buildRules([], 'invalid'));
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
  return {send, chrome, local, actionListener, installedListener, setFail(value) {fail = value;}, getRules() {return persisted;}};
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
  assert.equal((await app.send({type: 'save', domains: 'other.test', revision: oldRevision})).ok, false);
  assert.deepEqual([...(await app.send({type: 'read'})).domains], ['youtube.com']);
  state = await app.send({type: 'setMode', mode: 'block', revision: state.revision});
  assert.equal(state.mode, 'block');
  assert.deepEqual([...state.domains], []);
  assert.deepEqual(app.getRules().map(rule => rule.id), [104]);
  state = await app.send({type: 'save', domains: 'bad.test', revision: state.revision});
  state = await app.send({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.deepEqual([...state.domains], ['youtube.com']);
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
  assert.deepEqual([...state.domains], []);
  assert.match(state.migrationNotice, /example.com/);
  state = await app.send({type: 'setMode', mode: 'block', revision: state.revision});
  assert.deepEqual([...state.domains], ['kids.example.com']);
  state = await app.send({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.deepEqual([...state.domains], []);
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
  assert.deepEqual(app.getRules().map(rule => rule.id), [100, 101]);
  await app.send({type: 'setup', password: 'parent passphrase'});
  await app.actionListener({url: 'https://www.youtube.com/watch?v=sample'});
  assert.equal((await app.send({type: 'read'})).currentSite, 'www.youtube.com');
  assert.equal((await app.send({type: 'read'})).currentSite, '');
});
