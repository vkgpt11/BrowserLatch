import {parseDomains, buildRules} from './policy.mjs';

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onInstalled.addListener(({reason}) => {
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

// Dynamic rules are the single source of truth and persist across browser restarts.
// Serialize saves; a failed atomic rule update leaves the previous list intact.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('options.html')) return;
  if (!['read', 'save'].includes(message?.type)) return;
  const job = queue.then(async () => {
    if (message.type === 'save') {
      const domains = parseDomains(message.text);
      const current = await chrome.declarativeNetRequest.getDynamicRules();
      await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds: current.map(rule => rule.id), addRules: buildRules(domains)});
    }
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return {ok: true, domains: rules.find(rule => rule.id === 100)?.condition.requestDomains ?? []};
  });
  queue = job.catch(() => {});
  job.then(respond, error => respond({ok: false, error: error.message}));
  return true;
});
