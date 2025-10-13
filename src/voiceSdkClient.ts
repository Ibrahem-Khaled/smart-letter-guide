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
  private detachAudioElementListeners: (() => void) | null = null;
  private lastAssistantSpeechEndEstimate = 0;
  private agentSpeechActive = false;
  private letterSpeechActive = false;

  // دالة لتحديد صوت الحرف الصحيح
  private getLetterSound(letter: string): string {
    const sounds: Record<string, string> = {
      'A': 'æ',
      'B': 'b', 
      'C': 'k',
      'D': 'd',
      'E': 'ɛ',
      'F': 'f',
      'G': 'g',
      'H': 'h',
      'I': 'ɪ',
      'J': 'ʤ',
      'K': 'k',
      'L': 'l',
      'M': 'm',
      'N': 'n',
      'O': 'ɒ',
      'P': 'p',
      'Q': 'k',
      'R': 'r',
      'S': 's',
      'T': 't',
      'U': 'ʌ',
      'V': 'v',
      'W': 'w',
      'X': 'ks',
      'Y': 'j',
      'Z': 'z'
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
    const prevSpeaking = this.state.isSpeaking;
    const nextState = { ...this.state, ...partial };
    this.state = nextState;
    this.onChange?.(nextState);

    if (prevSpeaking && !this.state.isSpeaking && this.pendingSilenceResolvers.length) {
      const resolvers = [...this.pendingSilenceResolvers];
      this.pendingSilenceResolvers = [];
      resolvers.forEach((resolve) => {
        try {
          resolve();
        } catch {}
      });
    }
  }

  private setSpeakingSource(source: 'agent' | 'letter', active: boolean) {
    if (source === 'agent') {
      this.agentSpeechActive = active;
    } else {
      this.letterSpeechActive = active;
    }

    const speaking = this.agentSpeechActive || this.letterSpeechActive;
    this.update({ isSpeaking: speaking });

    if (!speaking) {
      this.lastAssistantSpeechEndEstimate = Date.now();
    }
  }

  getState(): VoiceSdkState {
    return { ...this.state };
  }

  setUiHooks(hooks: Partial<typeof this.uiHooks>) {
    this.uiHooks = { ...this.uiHooks, ...hooks };
  }

  attachAudioElement(element: HTMLAudioElement | null) {
    if (this.detachAudioElementListeners) {
      try { this.detachAudioElementListeners(); } catch {}
      this.detachAudioElementListeners = null;
    }

    this.audioElement = element;

    if (element) {
      const handlePlaying = () => {
        this.setSpeakingSource('letter', true);
      };
      const handlePause = () => {
        if (!element.paused) return;
        this.setSpeakingSource('letter', false);
      };
      const handleEnded = () => {
        this.setSpeakingSource('letter', false);
      };

      element.addEventListener('playing', handlePlaying);
      element.addEventListener('pause', handlePause);
      element.addEventListener('ended', handleEnded);

      this.detachAudioElementListeners = () => {
        element.removeEventListener('playing', handlePlaying);
        element.removeEventListener('pause', handlePause);
        element.removeEventListener('ended', handleEnded);
      };
    }
  }

  async connect(selectedLetter?: string): Promise<void> {
    if (this.session) return;
    try {
      this.update({ error: undefined });
      this.lastAssistantSpeechEndEstimate = 0;

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
          await this.waitForAgentSilence(2500);
          await new Promise((resolve) => window.setTimeout(resolve, 200));
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
- انطق صوت الحرف بنفسك بدقة كما في الكلمات (باستخدام النطق ${this.getLetterSound(selectedLetter || 'A')}). لا تعتمد على التسجيلات إلا إذا طلب منك ذلك يدويًا.
- استخدم أدوات الواجهة المناسبة بدقة، مع مسح العناصر قبل عرض عنصر جديد.
- بعد انتهاء كل مرحلة، قل جملة تشجيعية قصيرة قبل الانتقال للمرحلة التالية.
- عند الإجابة الخاطئة: قل "حاول مرة أخرى". عند الإجابة الصحيحة: امدح بإيجاز.

[مراحل الدرس]
1) التقديم وتكرار الحرف (Intro)
   - استخدم ui_set_letter لتثبيت الحرف.
   - استخدم ui_show_both لعرض الحرف الكبير والصغير معًا.
   - قدِّم نفسك والمنصّة بالنص التالي حرفيًا:
     قل: "مرحبا اصدقائي الصغار انا روبوتكم الذكي روبو والنهارده هنتعلم ونلعب مع بعض وهنتعلم حرف جديد من حروف اللغه الانجليزيه وهو حرف ${selectedLetter || 'A'}."
   - قل: "هل أنتم جاهزون؟ قولوا: جاهز."
     - انتظر سماع "جاهز/جاهزين" قبل المتابعة.
   - بعد المقدمة عرِّف الأطفال بالشكل الكبير والصغير للحرف ووضّح أنهما يمثلان نفس الحرف.
  - اطلب من الأطفال ترديد جملة "حرف ${selectedLetter || 'A'}" خمس مرات.
    * قبل كل مرة استخدم جملة تشجيعية قصيرة مثل "هيا بنا نكرر معًا".
    * بعد كل طلب استخدم ui_wait_for_student_response (timeoutMs=2000) للتأكد من سماع الرد.
    * عند سماع الرد الصحيح استخدم ui_update_repetition_count لتحديث العداد، وإذا لم تسمع الرد أعد الطلب حتى يردوا.
  - بعد اكتمال الخمس مرات قل: "يا طلاب، الحرف ينطق كده. استمعوا جيدًا." ثم انطق بصوت واضح الصوت القصير الصحيح مرتين متتاليتين (استند إلى النطق القياسي مثل /æ/ لحرف A) واذكر مثالاً إنجليزيًا مناسبًا قبل الانتقال.
  - فور الانتهاء استخدم ui_reset_repetition_count لتصفير العداد وقل: "دلوقتي هنكرر صوت الحرف معًا.".
    * لكل مرة من الخمس مرات: قل حرفيًا: "زي ما سمعتو كده يا أبطال، الحرف ينطق كده. هنقوله تاني مع بعض." ثم انطق الصوت بنفسك بوضوح، وبعد النطق مباشرة استخدم ui_wait_for_student_response (timeoutMs=2000) للتأكد من سماع الرد، ثم حدّث العداد عبر ui_update_repetition_count بعد أن تسمع نطقًا صحيحًا.
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
     * بعد كل طلب استخدم ui_wait_for_student_response (timeoutMs=2000) للتأكد من سماع الرد، ثم حدّث العداد عبر ui_update_repetition_count عند سماع النطق الصحيح. إذا لم تسمع الرد الصحيح فاطلب المحاولة مرة أخرى ولا تنتقل حتى تسمع نطقًا صحيحًا.
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
   - قل: "مرحلة السابورة! دلوقتي هنكتب حرف ${selectedLetter || 'A'} مع بعض." قبل أي توجيه.
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
          this.update({ message: text || this.state.message });
          this.setSpeakingSource('agent', true);
          if (this.speakTimer) window.clearTimeout(this.speakTimer);
          this.speakTimer = window.setTimeout(() => {
            this.setSpeakingSource('agent', false);
          }, 2500);
        } else if (last?.role === 'user') {
          const contentText = typeof last?.content === 'string' ? last.content : last?.content?.text || '';
          if (contentText) {
            if (this.pendingUserResolver) {
              this.pendingUserResolver(contentText);
              this.pendingUserResolver = null;
            }
          } else {
            this.setSpeakingSource('agent', false);
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
      this.lastAssistantSpeechEndEstimate = 0;
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
    await this.waitForAgentSilence();
    await this.session.sendMessage?.(text);
  }

  waitForAgentSilence(timeoutMs = 1800): Promise<void> {
    return new Promise<void>((resolve) => {
      const now = Date.now();
      const graceRemaining = this.lastAssistantSpeechEndEstimate + 300 - now;
      if (!this.state.isSpeaking && graceRemaining <= 0) {
        window.setTimeout(resolve, 150);
        return;
      }

      const complete = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        if (graceTimeoutId !== null) {
          window.clearTimeout(graceTimeoutId);
        }
        this.pendingSilenceResolvers = this.pendingSilenceResolvers.filter((fn) => fn !== complete);
      };

      this.pendingSilenceResolvers.push(complete);
      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);

      const graceTimeoutId = graceRemaining > 0
        ? window.setTimeout(() => {
            cleanup();
            resolve();
          }, graceRemaining)
        : null;
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
      const startTime = Date.now();
      this.setSpeakingSource('letter', true);
      audio.onended = () => {
        if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
        this.setSpeakingSource('letter', false);
        this.lastAssistantSpeechEndEstimate = Math.max(this.lastAssistantSpeechEndEstimate, startTime);
        resolve();
      };
      audio.onerror = () => {
        if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
        this.setSpeakingSource('letter', false);
        this.lastAssistantSpeechEndEstimate = Math.max(this.lastAssistantSpeechEndEstimate, startTime);
        reject(new Error('Failed to play recording'));
      };
      audio.play().catch((err) => {
        if (this.currentRecordingAudio === audio) this.currentRecordingAudio = null;
        this.setSpeakingSource('letter', false);
        this.lastAssistantSpeechEndEstimate = Math.max(this.lastAssistantSpeechEndEstimate, startTime);
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
      this.setSpeakingSource('letter', false);
    }
  }
}


