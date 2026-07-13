const targetTexts = ['продолжить с паузами синхронизации', 'continue with sync pauses'];
let lastClick = 0;

const tryClick = () => {
    chrome.storage.local.get({ enabled: true }, (data) => {
        if (!data.enabled) return;

        const now = Date.now();
        if (now - lastClick < 250) return;

        const elements = document.querySelectorAll('button, a, [role="button"]');
        for (const el of elements) {
            const text = el.textContent?.toLowerCase().trim();
            if (text && targetTexts.some(t => text.includes(t))) {
                if (el.offsetWidth > 0 || el.offsetHeight > 0) {
                    console.log('[Optimizer] Найдена кнопка, кликаю...');
                    setTimeout(() => {
                        el.click();
                        lastClick = Date.now();
                    }, 0);
                    return;
                }
            }
        }
    });
};

const observer = new MutationObserver(() => tryClick());
observer.observe(document.body, { childList: true, subtree: true });