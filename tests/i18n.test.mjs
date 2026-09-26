import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const script = await readFile(new URL('../i18n.js', import.meta.url), 'utf8');
const options = await readFile(new URL('../options.html', import.meta.url), 'utf8');
const blocked = await readFile(new URL('../blocked.html', import.meta.url), 'utf8');
const blockedScript = await readFile(new URL('../blocked.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function page(html, stored = {}) {
  const dom = new JSDOM(html, {url: 'chrome-extension://unit-test/blocked.html?site=www.youtube.com', runScripts: 'outside-only'});
  const changes = [];
  dom.window.chrome = {
    storage: {local: {get: async () => stored, set: async value => {Object.assign(stored, value); changes.push(value);}},
      onChanged: {addListener() {}}, session: {set: async () => {}}},
    declarativeNetRequest: {getDynamicRules: async () => []},
    runtime: {openOptionsPage: async () => {}}
  };
  dom.window.eval(script);
  return {dom, changes};
}

test('ten languages translate both screens, preserve domains, and switch without reloading', async () => {
  const {dom, changes} = page(options);
  const {document, Event} = dom.window;
  await settle();
  assert.equal(document.querySelector('#language').options.length, 10);
  const language = document.querySelector('#language');
  language.value = 'hi';
  language.dispatchEvent(new Event('change', {bubbles: true}));
  await settle();
  assert.equal(document.querySelector('h1').textContent, 'वेबसाइट की पहुँच');
  assert.equal(document.querySelector('#new-domain').getAttribute('placeholder'), 'youtube.com');
  assert.equal(changes.at(-1).uiLanguage, 'hi');
  language.value = 'ar';
  language.dispatchEvent(new Event('change', {bubbles: true}));
  await settle();
  assert.equal(document.documentElement.dir, 'rtl');
  assert.equal(document.querySelector('h1').textContent, 'الوصول إلى المواقع');
  assert.match(dom.window.BrowseLatchI18n.translated('Block websites on this list? All other websites will be allowed.'), /سيُسمح/);
  assert.match(dom.window.BrowseLatchI18n.translated('Not saved: Invalid domain: bad/site'), /نطاق غير صالح/);
  assert.doesNotMatch(dom.window.BrowseLatchI18n.translated('Extra content is allowed. Reload any open website tabs to see the change.'), /Extra content is allowed/);
  language.value = 'en';
  language.dispatchEvent(new Event('change', {bubbles: true}));
  await settle();
  assert.equal(document.querySelector('h1').textContent, 'Website access');
  assert.equal(document.documentElement.dir, 'ltr');
  dom.window.close();

  const view = page(blocked, {uiLanguage: 'es'});
  view.dom.window.eval(blockedScript);
  await settle();
  assert.equal(view.dom.window.document.querySelector('h1').textContent, 'Este sitio está bloqueado');
  assert.equal(view.dom.window.document.querySelector('#denied-domain').textContent, 'www.youtube.com');
  assert.equal(view.dom.window.document.querySelector('#block-reason').textContent, 'Este sitio no está en tu lista de sitios permitidos.');
  view.dom.window.close();
});

test('all static settings and blocked-page copy is translated in every added language', async () => {
  for (const html of [options, blocked]) {
    const {dom} = page(html);
    const walker = dom.window.document.createTreeWalker(dom.window.document.body, dom.window.NodeFilter.SHOW_TEXT);
    const original = [];
    while (walker.nextNode()) original.push([walker.currentNode, walker.currentNode.nodeValue]);
    for (const language of Object.keys(dom.window.BrowseLatchI18n.languages).filter(code => code !== 'en')) {
      dom.window.BrowseLatchI18n.setLanguage(language);
      await settle();
      const missing = original.filter(([node, source]) => source.trim() && source.trim() !== 'BROWSELATCH' && !node.parentElement?.closest('#language') && node.nodeValue === source).map(([, source]) => source.trim());
      assert.deepEqual(missing, [], `${language} has untranslated text`);
    }
    dom.window.close();
  }
});
