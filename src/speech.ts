export async function speakLocal(text: string, lang: string = 'ar-EG'): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.95;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang?.toLowerCase().startsWith('ar'));
    if (ar) utter.voice = ar;
    utter.onend = () => resolve();
    window.speechSynthesis.speak(utter);
    // Fallback resolve after 8s
    setTimeout(() => resolve(), Math.max(8000, text.length * 140));
  });
}

export function listenOnceLocal(timeoutMs = 8000, lang: string = 'ar-EG'): Promise<string> {
  return new Promise((resolve) => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      resolve('');
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let settled = false;
    const done = (txt: string) => {
      if (settled) return;
      settled = true;
      try { rec.stop(); } catch {}
      resolve(txt);
    };
    const to = window.setTimeout(() => done(''), timeoutMs);
    rec.onresult = (e: any) => {
      const txt = e?.results?.[0]?.[0]?.transcript || '';
      window.clearTimeout(to);
      done(String(txt || '').trim());
    };
    rec.onerror = () => { window.clearTimeout(to); done(''); };
    rec.onend = () => { window.clearTimeout(to); done(''); };
    try { rec.start(); } catch { done(''); }
  });
}


