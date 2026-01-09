let isActive = false;
let collected = [];

async function updateUI() {
  const result = await chrome.storage.local.get(['isActive', 'collected']);
  isActive = result.isActive || false;
  collected = result.collected || [];
  
  document.getElementById('count').textContent = collected.length;
  
  const toggleBtn = document.getElementById('toggle');
  const downloadBtn = document.getElementById('download');
  const info = document.getElementById('info');
  
  if (isActive) {
    toggleBtn.textContent = 'Turn Off Collector (ON)';
    toggleBtn.classList.add('active');
    info.textContent = 'Collector is ON! Click pins to collect them.';
  } else {
    toggleBtn.textContent = 'Turn On Collector (OFF)';
    toggleBtn.classList.remove('active');
    info.textContent = 'Visit Pinterest and turn on the collector!';
  }
  
  downloadBtn.disabled = collected.length === 0;
}

document.getElementById('toggle').addEventListener('click', async () => {
  isActive = !isActive;
  await chrome.storage.local.set({ isActive });
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle', isActive }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Please refresh the Pinterest page');
        }
      });
    }
  } catch (e) {
    console.log('Error:', e);
  }
  
  updateUI();
});

document.getElementById('download').addEventListener('click', async () => {
  if (collected.length === 0) return;
  
  document.getElementById('download').textContent = 'Downloading...';
  document.getElementById('download').disabled = true;
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < collected.length; i++) {
    const url = collected[i];
    
    // Validate URL before downloading
    if (!url || url.includes('.xml') || url.includes('data:')) {
      failCount++;
      continue;
    }
    
    // Extract proper extension
    let extension = 'jpg'; // default
    const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp)/i);
    if (extMatch) {
      extension = extMatch[1].toLowerCase();
      // Normalize jpeg to jpg
      if (extension === 'jpeg') extension = 'jpg';
    }
    
    try {
      await chrome.downloads.download({
        url: url,
        filename: `pinterest_${Date.now()}_${i + 1}.${extension}`,
        saveAs: false
      });
      
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) {
      console.error('Download error:', e);
      failCount++;
    }
  }
  
  document.getElementById('download').textContent = 'Download All Images';
  
  if (failCount > 0) {
    alert(`Downloaded ${successCount} images. ${failCount} failed (may be videos or invalid formats).`);
  }
  
  updateUI();
});

document.getElementById('clear').addEventListener('click', async () => {
  if (collected.length === 0) return;
  
  if (confirm(`Clear all ${collected.length} images from your bucket?`)) {
    await chrome.storage.local.set({ collected: [] });
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'clearUI' }, (response) => {
          if (chrome.runtime.lastError) {
            // Ignore error if content script not loaded
          }
        });
      }
    } catch (e) {
      console.log('Error:', e);
    }
    
    updateUI();
  }
});

updateUI();
setInterval(updateUI, 1000);