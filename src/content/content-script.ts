/**
 * SubZero Content Script
 *
 * Injected into YouTube's /feed/channels page.
 * Extracts ytInitialData and communicates with the service worker.
 */

console.log('[SubZero] Content script loaded.');

// Inject a script into the Main World to access window.ytInitialData
function injectMainWorldScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/injected.ts');
  script.type = 'module';
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

// Listen for messages from the injected script (via window.postMessage)
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  if (event.data?.type === 'SUBZERO_YT_INITIAL_DATA') {
    console.log('[SubZero] Received ytInitialData from injected script.');
    // Forward to service worker
    chrome.runtime.sendMessage({
      type: 'SUBSCRIPTIONS_EXTRACTED',
      payload: event.data.payload,
    });
  }
});

// Inject a floating "Launch SubZero" button
function injectLaunchButton() {
  if (document.getElementById('subzero-launch-button')) return;

  const button = document.createElement('button');
  button.id = 'subzero-launch-button';
  button.textContent = '🧊 SubZero';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 24px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  button.onmouseover = () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
  };
  button.onmouseout = () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  };
  button.onclick = () => {
    // Open the dashboard in a new tab
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  };

  document.body.appendChild(button);
}

// Initialize
injectMainWorldScript();
injectLaunchButton();
