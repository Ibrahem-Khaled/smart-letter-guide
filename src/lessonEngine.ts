import { VoiceSdkClient } from './voiceSdkClient';
import { LETTERS } from './letters';
import { speakLocal, listenOnceLocal } from './speech';

const SOUND_EXAMPLES: Record<string, string> = {
  A: 'إيه', // صوت الحرف A
  B: 'بيه', // صوت الحرف B
  C: 'سيه', // صوت الحرف C
  D: 'ديه', // صوت الحرف D
  E: 'إي', // صوت الحرف E
  F: 'إف', // صوت الحرف F
  G: 'جيه', // صوت الحرف G
  H: 'إيتش', // صوت الحرف H
  I: 'آي', // صوت الحرف I
  J: 'جيه', // صوت الحرف J
  K: 'كيه', // صوت الحرف K
  L: 'إل', // صوت الحرف L
  M: 'إم', // صوت الحرف M
  N: 'إن', // صوت الحرف N
  O: 'أو', // صوت الحرف O
  P: 'بيه', // صوت الحرف P
  Q: 'كيو', // صوت الحرف Q
  R: 'آر', // صوت الحرف R
  S: 'إس', // صوت الحرف S
  T: 'تي', // صوت الحرف T
  U: 'يو', // صوت الحرف U
  V: 'في', // صوت الحرف V
  W: 'دبليو', // صوت الحرف W
  X: 'إكس', // صوت الحرف X
  Y: 'واي', // صوت الحرف Y
  Z: 'زد', // صوت الحرف Z
};

export type LessonStep =
  | 'intro'
  | 'letter_sound'
  | 'quiz_letter'
  | 'capital_small'
  | 'writing'
  | 'post_writing'
  | 'words'
  | 'final_quiz'
  | 'song'
  | 'outro';

export interface LessonUIHooks {
  showLetter(letter: string): void;
  showBoth(letter: string, capital: string, small: string): void;
  showWords(words: { word: string; arabic: string; image?: string }[]): void;
  showBlackboard(letter: string): void;
  showSong(url?: string): void;
  clearVisuals(): void;
}

export class LessonEngine {
  private client: VoiceSdkClient;
  private letter: string;
  private ui: LessonUIHooks;

  constructor(client: VoiceSdkClient, letter: string, ui: LessonUIHooks) {
    this.client = client;
    this.letter = letter.toUpperCase();
    this.ui = ui;
  }

  async run(): Promise<void> {
    const assets = LETTERS[this.letter] || LETTERS['A'];
    const letterSound = SOUND_EXAMPLES[this.letter] || this.letter.toLowerCase();
    const say = async (text: string) => {
      try { await this.client.speak(text); } catch { await speakLocal(text); }
    };
    const awaitAnswer = async (ms: number) => {
      const sdk = await this.client.awaitUserSpeech(ms);
      if (sdk && sdk.trim()) return sdk.trim();
      return await listenOnceLocal(ms);
    };
    const exclusive = (fn: () => void) => { this.ui.clearVisuals(); fn(); };
    const askReady = async (): Promise<boolean> => {
      await say('هل أنتم جاهزون للانتقال للجزء التالي؟ قولوا: جاهز.');
      const ans = (await awaitAnswer(7000)).toLowerCase();
      return /(جاهز|جاهزين|نعم|ايوه|ايوا|اوه)/i.test(ans);
    };
    const practiceRepeat = async ({
      modelUtterance,
      repeatPrompt,
      validate,
      waitMs = 6000,
      successesNeeded = 5,
      maxAttemptsPerRound = 3,
    }: {
      modelUtterance: string | ((successCount: number) => string);
      repeatPrompt?: string | ((attemptIndex: number, successCount: number) => string);
      validate: (answer: string) => boolean;
      waitMs?: number;
      successesNeeded?: number;
      maxAttemptsPerRound?: number;
    }) => {
      let successCount = 0;
      while (successCount < successesNeeded) {
        const utterance =
          typeof modelUtterance === 'function' ? modelUtterance(successCount) : modelUtterance;
        await say(utterance);
        let attempt = 0;
        let succeeded = false;
        while (attempt < maxAttemptsPerRound && !succeeded) {
          const prompt = repeatPrompt
            ? typeof repeatPrompt === 'function'
              ? repeatPrompt(attempt, successCount)
              : repeatPrompt
            : 'كرروا الآن.';
          await say(prompt);
          const answer = await awaitAnswer(waitMs);
          if (answer && validate(answer)) {
            successCount += 1;
            succeeded = true;
            await say(successCount >= successesNeeded ? 'أحسنتم!' : 'رائع! مرة أخرى.');
          } else {
            attempt += 1;
            if (attempt < maxAttemptsPerRound) {
              await say('حاولوا مرة أخرى وركزوا على النطق الصحيح.');
            }
          }
        }
        if (!succeeded) {
          await say('لا بأس، دعونا نكمل الدرس بعد كل هذا الجهد.');
          break;
        }
      }
    };

    // 1) Intro
    await say('مرحبًا يا أطفالي! أنا روبوت منصة تعليم الحروف.');
    await say('أنا هنا علشان أعلّمكم الحروف باللعب والصوت والرسومات.');
    await say('اليوم سنأخذ درسًا جديدًا، حد يعرف هنأخذ إيه النهاردة؟');
    const introResp = (await awaitAnswer(6000)).trim();
    if (!introResp || /لا\s*نعرف|مش\s*عارفين|ما\s*نعرف/i.test(introResp)) {
      await say(`لا تقلقوا! اليوم سنتعلم حرف ${this.letter}.`);
    }
    exclusive(() => this.ui.showLetter(this.letter));
    await say(`هذا هو حرف ${this.letter}، هيا قولوا معي: حرف ${this.letter}`);
    await practiceRepeat({
      modelUtterance: `حرف ${this.letter}`,
      repeatPrompt: (_attempt, success) =>
        success === 0 ? 'قولوا: حرف ' + this.letter : 'مرة ثانية معًا.',
      validate: (answer) => answer.toUpperCase().includes(this.letter),
      waitMs: 6000,
    });

    // 2) Letter sound
    exclusive(() => this.ui.showLetter(this.letter));
    await say(`ركزوا معايا: اسم الحرف هو ${this.letter}.`);
    await say('لكن لما ندخله جوه الكلمات بنحتاج صوته مش بس اسمه.');
    await say(`صوت حرف ${this.letter} هو: ${letterSound}. حاولوا تركزوا في الفرق.`);
    if (assets.soundUrl) {
      await say('استمعوا للتسجيل الجاهز لصوت الحرف وبعدين هنكرر سوا.');
    } else {
      await say(`هسمعكم الصوت: ${letterSound}. جاهزين؟`);
    }
    await practiceRepeat({
      modelUtterance: assets.soundUrl ? 'استمعوا ثم كرروا الصوت.' : `${letterSound}`,
      repeatPrompt: 'قولوا صوت الحرف الآن.',
      validate: (answer) =>
        answer.toLowerCase().includes(letterSound.toLowerCase()) ||
        answer.toUpperCase().includes(this.letter),
      waitMs: 6000,
    });
    await say('أحسنتم يا أطفالي!');
    if (!(await askReady())) await say('سننتقل الآن بهدوء للجزء التالي.');

    // 3) Quiz letter recognition
    exclusive(() => this.ui.showLetter(this.letter));
    await say('ما هذا الحرف؟');
    for (let attempts = 0; attempts < 3; attempts++) {
      const ans = (await awaitAnswer(6000)).toUpperCase();
      if (ans.includes(this.letter)) {
        await say('أحسنت!');
        break;
      }
      if (attempts < 2) await say('حاول مرة أخرى.');
      else {
        await say(`هذا هو حرف ${this.letter}. فلنحاول مرة أخرى.`);
        await say('ما هذا الحرف؟');
      }
    }

    if (!(await askReady())) await say('ممتاز! نكمل سويًا.');

    // 4) Capital vs Small with writing plan
    exclusive(() => this.ui.showBoth(this.letter, assets.capital, assets.small));
    await say(`بصوا على الشاشة: حرف ${this.letter} بيتكوّن من شكلين.`);
    await say(`على الشمال شايفين ${assets.capital}. ده الشكل الكبير ونسميه Capital.`);
    await say('قولوا معايا: الكبير على الشمال.');
    await awaitAnswer(6000);
    await say(`وعلى اليمين شايفين ${assets.small}. ده الشكل الصغير ونسميه Small.`);
    await say('قولوا معايا: الصغير على اليمين.');
    await awaitAnswer(6000);
    await say(`يبقى حرف ${this.letter} بيتكوّن من Capital كبير على الشمال و Small صغير على اليمين.`);
    await say('مين يقدر يعيدها بطريقته؟');
    const csAns = await awaitAnswer(6000);
    if (/(capital|كابيتال|كبير)/i.test(csAns) && /(small|صمول|صغير)/i.test(csAns)) {
      await say('أحسنت!');
    } else {
      await say('حاول مرة أخرى.');
    }
    if (!(await askReady())) await say('استعدوا للكتابة على السبورة.');

    // 5) Writing
    exclusive(() => this.ui.showBlackboard(this.letter));
    await say(`الآن سنرسم حرف ${this.letter} معاً.`);
    await say('اتبعوا الرسم على السبورة بأصابعكم في الهواء.');
    await say('ممتاز! من سيكتب الحرف على السبورة؟');
    await awaitAnswer(6000);
    await say('والآن اكتبوه وحدكم على السبورة الخالية.');
    await awaitAnswer(6000);
    // Ask to write capital then small explicitly
    await say('اكتبوا الحرف بشكل كبير Capital.');
    await awaitAnswer(6000);
    await say('اكتبوه الآن بشكل صغير Small.');
    await awaitAnswer(6000);

    // 6) Post writing questions
    exclusive(() => this.ui.showLetter(this.letter));
    await say('ما هذا الحرف؟');
    const q1 = (await awaitAnswer(6000)).toUpperCase();
    await say('ما هو صوته؟');
    await awaitAnswer(6000);
    await say(`مين يعرف يكتب حرف ${this.letter}؟`);
    await awaitAnswer(6000);
    if (q1.includes(this.letter)) await say('أحسنت!'); else await say('حاول مرة أخرى.');

    if (!(await askReady())) await say('لنشاهد كلمات وصور تبدأ بهذا الحرف.');

    // 7) Words (+ AI images placeholder URLs via public services)
    const wordsWithImages = assets.words.map((w) => ({
      ...w,
      image: `https://source.unsplash.com/featured/400x300?${encodeURIComponent(w.word)}`
    }));
    exclusive(() => this.ui.showWords(wordsWithImages));
    await say(`دلوقتي هنتعرف على كلمات جديدة بتبدأ بحرف ${this.letter} ومعناها بالعربي.`);
    for (const word of assets.words) {
      await say(`كلمة ${word.word} يعني ${word.arabic}.`);
      await say(`بتنطق كده: ${this.letter} ${word.word}. جربوا تقولوا ${word.word}.`);
      await practiceRepeat({
        modelUtterance: `قولوا معي كلمة ${word.word}.`,
        repeatPrompt: `كرروا كلمة ${word.word}.`,
        validate: (answer) => answer.toLowerCase().includes(word.word.toLowerCase()),
        waitMs: 7000,
      });
    }
    await say(`مين يعرف كلمات تبدأ بحرف ${this.letter}؟`);
    const wAns = await awaitAnswer(7000);
    if (wAns) await say('أحسنت!'); else await say('حاول مرة أخرى.');

    // 8) Final quiz
    if (!(await askReady())) await say('جاهزين للاختبار النهائي؟');
    await say(`ما هو صوت حرف ${this.letter}؟`);
    await awaitAnswer(6000);
    exclusive(() => this.ui.showLetter(this.letter));
    await say('ما هذا الحرف؟');
    const f1 = (await awaitAnswer(6000)).toUpperCase();
    await say(`اذكر كلمة تبدأ بحرف ${this.letter}.`);
    await awaitAnswer(7000);
    if (f1.includes(this.letter)) await say('رائع!'); else await say('حاول مرة أخرى.');

    if (!(await askReady())) await say('حان وقت الأغنية!');
    // 9) Song
    exclusive(() => this.ui.showSong(assets.songUrl));
    await say(`هيا يا أطفالي لنستمع إلى أغنية لحرف ${this.letter}!`);

    // 10) Outro
    await say('ما هذا الحرف؟');
    await awaitAnswer(5000);
    await say('ما هو صوته؟');
    await awaitAnswer(5000);
    await say('اذكر كلمة تبدأ به.');
    await awaitAnswer(5000);
    await say('أحسنتم يا أطفالي! كنتم رائعين اليوم.');
  }
}


