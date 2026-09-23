function blockedHost(value) {
  if (!value || /[\s/:@?#*\\]/u.test(value)) return '';
  try {
    const host = new URL(`https://${value}`).hostname.toLowerCase();
    return host === value.toLowerCase() && host.length <= 253 && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ? host : '';
  } catch { return ''; }
}

const host = blockedHost(new URL(location.href).searchParams.get('site'));
if (host) {
  document.querySelector('#denied-domain').textContent = host;
  document.querySelector('#denied-site').hidden = false;
  showReason();
}

async function showReason() {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    let reason;
    if (rules.some(rule => rule.id === 104)) reason = 'This site is on your blocked websites list.';
    else if (!rules.some(rule => rule.id === 102)) {
      const exceptions = rules.find(rule => rule.id === 100)?.condition.excludedRequestDomains ?? [];
      reason = exceptions.some(domain => host === domain || host.endsWith(`.${domain}`))
        ? 'This part of an allowed website is blocked.'
        : 'This site is not on your allowed websites list.';
    }
    if (reason) document.querySelector('#block-reason').textContent = reason;
  } catch {
    // Keep the generic explanation if current rules cannot be read.
  }
}

document.querySelector('#manage').addEventListener('click', async () => {
  if (host) await chrome.storage.session.set({pendingSite: {host, capturedAt: Date.now()}});
  await chrome.runtime.openOptionsPage();
});
