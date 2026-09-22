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
}
document.querySelector('#manage').addEventListener('click', async () => {
  if (host) await chrome.storage.session.set({pendingSite: {host, capturedAt: Date.now()}});
  await chrome.runtime.openOptionsPage();
});
