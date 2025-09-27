import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
import type { RealtimeContextData } from '@openai/agents/realtime';
import z from 'zod';

export interface VoiceSdkState {
  isConnected: boolean;
  isMicEnabled: boolean;
  isSpeaking: boolean;
  message?: string;
  error?: string;
}

type Listener = (state: VoiceSdkState) => void;

/**
 * VoiceSdkClient: wraps OpenAI Agents Realtime SDK for browser usage.
 * - Fetches ephemeral key from backend `/api/ephemeral`
 * - Uses SDK to connect/disconnect
 * - Exposes mic enable/disable via SDK listening controls
 */
export class VoiceSdkClient {
  private session: RealtimeSession<any> | null = null;
  private state: VoiceSdkState = { isConnected: false, isMicEnabled: false, isSpeaking: false };
  private onChange?: Listener;
  private speakTimer: number | undefined;
  private pendingUserResolver: ((text: string) => void) | null = null;
  private uiHooks: {
    showLetter?: (letter: string) => void;
    showBoth?: (letter: string, capital: string, small: string) => void;
    showBlackboard?: (letter: string) => void;
    showWords?: (words: { word: string; arabic: string; image?: string }[]) => void;
    showSong?: (url?: string) => void;
    clearVisuals?: () => void;
    setLetter?: (letter: string) => void;
  } = {};

  onUpdate(listener: Listener) {
    this.onChange = listener;
  }

  private update(partial: Partial<VoiceSdkState>) {
    this.state = { ...this.state, ...partial };
    this.onChange?.(this.state);
  }

  getState(): VoiceSdkState {
    return { ...this.state };
  }

  setUiHooks(hooks: Partial<typeof this.uiHooks>) {
    this.uiHooks = { ...this.uiHooks, ...hooks };
  }

  async connect(selectedLetter?: string): Promise<void> {
    if (this.session) return;
    try {
      this.update({ error: undefined });

      const resp = await fetch('/api/ephemeral');
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Ephemeral key request failed: ${resp.status} ${text}`);
      }
      let json: any = null;
      try {
        json = await resp.json();
      } catch {
        throw new Error('Invalid JSON from /api/ephemeral. Is the server running?');
      }
      if (!json?.apiKey) throw new Error('Missing apiKey in /api/ephemeral response');

      // UI tools
      const UiShowLetterParams = z.object({ letter: z.string().min(1) });
      const UiShowBothParams = z.object({ letter: z.string().min(1), capital: z.string().min(1), small: z.string().min(1) });
      const UiShowBoardParams = z.object({ letter: z.string().min(1) });
      const UiShowWordsParams = z.object({ letter: z.string().min(1) });
      const UiShowSongParams = z.object({ letter: z.string().min(1) });
      const UiClearParams = z.object({});
      const UiSetLetterParams = z.object({ letter: z.string().min(1) });

      const UiShowLetter = tool<typeof UiShowLetterParams, RealtimeContextData>({
        name: 'ui_show_letter',
        description: 'Show a big letter on screen and hide other elements.',
        parameters: UiShowLetterParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.clearVisuals?.(); this.uiHooks.showLetter?.(letter); }
      });
      const UiShowBoth = tool<typeof UiShowBothParams, RealtimeContextData>({
        name: 'ui_show_both',
        description: 'Show capital and small letter view for the current letter.',
        parameters: UiShowBothParams,
        execute: async ({ letter, capital, small }: { letter: string; capital: string; small: string }) => { this.uiHooks.clearVisuals?.(); this.uiHooks.showBoth?.(letter, capital, small); }
      });
      const UiShowBoard = tool<typeof UiShowBoardParams, RealtimeContextData>({
        name: 'ui_show_blackboard',
        description: 'Show the blackboard with trace guide for the letter.',
        parameters: UiShowBoardParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.clearVisuals?.(); this.uiHooks.showBlackboard?.(letter); }
      });
      const UiShowWords = tool<typeof UiShowWordsParams, RealtimeContextData>({
        name: 'ui_show_words',
        description: 'Show example words for the letter.',
        parameters: UiShowWordsParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.clearVisuals?.(); (this.uiHooks as any).showWordsForLetter?.(letter); }
      });
      const UiShowSong = tool<typeof UiShowSongParams, RealtimeContextData>({
        name: 'ui_show_song',
        description: 'Show a song/video for the letter.',
        parameters: UiShowSongParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.clearVisuals?.(); (this.uiHooks as any).showSongForLetter?.(letter); }
      });
      const UiClear = tool<typeof UiClearParams, RealtimeContextData>({
        name: 'ui_clear',
        description: 'Clear all visuals.',
        parameters: UiClearParams,
        execute: async () => { this.uiHooks.clearVisuals?.(); }
      });
      const UiSetLetter = tool<typeof UiSetLetterParams, RealtimeContextData>({
        name: 'ui_set_letter',
        description: 'Set the current studied letter.',
        parameters: UiSetLetterParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.setLetter?.(letter.toUpperCase()); }
      });

      const agent = new RealtimeAgent({
        name: 'Arabic Voice Assistant',
        instructions: (
          `أنت معلم أطفال للحروف الإنجليزية يقود الدرس كاملاً بمفردك بالصوت وبالواجهة.
الحرف الحالي هو ${selectedLetter || 'A'}. التزم بالتسلسل الآتي حرفيًا، ولا تنتقل لمرحلة جديدة قبل التأكد:

[السياسة العامة]
- تحدث بالعربية الفصحى المبسطة وبنبرة مشجعة.
- انتظر دائمًا رد الأطفال قبل التقدم (باستخدام اكتشاف التحدث). إذا لم تسمع ردًا، كرر بلطف أو اطلب "قولوا جاهز".
- استخدم أدوات الواجهة المناسبة بدقة، مع مسح العناصر قبل عرض عنصر جديد.
- عند الإجابة الخاطئة: قل "حاول مرة أخرى". عند الإجابة الصحيحة: امدح بإيجاز.

[مراحل الدرس]
1) تقديم الحرف (Intro)
   - استخدم ui_set_letter لتثبيت الحرف.
   - استخدم ui_show_both لعرض الحرف الكبير والصغير معًا.
   - قدِّم نفسك والمنصّة بالنصوص التالية حرفيًا قبل شرح الحرف:
     قل: "مرحبًا يا أصدقائي! أنا الروبوت المعلّم روبو، صديقكم الذكي."
     قل: "أنا من المنصّة التعليمية الذكية لتعلّم الحروف بالصوت واللعب والرسم."
     قل: "خطة درسنا اليوم بسيطة وممتعة: هنسمع، ونتكلم، ونرسم، ونتفرج على صور، وفي الآخر أغنية جميلة."
     قل: "قواعدنا: نسمع كويس، نرفع إيدنا قبل الكلام، ونقول \"جاهز\" لما نكون مستعدين، ونشجع أصحابنا دائمًا."
     قل: "سنتعلم اليوم حرف ${selectedLetter || 'A'} معًا خطوة بخطوة."
     قل: "هل أنتم جاهزون؟ قولوا: جاهز."
     - انتظر سماع "جاهز/جاهزين" قبل المتابعة.
   - بعد المقدمة: عرّف بالحرف الكبير والصغير واطلب ترديد "حرف ${selectedLetter || 'A'}" 5 مرات بالضبط.
   - انتظر رد الأطفال بعد كل مرة قبل المتابعة للترديد التالي.
   - لا تنتقل للمرحلة التالية حتى تكمل الـ 5 مرات مع انتظار الردود.

2) كلمات تبدأ بالحرف (Words)
   - استخدم ui_show_words (يمرر الحرف فقط، والواجهة ستعرض أمثلة وصور تلقائيًا).
   - عرف كلمتين على الأقل واطلب ترديدهما مع الأطفال.
   - اطلب من الأطفال اقتراح كلمة تبدأ بالحرف.

3) الكتابة على السبورة (Writing)
   - استخدم ui_show_blackboard.
   - اطلب كتابة الحرف الكبير (Capital) أولاً وانتظر تفاعل الأطفال.
   - ثم اطلب كتابة الحرف الصغير (Small) وانتظر تفاعل الأطفال.
   - السبورة تدعم الكتابة بالشكلين معًا.

4) الختام (Outro)
   - راجع سريعًا ثم أعلن الانتقال لفقرة الأغنية.
   - بعد سماع "جاهز"، انتقل لعرض الأغنية.

5) الأغنية (Song) — تكون المرحلة الأخيرة
   - استخدم ui_show_song لعرض فيديو الأغنية الخاصة بالحرف.
   - بعد انتهاء الأغنية أخبر الأطفال بوجود زر "الاختبارات" في الواجهة.

مهم: قبل الانتقال بين المراحل اطلب "هل أنتم جاهزون؟ قولوا: جاهز" وانتظر سماع "جاهز/جاهزين" ثم تابع. لا تتخطَّ أي مرحلة.`
        ),
        tools: [UiShowLetter, UiShowBoth, UiShowBoard, UiShowWords, UiShowSong, UiClear, UiSetLetter],
      });
      const session = new RealtimeSession(agent, {
        model: 'gpt-realtime',
        config: {
          turnDetection: {
            type: 'semantic_vad',
            eagerness: 'medium',
            createResponse: true,
            interruptResponse: true,
          },
        },
      });

      // Track history updates to infer speaking and extract last assistant text
      session.on('history_updated', (history: any[]) => {
        if (!Array.isArray(history) || history.length === 0) return;
        const last = history[history.length - 1];
        if (last?.role === 'assistant') {
          const text = typeof last?.content === 'string' ? last.content : last?.content?.text || '';
          this.update({ isSpeaking: true, message: text || this.state.message });
          if (this.speakTimer) window.clearTimeout(this.speakTimer);
          this.speakTimer = window.setTimeout(() => {
            this.update({ isSpeaking: false });
          }, 2500);
        } else if (last?.role === 'user') {
          const text = typeof last?.content === 'string' ? last.content : last?.content?.text || '';
          if (this.pendingUserResolver) {
            const resolve = this.pendingUserResolver;
            this.pendingUserResolver = null;
            resolve(text || '');
          }
        }
      });

      session.on('tool_approval_requested', (_ctx: any, _agent: any, request: any) => {
        // Auto-approve UI tools for seamless UX
        try { (session as any).approve?.(request.approvalItem); } catch {}
      });

      await session.connect({ apiKey: json.apiKey });
      this.session = session;
      this.update({ isConnected: true });
    } catch (e: any) {
      this.update({ error: e?.message || 'failed_to_connect', isConnected: false });
      await this.disconnect();
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // RealtimeSession does not expose a disconnect API in the browser.
      // Drop the reference to allow GC; remote side will timeout the session.
    } finally {
      this.session = null;
      this.update({ isConnected: false, isMicEnabled: false });
    }
  }

  setMicEnabled(enabled: boolean) {
    // The SDK manages VAD internally; explicit mic toggling is not exposed.
    this.update({ isMicEnabled: !!enabled });
  }

  async speak(text: string): Promise<void> {
    if (!this.session) throw new Error('not_connected');
    await this.session.sendMessage?.(text);
  }

  awaitUserSpeech(timeoutMs = 10000): Promise<string> {
    if (!this.session) return Promise.reject(new Error('not_connected'));
    if (this.pendingUserResolver) {
      // replace previous waiter
      this.pendingUserResolver('');
      this.pendingUserResolver = null;
    }
    return new Promise<string>((resolve) => {
      let settled = false;
      this.pendingUserResolver = (txt: string) => {
        if (settled) return;
        settled = true;
        resolve(txt);
      };
      window.setTimeout(() => {
        if (settled) return;
        settled = true;
        this.pendingUserResolver = null;
        resolve('');
      }, timeoutMs);
    });
  }
}


