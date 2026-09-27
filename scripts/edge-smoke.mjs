// Run against an isolated unpacked Edge profile with --remote-debugging-port=9235.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const port = Number(process.env.EDGE_DEBUG_PORT || 9235);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const options = targets.find(target => target.type === 'page' && target.url.endsWith('/options.html'));
assert.ok(options, 'BrowseLatch options page is not open');
const socket = new WebSocket(options.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true});});
let serial = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const response = JSON.parse(event.data);
  if (!response.id || !pending.has(response.id)) return;
  const {resolve, reject} = pending.get(response.id);
  pending.delete(response.id);
  response.error ? reject(new Error(response.error.message)) : resolve(response.result);
});
function call(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => { pending.set(id, {resolve, reject}); socket.send(JSON.stringify({id, method, params})); });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function message(value) {return evaluate(`chrome.runtime.sendMessage(${JSON.stringify(value)})`);}
async function outcome(url, type = 'main_frame', initiator, tabId) {
  return evaluate(`chrome.declarativeNetRequest.testMatchOutcome(${JSON.stringify({url, type, ...(initiator ? {initiator} : {}), ...(tabId === undefined ? {} : {tabId})})})`);
}
try {
  let status;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { status = await message({type: 'status'}); if (status?.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(status?.ok, 'BrowseLatch options page did not become ready');
  if (!status.configured) assert.equal((await message({type: 'setup', password: 'edge smoke password'})).ok, true);
  else if (!status.unlocked) assert.equal((await message({type: 'unlock', password: 'edge smoke password'})).ok, true);
  let state = await message({type: 'read'});
  if (state.mode === 'block') state = await message({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.equal(state.mode, 'allow');
  assert.equal((await message({type: 'save', domains: 'co.nz', revision: state.revision})).ok, false);
  state = await message({type: 'save', domains: 'youtube.com', revision: state.revision});
  assert.equal(state.ok, true, JSON.stringify(state));
  const allowYouTube = await outcome('https://youtube.com/');
  const blockOther = await outcome('https://wikipedia.org/');
  assert.equal(allowYouTube.matchedRules[0]?.ruleId, 100, JSON.stringify(allowYouTube));
  assert.equal(blockOther.matchedRules[0]?.ruleId, 105, JSON.stringify(blockOther));
  state = await message({type: 'setMode', mode: 'block', revision: state.revision});
  assert.equal(state.ok, true, JSON.stringify(state));
  const allowOther = await outcome('https://wikipedia.org/');
  assert.equal(allowOther.matchedRules[0]?.ruleId, 104, JSON.stringify(allowOther));
  state = await message({type: 'save', domains: 'blocked.test', revision: state.revision});
  assert.equal(state.ok, true, JSON.stringify(state));
  const blockTestSite = await outcome('https://blocked.test/');
  assert.equal(blockTestSite.matchedRules[0]?.ruleId, 102, JSON.stringify(blockTestSite));
  await call('Page.reload');
  await new Promise(resolve => setTimeout(resolve, 500));
  const blockedRequestedUrl = 'https://blocked.test/watch?v=2';
  const deniedTab = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(blockedRequestedUrl)}`, {method: 'PUT'})).json();
  let deniedUrl = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    deniedUrl = pages.find(page => page.id === deniedTab.id)?.url ?? '';
    if (deniedUrl.includes('/blocked.html')) break;
  }
  assert.match(deniedUrl, /^chrome-extension:\/\/[^/]+\/blocked\.html\?site=blocked\.test/);
  await new Promise(resolve => setTimeout(resolve, 500));
  const deniedTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(page => page.id === deniedTab.id);
  const deniedSocket = new WebSocket(deniedTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {deniedSocket.addEventListener('open', resolve, {once: true}); deniedSocket.addEventListener('error', reject, {once: true});});
  const deniedClick = new Promise((resolve, reject) => deniedSocket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    if (response.id !== 1) return;
    response.error ? reject(new Error(response.error.message)) : resolve(response.result);
  }));
  deniedSocket.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: "document.querySelector('#manage').click()", returnByValue: true}}));
  const deniedClickResult = await deniedClick;
  assert.equal(deniedClickResult.exceptionDetails, undefined, JSON.stringify(deniedClickResult.exceptionDetails));
  deniedSocket.close();
  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (await evaluate("document.querySelector('#current-site-domain').textContent") === 'blocked.test') break;
  }
  assert.equal(await evaluate("document.querySelector('#current-site-action').textContent"), 'Allow and open website');
  await evaluate("window.confirm = () => true; document.querySelector('#current-site-action').click()");
  let reopenedBlocked = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    reopenedBlocked = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(page => page.id === deniedTab.id)?.url ?? '';
    if (reopenedBlocked === blockedRequestedUrl) break;
  }
  assert.equal(reopenedBlocked, blockedRequestedUrl);
  state = await message({type: 'read'});
  assert.deepEqual(state.domains, []);
  await call('Page.reload');
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(await evaluate("document.querySelector('#list-title').textContent"), 'Blocked websites');
  assert.equal(await evaluate("document.querySelector('#settings').hidden"), false);
  state = await message({type: 'setMode', mode: 'allow', revision: state.revision});
  state = await message({type: 'save', domains: 'example.com', exceptions: 'kids.example.com', revision: state.revision});
  assert.equal(state.ok, true, JSON.stringify(state));
  assert.deepEqual(state.exceptions, ['kids.example.com']);
  assert.equal((await outcome('https://example.com/')).matchedRules[0]?.ruleId, 100);
  assert.equal((await outcome('https://www.example.com/')).matchedRules[0]?.ruleId, 100);
  assert.equal((await outcome('https://kids.example.com/')).matchedRules[0]?.ruleId, 105);
  assert.equal((await outcome('https://games.kids.example.com/')).matchedRules[0]?.ruleId, 105);
  assert.equal((await outcome('https://kids.example.com/logo.png', 'image', 'https://www.example.com')).matchedRules[0]?.ruleId, 106);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://www.example.com')).matchedRules[0]?.ruleId, 101);
  assert.equal((await outcome('https://signin.test/', 'sub_frame', 'https://www.example.com')).matchedRules[0]?.ruleId, 1);
  state = await message({type: 'setSupporting', domain: 'example.com', enabled: false, revision: state.revision});
  assert.deepEqual(state.strictContentSites, ['example.com']);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://www.example.com')).matchedRules[0]?.ruleId, 1);
  assert.equal((await outcome('https://www.example.com/logo.png', 'image', 'https://www.example.com')).matchedRules[0]?.ruleId, 100);
  state = await message({type: 'setMode', mode: 'block', revision: state.revision});
  state = await message({type: 'setMode', mode: 'allow', revision: state.revision});
  assert.deepEqual(state.strictContentSites, ['example.com']);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://www.example.com')).matchedRules[0]?.ruleId, 1);
  await call('Page.reload');
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(await evaluate("document.querySelector('#exceptions-panel').hidden"), false);
  assert.equal(await evaluate("document.querySelector('#exceptions').options[0].value"), 'kids.example.com');
  assert.equal(await evaluate("document.querySelector('#supporting-resources').checked"), false);
  if (process.env.EDGE_SCREENSHOT) {
    await evaluate("document.querySelector('#exceptions-panel').scrollIntoView()");
    const shot = await call('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
    await writeFile(process.env.EDGE_SCREENSHOT, Buffer.from(shot.data, 'base64'));
  }
  state = await message({type: 'save', domains: 'example.com\nsignin.test', exceptions: 'kids.example.com', revision: state.revision});
  assert.equal(state.ok, true, JSON.stringify(state));
  assert.equal((await outcome('https://signin.test/', 'sub_frame', 'https://www.example.com')).matchedRules[0]?.ruleId, 100);
  const requestedUrl = 'https://www.example.net/guardrail?value=sample&t=2';
  const returnTab = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(requestedUrl)}`, {method: 'PUT'})).json();
  let blockedTarget;
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    blockedTarget = pages.find(page => page.id === returnTab.id);
    if (blockedTarget?.url.includes('/blocked.html')) break;
  }
  assert.ok(blockedTarget?.url.includes('/blocked.html'), 'The requested page should be blocked');
  const blockedSocket = new WebSocket(blockedTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {blockedSocket.addEventListener('open', resolve, {once: true}); blockedSocket.addEventListener('error', reject, {once: true});});
  const clicked = new Promise((resolve, reject) => {
    blockedSocket.addEventListener('message', event => {
      const response = JSON.parse(event.data);
      if (response.id !== 1) return;
      response.error ? reject(new Error(response.error.message)) : resolve(response.result);
    });
  });
  blockedSocket.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: "document.querySelector('#manage').click()", returnByValue: true}}));
  await clicked;
  blockedSocket.close();
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (await evaluate("document.querySelector('#current-site-domain').textContent") === 'www.example.net') break;
  }
  assert.equal(await evaluate("document.querySelector('#current-site-domain').textContent"), 'www.example.net');
  await evaluate("document.querySelector('#current-site-action').click()");
  let returnedUrl = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    returnedUrl = pages.find(page => page.id === returnTab.id)?.url ?? '';
    if (returnedUrl === requestedUrl) break;
  }
  assert.equal(returnedUrl, requestedUrl, 'Allowing the site should reopen its exact page');
  state = await message({type: 'read'});
  state = await message({type: 'save', domains: 'example.com\nsignin.test\nyoutube.com\nwww.example.net', exceptions: 'kids.example.com', revision: state.revision});
  assert.deepEqual(state.strictContentSites, ['example.com']);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://www.youtube.com')).matchedRules[0]?.ruleId, 202);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://www.example.com')).matchedRules[0]?.ruleId, 1);
  const timed = await message({type: 'grantTemporary', domain: 'temp-only.test', kind: 'timed', revision: state.revision});
  assert.equal(timed.ok, true, JSON.stringify(timed));
  assert.equal((await outcome('https://temp-only.test/')).matchedRules[0]?.ruleId, 10000);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://temp-only.test')).matchedRules[0]?.ruleId, 10001);
  assert.equal((await message({type: 'revokeTemporary', slot: timed.temporaryGrants[0].slot, revision: state.revision})).ok, true);
  assert.equal((await outcome('https://temp-only.test/')).matchedRules[0]?.ruleId, 105);
  const visitTarget = await (await fetch(`http://127.0.0.1:${port}/json/new?https://visit-only.test/`, {method: 'PUT'})).json();
  let visitBlocked;
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    visitBlocked = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(page => page.id === visitTarget.id);
    if (visitBlocked?.url.includes('/blocked.html')) break;
  }
  assert.ok(visitBlocked?.url.includes('/blocked.html'));
  const visitSocket = new WebSocket(visitBlocked.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {visitSocket.addEventListener('open', resolve, {once: true}); visitSocket.addEventListener('error', reject, {once: true});});
  const visitId = new Promise((resolve, reject) => visitSocket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    if (response.id !== 1) return;
    response.error ? reject(new Error(response.error.message)) : resolve(response.result.result.value);
  }));
  visitSocket.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: 'chrome.tabs.getCurrent().then(tab => tab.id)', awaitPromise: true, returnByValue: true}}));
  const visitTabId = await visitId;
  visitSocket.close();
  const visitGrant = await message({type: 'grantTemporary', domain: 'visit-only.test', kind: 'visit', tabId: visitTabId, revision: state.revision});
  assert.equal(visitGrant.ok, true, JSON.stringify(visitGrant));
  assert.equal((await outcome('https://visit-only.test/', 'main_frame', undefined, visitTabId)).matchedRules[0]?.ruleId, 10000);
  assert.equal((await outcome('https://cdn.test/video', 'xmlhttprequest', 'https://visit-only.test', visitTabId)).matchedRules[0]?.ruleId, 10001);
  assert.equal((await outcome('https://visit-only.test/', 'main_frame', undefined, visitTabId + 1000)).matchedRules[0]?.ruleId, 105);
  await evaluate(`chrome.tabs.remove(${visitTabId})`);
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!(await message({type: 'getTemporary'})).temporaryGrants.length) break;
  }
  assert.deepEqual((await message({type: 'getTemporary'})).temporaryGrants, []);
  console.log('Edge DNR smoke checks passed: both list modes, denied hostname redirect, blocked child exception, per-site content, temporary access, and return after allowing.');
} finally {socket.close();}
