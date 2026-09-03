const ALLOWED_HOSTS = [
  'translate.googleapis.com',
  'clients5.google.com',
  'translate.google.com',
  'api.mymemory.translated.net',
];

function isAllowed(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return ALLOWED_HOSTS.indexOf(parsed.hostname) !== -1;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'WDT_FETCH') return false;

  if (!isAllowed(message.url)) {
    sendResponse({ status: 0, text: '', failure: 'blocked' });
    return true;
  }

  const timeout = typeof message.timeout === 'number' ? message.timeout : 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const init = {
    method: message.method || 'GET',
    headers: message.headers || {},
    credentials: 'omit',
    signal: controller.signal,
  };
  if (init.method !== 'GET' && init.method !== 'HEAD' && message.data) {
    init.body = message.data;
  }

  fetch(message.url, init)
    .then((res) => res.text().then((text) => ({ status: res.status, text: text })))
    .then((payload) => {
      clearTimeout(timer);
      sendResponse(payload);
    })
    .catch((err) => {
      clearTimeout(timer);
      const aborted = err && err.name === 'AbortError';
      sendResponse({ status: 0, text: '', failure: aborted ? 'timeout' : 'network' });
    });

  return true;
});
