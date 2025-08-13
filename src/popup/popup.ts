const pingBtn = document.getElementById('ping')! as HTMLButtonElement;
const out = document.getElementById('out')! as HTMLPreElement;

pingBtn.addEventListener('click', async () => {
  const res = await chrome.runtime.sendMessage({ type: 'PING' });
  out.textContent = JSON.stringify(res, null, 2);
});
