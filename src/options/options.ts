const input = document.getElementById('opt')! as HTMLInputElement;

input.addEventListener('input', async () => {
  await chrome.storage.local.set({ example: input.value });
});

(async () => {
  const { example } = await chrome.storage.local.get('example');
  if (typeof example === 'string') input.value = example;
})();
