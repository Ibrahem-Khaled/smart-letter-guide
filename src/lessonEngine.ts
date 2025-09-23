import { VoiceSdkClient } from './voiceSdkClient';
import { LETTERS } from './letters';
import { speakLocal, listenOnceLocal } from './speech';

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
    const say = async (text: string) => {
      try { await this.client.speak(text); } catch { await speakLocal(text); }
    };
    const awaitAnswer = async (ms: number) => {
      const sdk = await this.client.awaitUserSpeech(ms);
      if (sdk && sdk.trim()) return sdk.trim();
      return await listenOnceLocal(ms);
    };
    const exclusive = (fn: () => void) => { this.ui.clearVisuals(); fn(); };
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
    await say('مرحبًا يا أطفالي! أنا الروبوت كذا.');
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
    await say(`تعرفوا يا أطفالي أن حرف ${this.letter} له صوت مميز؟`);
    if (assets.soundUrl) {
      await say('استمعوا جيدًا لصوت الحرف.');
    } else {
      await say(`صوته مثل: ${this.letter}`);
    }
    await practiceRepeat({
      modelUtterance: assets.soundUrl ? 'ركزوا على الصوت واستعدوا للإعادة.' : `${this.letter}`,
      repeatPrompt: 'قل الصوت الآن.',
      validate: (answer) => answer.toUpperCase().includes(this.letter),
      waitMs: 6000,
    });
    await say('أحسنتم يا أطفالي!');

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

    // 4) Capital vs Small
    exclusive(() => this.ui.showBoth(this.letter, assets.capital, assets.small));
    for (let i = 0; i < 5; i++) {
      await say(`هذا اسمه ${this.letter} Capital يعني كبير.`);
    }
    await say('رددوا معي.');
    await awaitAnswer(6000);
    for (let i = 0; i < 5; i++) {
      await say(`وهذا اسمه ${this.letter} Small يعني صغير.`);
    }
    await say('رددوا معي.');
    await awaitAnswer(6000);
    await say('مين يعرف يقولها لوحده؟');
    const csAns = await awaitAnswer(6000);
    if (/(capital|كابيتال|كبير)/i.test(csAns) && /(small|صمول|صغير)/i.test(csAns)) {
      await say('أحسنت!');
    } else {
      await say('حاول مرة أخرى.');
    }

    // 5) Writing
    exclusive(() => this.ui.showBlackboard(this.letter));
    await say(`الآن سنرسم حرف ${this.letter} معاً.`);
    await say('اتبعوا الرسم على السبورة بأصابعكم في الهواء.');
    await say('ممتاز! من سيكتب الحرف على السبورة؟');
    await awaitAnswer(6000);
    await say('والآن اكتبوه وحدكم على السبورة الخالية.');
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

    // 7) Words
    exclusive(() => this.ui.showWords(assets.words));
    await say(`كلمة ${assets.words[0].word} تعني ${assets.words[0].arabic}.`);
    await say(`وكلمة ${assets.words[1].word} تعني ${assets.words[1].arabic}.`);
    await say(`${this.letter} ${assets.words[0].word} ${assets.words[0].arabic}`);
    await say(`${this.letter} ${assets.words[1].word} ${assets.words[1].arabic}`);
    for (const word of assets.words) {
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
    await say(`ما هو صوت حرف ${this.letter}؟`);
    await awaitAnswer(6000);
    exclusive(() => this.ui.showLetter(this.letter));
    await say('ما هذا الحرف؟');
    const f1 = (await awaitAnswer(6000)).toUpperCase();
    await say(`اذكر كلمة تبدأ بحرف ${this.letter}.`);
    await awaitAnswer(7000);
    if (f1.includes(this.letter)) await say('رائع!'); else await say('حاول مرة أخرى.');

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


