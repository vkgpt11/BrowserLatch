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
async function outcome(url, type = 'main_frame', initiator) {
  return evaluate(`chrome.declarativeNetRequest.testMatchOutcome(${JSON.stringify({url, type, ...(initiator ? {initiator} : {})})})`);
}
try {
  const status = await message({type: 'status'});
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
  state = await message({type: 'save', domains: 'youtube.com', revision: state.revision});
  assert.equal(state.ok, true, JSON.stringify(state));
  const blockYouTube = await outcome('https://youtube.com/');
  assert.equal(blockYouTube.matchedRules[0]?.ruleId, 102, JSON.stringify(blockYouTube));
  const deniedTab = await (await fetch(`http://127.0.0.1:${port}/json/new?https://youtube.com/`, {method: 'PUT'})).json();
  let deniedUrl = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    deniedUrl = pages.find(page => page.id === deniedTab.id)?.url ?? '';
    if (deniedUrl.includes('/blocked.html')) break;
  }
  assert.match(deniedUrl, /^chrome-extension:\/\/[^/]+\/blocked\.html\?site=youtube\.com$/);
  await call('Page.reload');
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(await evaluate("document.querySelector('#list-title').textContent"), 'Blocked websites');
  assert.equal(await evaluate("document.querySelector('#settings').hidden"), false);
  if (process.env.EDGE_SCREENSHOT) {
    const shot = await call('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true});
    await writeFile(process.env.EDGE_SCREENSHOT, Buffer.from(shot.data, 'base64'));
  }
  console.log('Edge DNR smoke checks passed: both list modes and denied hostname redirect.');
} finally {socket.close();}
