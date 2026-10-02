// Essential Eats Web Clipper Content Bridge
// Connects the Chrome Extension to the Essential Eats Web Application

document.documentElement.dataset.clipperInstalled = "true";

// Listen for direct messages from the extension popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'CLIP_RECIPE') {
      window.postMessage({
        type: 'ESSENTIAL_EATS_SAVE_RECIPE',
        recipe: message.recipe
      }, '*');
      sendResponse({ success: true });
    }
    return true;
  });

  // Check for any pending recipes queued in extension storage
  chrome.storage.local.get(['pendingClippedRecipes'], (result) => {
    const list = result.pendingClippedRecipes || [];
    if (Array.isArray(list) && list.length > 0) {
      setTimeout(() => {
        list.forEach(recipe => {
          window.postMessage({
            type: 'ESSENTIAL_EATS_SAVE_RECIPE',
            recipe
          }, '*');
        });
        chrome.storage.local.remove(['pendingClippedRecipes']);
      }, 500);
    }
  });
}
