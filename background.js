chrome.runtime.onInstalled.addListener(() => {
  console.log('Pinterest Image Collector installed!');
  chrome.storage.local.set({ isActive: false, collected: [] });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.collected) {
    console.log('Collection updated:', changes.collected.newValue?.length || 0, 'images');
  }
});