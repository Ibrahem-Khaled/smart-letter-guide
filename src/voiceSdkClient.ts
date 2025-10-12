import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
import { OpenAIRealtimeWebRTC } from '@openai/agents/realtime';
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
  private pendingSilenceResolvers: Array<() => void> = [];
  private micStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentRecordingAudio: HTMLAudioElement | null = null;

  // دالة لتحديد صوت الحرف الصحيح
  private getLetterSound(letter: string): string {
    const sounds: Record<string, string> = {
      'A': 'إيه',
      'B': 'بيه', 
      'C': 'سيه',
      'D': 'ديه',
      'E': 'إي',
      'F': 'إف',
      'G': 'جيه',
      'H': 'إيتش',
      'I': 'آي',
      'J': 'جيه',
      'K': 'كيه',
      'L': 'إل',
      'M': 'إم',
      'N': 'إن',
      'O': 'أو',
      'P': 'بيه',
      'Q': 'كيو',
      'R': 'آر',
      'S': 'إس',
      'T': 'تي',
      'U': 'يو',
      'V': 'في',
      'W': 'دبليو',
      'X': 'إكس',
      'Y': 'واي',
      'Z': 'زد'
    };
    return sounds[letter.toUpperCase()] || 'الصوت الصحيح';
  }
  private uiHooks: {
    showLetter?: (letter: string) => void;
    showBoth?: (letter: string, capital: string, small: string) => void;
    showBlackboard?: (letter: string) => void;
    showWords?: (words: { word: string; arabic: string; image?: string }[]) => void;
    showSong?: (url?: string) => void;
    showGameSelection?: () => void;
    clearVisuals?: () => void;
    setLetter?: (letter: string) => void;
    updateRepetitionCount?: (letter: string, count: number) => void;
    playLetterRecording?: (letter: string) => Promise<void> | void;
    stopLetterRecording?: () => Promise<void> | void;
    waitForStudentResponse?: (options?: { timeoutMs?: number }) => Promise<string> | string;
    resetRepetitionCount?: (letter: string) => void;
  } = {};

  onUpdate(listener: Listener) {
    this.onChange = listener;
  }

  private update(partial: Partial<VoiceSdkState>) {
    const nextState = { ...this.state, ...partial };
    this.state = nextState;
    this.onChange?.(nextState);

    if (!nextState.isSpeaking && this.pendingSilenceResolvers.length) {
      const resolvers = [...this.pendingSilenceResolvers];
      this.pendingSilenceResolvers = [];
      resolvers.forEach((resolve) => {
        try {
          resolve();
        } catch {}
      });
    }
  }

  getState(): VoiceSdkState {
    return { ...this.state };
  }

  setUiHooks(hooks: Partial<typeof this.uiHooks>) {
    this.uiHooks = { ...this.uiHooks, ...hooks };
  }

  attachAudioElement(element: HTMLAudioElement | null) {
    this.audioElement = element;
  }

  async connect(selectedLetter?: string): Promise<void> {
    if (this.session) return;
    try {
      this.update({ error: undefined });

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(`${apiBaseUrl}/api/ephemeral`);
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
      const UiShowGameSelectionParams = z.object({});
      const UiClearParams = z.object({});
      const UiSetLetterParams = z.object({ letter: z.string().min(1) });
      const UiUpdateRepetitionCountParams = z.object({ letter: z.string().min(1), count: z.number().min(0).max(5) });
      const UiPlayLetterRecordingParams = z.object({ letter: z.string().min(1) });
      const UiWaitForStudentResponseParams = z.object({ timeoutMs: z.number().min(1000).max(60000) });

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
      const UiShowImageSelection = tool<typeof UiShowWordsParams, RealtimeContextData>({
        name: 'ui_show_image_selection',
        description: 'Show image selection game for the letter.',
        parameters: UiShowWordsParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.clearVisuals?.(); (this.uiHooks as any).showImageSelectionForLetter?.(letter); }
      });
      const UiShowSong = tool<typeof UiShowSongParams, RealtimeContextData>({
        name: 'ui_show_song',
        description: 'Show a song/video for the letter.',
        parameters: UiShowSongParams,
        execute: async ({ letter }: { letter: string }) => { this.uiHooks.clearVisuals?.(); (this.uiHooks as any).showSongForLetter?.(letter); }
      });
      const UiShowGameSelection = tool<typeof UiShowGameSelectionParams, RealtimeContextData>({
        name: 'ui_show_game_selection',
        description: 'Show game selection options for the outro stage.',
        parameters: UiShowGameSelectionParams,
        execute: async () => { this.uiHooks.clearVisuals?.(); this.uiHooks.showGameSelection?.(); }
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

      const UiUpdateRepetitionCount = tool<typeof UiUpdateRepetitionCountParams, RealtimeContextData>({
        name: 'ui_update_repetition_count',
        description: 'Update the repetition count for a letter (0-5).',
        parameters: UiUpdateRepetitionCountParams,
        execute: async ({ letter, count }: { letter: string; count: number }) => { 
          this.uiHooks.updateRepetitionCount?.(letter.toUpperCase(), count); 
        }
      });

      const UiResetRepetitionCount = tool<typeof UiSetLetterParams, RealtimeContextData>({
        name: 'ui_reset_repetition_count',
        description: 'Reset the repetition count for a letter back to zero.',
        parameters: UiSetLetterParams,
        execute: async ({ letter }: { letter: string }) => {
          this.uiHooks.resetRepetitionCount?.(letter.toUpperCase());
        }
      });

      const UiPlayLetterRecording = tool<typeof UiPlayLetterRecordingParams, RealtimeContextData>({
        name: 'ui_play_letter_recording',
        description: 'Play the recorded pronunciation of a letter.',
        parameters: UiPlayLetterRecordingParams,
        execute: async ({ letter }: { letter: string }) => { 
          await this.uiHooks.playLetterRecording?.(letter.toUpperCase()); 
        }
      });
      const UiStopLetterRecording = tool<typeof UiClearParams, RealtimeContextData>({
        name: 'ui_stop_letter_recording',
        description: 'Stop any currently playing letter recording immediately.',
        parameters: UiClearParams,
        execute: async () => {
          await this.uiHooks.stopLetterRecording?.();
        }
      });

      const UiWaitForStudentResponse = tool<typeof UiWaitForStudentResponseParams, RealtimeContextData>({
        name: 'ui_wait_for_student_response',
        description: 'Listen for a student response using the microphone with an optional timeout.',
        parameters: UiWaitForStudentResponseParams,
        execute: async ({ timeoutMs }: { timeoutMs: number }) => {
          if (this.uiHooks.waitForStudentResponse) {
            const response = await this.uiHooks.waitForStudentResponse({ timeoutMs });
            return { response };
          }
          this.update({ isSpeaking: false });
          return { response: '' };
        }
      });

      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          this.micStream?.getTracks().forEach((track) => {
            try { track.stop(); } catch {}
          });
          // Request low-latency mic constraints where supported
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 48000,
              sampleSize: 16,
              latency: 0.01
            } as any
          });
        } catch (err) {
          console.warn('Failed to acquire shared microphone stream, falling back to transport default.', err);
          this.micStream = null;
        }
      }

      const agent = new RealtimeAgent({
        name: 'Arabic Voice Assistant',
        instructions: (
          `أنت معلم أطفال للحروف الإنجليزية يقود الدرس كاملاً بمفردك بالصوت وبالواجهة.
الحرف الحالي هو ${selectedLetter || 'A'}. التزم بالتسلسل الآتي حرفيًا، ولا تنتقل لمرحلة جديدة قبل التأكد:

[السياسة العامة]
- تحدّث بالعربية الفصحى المبسطة وبنبرة مشجعة.
- الوكيل الصوتي يتحكّم في جميع خطوات الدرس دون الاعتماد على مدخلات المستخدم اليدوية.
- انتظر دائمًا رد الأطفال قبل التقدم (باستخدام اكتشاف التحدث). إذا لم تسمع ردًا، كرر بلطف أو اطلب "قولوا جاهز".
- لا تنطق صوت الحرف بنفسك؛ استخدم التسجيل الصوتي عبر ui_play_letter_recording بعد تمهيد بسيط.
- قبل تشغيل أي تسجيل استخدم ui_stop_letter_recording للتأكد من عدم تشغيل مقطع آخر، ثم شغّل التسجيل الجديد وتحكّم في وقفه بنفسك عند الحاجة.
- استخدم أدوات الواجهة المناسبة بدقة، مع مسح العناصر قبل عرض عنصر جديد.
- عند الإجابة الخاطئة: قل "حاول مرة أخرى". عند الإجابة الصحيحة: امدح بإيجاز.

[مراحل الدرس]
1) التقديم وتكرار الحرف (Intro)
   - استخدم ui_set_letter لتثبيت الحرف.
   - استخدم ui_show_both لعرض الحرف الكبير والصغير معًا.
   - قدِّم نفسك والمنصّة بالنصوص التالية حرفيًا:
     قل: "مرحبًا يا أصدقائي! أنا الروبوت المعلّم روبو، صديقكم الذكي."
     قل: "أنا من المنصّة التعليمية الذكية لتعلّم الحروف بالصوت واللعب والرسم."
     قل: "خطة درسنا اليوم بسيطة وممتعة: هنسمع، ونتكلم، ونرسم، ونتفرج على صور، وفي الآخر أغنية جميلة."
     قل: "قواعدنا: نسمع كويس، نرفع إيدنا قبل الكلام، ونقول \"جاهز\" لما نكون مستعدين، ونشجع أصحابنا دائمًا."
     قل: "سنتعلم اليوم حرف ${selectedLetter || 'A'} معًا خطوة بخطوة."
     قل: "هل أنتم جاهزون؟ قولوا: جاهز."
     - انتظر سماع "جاهز/جاهزين" قبل المتابعة.
   - بعد المقدمة عرِّف الأطفال بالشكل الكبير والصغير للحرف ووضّح أنهما يمثلان نفس الحرف.
   - اطلب من الأطفال ترديد جملة "حرف ${selectedLetter || 'A'}" خمس مرات.
     * قبل كل مرة استخدم جملة تشجيعية قصيرة مثل "هيا بنا نكرر معًا".
     * بعد كل طلب استخدم ui_wait_for_student_response (timeoutMs=8000) للتأكد من سماع الرد.
     * عند سماع الرد الصحيح استخدم ui_update_repetition_count لتحديث العداد، وإذا لم تسمع الرد أعد الطلب حتى يردوا.
   - بعد اكتمال الخمس مرات قل: "يا طلاب، الحرف ينطق كده. استمعوا جيدًا." ثم استخدم ui_stop_letter_recording لضمان الصمت قبل التشغيل، وبعدها ui_play_letter_recording لتشغيل المقطع الصوتي وانتظر انتهاءه قبل الكلام التالي. إذا توفّر soundUrl في البيانات فاطلب تشغيله، وإلا استخدم التسجيل الذي حمّله المعلم.
   - فور انتهاء التسجيل استخدم ui_reset_repetition_count لتصفير العداد وقل: "دلوقتي هنكرر صوت الحرف معًا.".
    * لكل مرة من الخمس مرات: قل عبارة تشجيعية قصيرة، ثم استخدم ui_stop_letter_recording لضمان الصمت وبعدها ui_play_letter_recording لتشغيل الصوت نفسه كنموذج، ولا تنطق الصوت بصوتك.
    * بعد انتهاء التسجيل مباشرة استخدم ui_wait_for_student_response (timeoutMs=8000) للتأكد من سماع الرد، ثم حدّث العداد عبر ui_update_repetition_count بعد أن تسمع نطقًا صحيحًا.
    * إذا لم يكن النطق صحيحًا أو لم تسمع الرد، اطلب المحاولة مرة أخرى ولا تنتقل للمرة التالية حتى تسمع الصوت الصحيح.
   

2) اختبار التعرف على الحرف (Letter Recognition)
   - استخدم ui_show_both لعرض صورة الحرف الكبير والصغير.
   - قل: "بصوا على الشاشة، ده حرف إيه؟"
   - انتظر إجابة الطفل. إذا أجاب بالحرف الصحيح (${selectedLetter || 'A'}), قل "أحسنت!" وانتقل للمرحلة التالية.
   - إذا أجاب خطأ، قل "حاول مرة أخرى" وكرر السؤال مرة ثانية فقط.
   - إذا أجاب خطأ للمرة الثانية، قل "هذا هو حرف ${selectedLetter || 'A'}" ثم انتقل للمرحلة التالية.

3) اختبار صوت الحرف (Letter Sound)
   - قل: "ممتاز! دلوقتي إيه صوت حرف ${selectedLetter || 'A'}؟"
   - انتظر إجابة الطفل. إذا أجاب بالصوت الصحيح (${this.getLetterSound(selectedLetter || 'A')}), قل "أحسنت!" وانتقل لمرحلة الكلمات.
   - إذا أجاب خطأ، قل "حاول مرة أخرى" وكرر السؤال مرة ثانية فقط.
   - إذا أجاب خطأ للمرة الثانية، قل "صوت حرف ${selectedLetter || 'A'} هو ${this.getLetterSound(selectedLetter || 'A')}" ثم انتقل لمرحلة الكلمات.

4) كلمات تبدأ بالحرف (Words)
   - استخدم ui_show_words لعرض أمثلة لكلمات تبدأ بالحرف.
   - ركّز على أول كلمتين فقط من القائمة لضمان التعمق في التدريب.
   - لكل كلمة من هاتين الكلمتين:
     * استخدم ui_reset_repetition_count قبل بدء التدريب.
     * انطق الكلمة بصوت واضح، ثم قل حرفيًا: "قولوا: [الكلمة]".
     * كرر الخطوتين السابقتين خمس مرات: قبل كل مرة انطق الكلمة بنفسك، ثم اطلب من الأطفال ترديدها.
     * بعد كل طلب استخدم ui_wait_for_student_response (timeoutMs=8000) للتأكد من سماع الرد، ثم حدّث العداد عبر ui_update_repetition_count عند سماع النطق الصحيح. إذا لم تسمع الرد الصحيح فاطلب المحاولة مرة أخرى ولا تنتقل حتى تسمع نطقًا صحيحًا.
   - بعد إتمام الخمس مرات للكلمتين، اشرح معنى كل كلمة بالعربية وشجع الأطفال على استخدامها في جملة قصيرة.
   - اطلب من الأطفال اقتراح كلمة تبدأ بالحرف.
     * إذا كانت الإجابة صحيحة امدحهم.
     * إذا كانت خاطئة قل "حاول مرة أخرى" ثم قدّم مثالًا صحيحًا بعد المحاولة الثانية.

5) لعبة اختيار الصور (Image Selection)
   - استخدم ui_show_image_selection لعرض الصور المرتبطة بالحرف.
   - قل: "دلوقتي هنلعب لعبة! بصوا على الصور دي، اختاروا الصورة اللي بتبدأ بحرف ${selectedLetter || 'A'}."
   - انتظر إجابة الطفل. إذا اختار الصورة الصحيحة، قل "ممتاز! أحسنت!" وانتقل للمرحلة التالية.
   - إذا اختار صورة خاطئة، قل "حاول مرة أخرى" وكرر السؤال مرة ثانية فقط.
   - إذا كانت الإجابة خاطئة مرتين، حدّد الصورة الصحيحة واشرح السبب.

6) الكتابة على السبورة (Writing)
   - استخدم ui_show_blackboard.
   - اطلب كتابة الحرف الكبير (Capital) أولاً وانتظر تفاعل الأطفال.
   - ثم اطلب كتابة الحرف الصغير (Small) وانتظر تفاعل الأطفال.
   - شجعهم على تتبّع شكل الحرف بأصابعهم والكتابة في الهواء إذا لم توجد سبورة.

7) الأغنية (Song)
   - قبل الانتقال اطلب من الأطفال التأكيد بقول "جاهز".
   - استخدم ui_show_song لعرض فيديو الأغنية الخاصة بالحرف.
   - شجع الأطفال على الغناء مع الأغنية حتى نهايتها ثم اسألهم إن كانوا جاهزين للمرحلة الأخيرة.

8) الختام والألعاب (Outro)
   - راجع باختصار ما تعلمه الأطفال عن اسم الحرف وصوته وكلماته.
   - استخدم ui_show_game_selection لعرض خيارات الألعاب.
   - قدم للأطفال خيارين: "لعبة البالونات" و "لعبة الاختيارات" واطلب منهم اختيار واحدة.
   - بعد اختيار اللعبة أخبرهم أن التحكم الكامل سيكون من خلالك، وواصل التفاعل بناءً على اختيارهم.
   - في نهاية الجلسة ذكّرهم بوجود زر "الاختبارات" للتدريب الإضافي وشجعهم على الاستمرار في المراجعة.

مهم: قبل الانتقال بين المراحل اطلب "هل أنتم جاهزون؟ قولوا: جاهز" وانتظر سماع "جاهز/جاهزين" ثم تابع. لا تتخطَّ أي مرحلة ولا تعتمد على المدخلات اليدوية من المستخدم.`
        ),
        tools: [UiShowLetter, UiShowBoth, UiShowBoard, UiShowWords, UiShowImageSelection, UiShowSong, UiShowGameSelection, UiClear, UiSetLetter, UiUpdateRepetitionCount, UiResetRepetitionCount, UiPlayLetterRecording, UiStopLetterRecording, UiWaitForStudentResponse],
      });
      const session = new RealtimeSession(agent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement: this.audioElement ?? undefined,
          mediaStream: this.micStream ?? undefined,
        }),
        model: 'gpt-realtime',
        config: {
          turnDetection: {
            type: 'semantic_vad',
            eagerness: 'high',
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
          const contentText = typeof last?.content === 'string' ? last.content : last?.content?.text || '';
          if (contentText) {
            if (this.pendingUserResolver) {
              this.pendingUserResolver(contentText);
              this.pendingUserResolver = null;
            }
          } else {
            this.update({ isSpeaking: false });
          }
        }
      });

      session.on('tool_approval_requested', (_ctx: any, _agent: any, request: any) => {
        // Auto-approve UI tools for seamless UX
        try { (session as any).approve?.(request.approvalItem); } catch {}
      });

      await session.connect({ apiKey: json.apiKey });
      this.session = session;
      const micTrackEnabled = this.micStream ? this.micStream.getAudioTracks().some((t) => t.enabled !== false) : true;
      this.update({ isConnected: true, isMicEnabled: micTrackEnabled });
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
      if (this.micStream) {
        for (const track of this.micStream.getTracks()) {
          try { track.stop(); } catch {}
        }
      }
      this.micStream = null;
      this.update({ isConnected: false, isMicEnabled: false });
    }
  }

  setMicEnabled(enabled: boolean) {
    if (this.session) {
      try {
        this.session.mute(!enabled);
      } catch (err) {
        console.warn('Failed to toggle session mute:', err);
      }
    }
    if (this.micStream) {
      for (const track of this.micStream.getAudioTracks()) {
        track.enabled = enabled;
      }
    }
    this.update({ isMicEnabled: !!enabled });
  }

  async speak(text: string): Promise<void> {
    if (!this.session) throw new Error('not_connected');
    await this.session.sendMessage?.(text);
  }

  waitForAgentSilence(timeoutMs = 1800): Promise<void> {
    return new Promise<void>((resolve) => {
      const complete = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        this.pendingSilenceResolvers = this.pendingSilenceResolvers.filter((fn) => fn !== complete);
      };

      if (!this.state.isSpeaking) {
        window.setTimeout(resolve, 150);
        return;
      }

      this.pendingSilenceResolvers.push(complete);
      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);
    });
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

  async playLetterRecording(recordingUrl: string): Promise<void> {
    await this.stopLetterRecording();
    return new Promise((resolve, reject) => {
      const audio = new Audio(recordingUrl);
      this.currentRecordingAudio = audio;
      audio.onended = () => {
        if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
        resolve();
      };
      audio.onerror = () => {
        if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
        reject(new Error('Failed to play recording'));
      };
      audio.play().catch((err) => {
        if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
        reject(err);
      });
    });
  }

  async stopLetterRecording(): Promise<void> {
    const audio = this.currentRecordingAudio;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } finally {
      if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
    }
  }
}


