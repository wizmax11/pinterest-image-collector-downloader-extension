(function() {
  'use strict';
  
  let isActive = false;
  let collected = [];
  let observer = null;

  function init() {
    chrome.storage.local.get(['isActive', 'collected'], (result) => {
      isActive = result.isActive || false;
      collected = result.collected || [];
      
      if (isActive) {
        console.log('Pinterest Collector: Active');
        startObserving();
      }
    });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
      isActive = request.isActive;
      
      if (isActive) {
        console.log('Pinterest Collector: Turned ON');
        startObserving();
      } else {
        console.log('Pinterest Collector: Turned OFF');
        stopObserving();
        removeAllButtons();
      }
      
      sendResponse({ success: true });
    } else if (request.action === 'clearUI') {
      collected = [];
      updateAllButtons();
      sendResponse({ success: true });
    }
    return true;
  });

  function startObserving() {
    if (observer) return;
    
    addButtonsToPins();
    
    observer = new MutationObserver((mutations) => {
      addButtonsToPins();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  }

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function addButtonsToPins() {
    const pins = document.querySelectorAll('[data-test-id="pin"], [data-test-id="pinWrapper"]');
    
    pins.forEach(pin => {
      if (pin.querySelector('.pc-collector-btn')) return;
      
      const img = pin.querySelector('img[src*="pinimg"]');
      if (!img || !img.src) return;
      
      // Skip if it's not a valid image
      if (img.src.includes('.xml') || img.src.includes('data:')) return;
      
      const btn = document.createElement('div');
      btn.className = 'pc-collector-btn';
      
      const iconImg = document.createElement('img');
      iconImg.src = chrome.runtime.getURL('icon.png');
      iconImg.style.cssText = 'width: 20px; height: 20px; pointer-events: none;';
      
      btn.appendChild(iconImg);
      
      let imgUrl = img.src;
      
      // Handle GIFs specially - look for the actual GIF URL
      if (pin.querySelector('video') || imgUrl.includes('_PA')) {
        // This is likely an animated pin, try to find GIF source
        const video = pin.querySelector('video source');
        if (video && video.src && video.src.includes('.mp4')) {
          // Pinterest converts GIFs to MP4, we'll keep the image preview
          imgUrl = imgUrl.replace('/236x/', '/originals/').replace('/474x/', '/originals/').replace('/736x/', '/originals/');
        }
      } else {
        // Regular images - get originals
        if (imgUrl.includes('/236x/')) {
          imgUrl = imgUrl.replace('/236x/', '/originals/');
        } else if (imgUrl.includes('/474x/')) {
          imgUrl = imgUrl.replace('/474x/', '/originals/');
        } else if (imgUrl.includes('/736x/')) {
          imgUrl = imgUrl.replace('/736x/', '/originals/');
        }
      }
      
      // Final validation - make sure URL ends with image extension
      if (!imgUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // Try to extract the image format from URL
        const formatMatch = imgUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
        if (formatMatch) {
          const ext = formatMatch[0];
          const baseUrl = imgUrl.split(ext)[0] + ext;
          imgUrl = baseUrl;
        } else {
          // If still no valid extension, skip this pin
          return;
        }
      }
      
      btn.dataset.imgUrl = imgUrl;
      
      if (collected.includes(imgUrl)) {
        btn.classList.add('pc-collected');
      }
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const url = btn.dataset.imgUrl;
        
        if (collected.includes(url)) {
          collected = collected.filter(u => u !== url);
          btn.classList.remove('pc-collected');
        } else {
          collected.push(url);
          btn.classList.add('pc-collected');
        }
        
        chrome.storage.local.set({ collected });
      }, true);
      
      const container = pin.querySelector('[data-test-id="pin"]') || pin;
      container.style.position = 'relative';
      container.appendChild(btn);
    });
  }

  function updateAllButtons() {
    document.querySelectorAll('.pc-collector-btn').forEach(btn => {
      const url = btn.dataset.imgUrl;
      if (collected.includes(url)) {
        btn.classList.add('pc-collected');
      } else {
        btn.classList.remove('pc-collected');
      }
    });
  }

  function removeAllButtons() {
    document.querySelectorAll('.pc-collector-btn').forEach(btn => btn.remove());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();