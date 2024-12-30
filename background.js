chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchCss") {
	fetch(request.url)
	  .then(response => response.text())
	  .then(cssText => sendResponse({ cssText: cssText }))
	  .catch(error => sendResponse({ error: error.message }));	
    }

    return true;
});