const $ = selector => document.querySelector(selector);
const authCard = $('#auth-card');
const setupPanel = $('#setup-panel');
const unlockPanel = $('#unlock-panel');
const settings = $('#settings');
const authStatus = $('#auth-status');
const field = $('#domains');

async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Could not reach the extension.');
  return result;
}

function showLocked(configured, message = '') {
  settings.hidden = true; authCard.hidden = false;
  setupPanel.hidden = configured; unlockPanel.hidden = !configured;
  authStatus.textContent = message || (configured ? 'Settings are locked.' : 'Create a password before configuring websites.');
  (configured ? $('#password') : $('#new-password')).focus();
}

async function showSettings() {
  const result = await request({type: 'read'});
  field.value = result.domains.join('\n');
  $('#count').textContent = `${result.domains.length} allowed domains`;
  authCard.hidden = true; settings.hidden = false; $('#status').textContent = 'Protection is active.';
}

request({type: 'status'}).then(result => result.unlocked ? showSettings() : showLocked(result.configured)).catch(error => showLocked(true, error.message));

$('#setup-form').addEventListener('submit', async event => {
  event.preventDefault();
  if ($('#new-password').value !== $('#confirm-password').value) { authStatus.textContent = 'Passwords do not match.'; return; }
  try { await request({type: 'setup', password: $('#new-password').value}); event.target.reset(); await showSettings(); }
  catch (error) { authStatus.textContent = error.message; }
});

$('#unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await request({type: 'unlock', password: $('#password').value}); event.target.reset(); await showSettings(); }
  catch (error) { authStatus.textContent = error.message; }
});

$('#form').addEventListener('submit', async event => {
  event.preventDefault();
  try { const result = await request({type: 'save', text: field.value}); field.value = result.domains.join('\n'); $('#count').textContent = `${result.domains.length} allowed domains`; $('#status').textContent = 'Saved. Reload open websites to apply changes.'; }
  catch (error) { if (/locked/i.test(error.message)) showLocked(true, error.message); else $('#status').textContent = `Not saved: ${error.message}`; }
});

$('#lock').addEventListener('click', async () => { await request({type: 'lock'}); showLocked(true); });

$('#change-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await request({type: 'changePassword', currentPassword: $('#current-password').value, newPassword: $('#replacement-password').value}); event.target.reset(); $('#change-status').textContent = 'Password changed.'; }
  catch (error) { $('#change-status').textContent = error.message; }
});
