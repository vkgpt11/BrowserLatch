const field = document.querySelector('#domains');
const save = document.querySelector('#save');
const status = document.querySelector('#status');
async function request(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Could not reach the extension.');
  field.value = result.domains.join('\n');
  document.querySelector('#count').textContent = `${result.domains.length} allowed domains`;
}
request({type: 'read'}).then(() => {
  field.disabled = save.disabled = false;
  status.textContent = 'Protection is active.';
}).catch(error => { status.textContent = error.message; });
document.querySelector('#form').addEventListener('submit', async event => {
  event.preventDefault();
  field.disabled = save.disabled = true;
  try {
    await request({type: 'save', text: field.value});
    status.textContent = 'Saved. Reload open websites to apply the new list to existing pages.';
  } catch (error) { status.textContent = `Not saved: ${error.message}`; }
  finally { field.disabled = save.disabled = false; }
});
