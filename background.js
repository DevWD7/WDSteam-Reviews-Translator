const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'WDT_TRANSLATE') return false;

  const text = typeof message.text === 'string' ? message.text : '';
  const targetLang = message.targetLang || 'en';

  if (!text.trim()) {
    sendResponse({ ok: false, error: 'empty' });
    return true;
  }

  const url =
    TRANSLATE_ENDPOINT +
    '?client=gtx&sl=auto&dt=t&ie=UTF-8&oe=UTF-8&tl=' +
    encodeURIComponent(targetLang);

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'q=' + encodeURIComponent(text),
  })
    .then((res) => {
      if (!res.ok) throw new Error('bad status ' + res.status);
      return res.json();
    })
    .then((data) => {
      const rows = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : null;
      if (!rows) throw new Error('bad payload');
      const translated = rows
        .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''))
        .join('');
      if (!translated.trim()) throw new Error('empty result');
      sendResponse({ ok: true, text: translated });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: String(err) });
    });

  return true;
});
