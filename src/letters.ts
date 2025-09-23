export interface LetterAssets {
  capital: string;
  small: string;
  soundUrl?: string;
  words: { word: string; arabic: string; image?: string }[];
  songUrl?: string;
}

export const LETTERS: Record<string, LetterAssets> = {
  A: {
    capital: 'A',
    small: 'a',
    soundUrl: undefined,
    words: [
      { word: 'Apple', arabic: 'تفاحة' },
      { word: 'Ant', arabic: 'نملة' },
    ],
    songUrl: 'https://www.youtube.com/embed/1dfXcN3VJxE'
  },
  B: {
    capital: 'B',
    small: 'b',
    words: [
      { word: 'Ball', arabic: 'كرة' },
      { word: 'Book', arabic: 'كتاب' },
    ],
    songUrl: 'https://www.youtube.com/embed/lhgdG2rW5kk'
  },
  C: {
    capital: 'C',
    small: 'c',
    words: [
      { word: 'Cat', arabic: 'قطة' },
      { word: 'Car', arabic: 'سيارة' },
    ],
    songUrl: 'https://www.youtube.com/embed/QtJXl8h9JTI'
  },
  D: { capital: 'D', small: 'd', words: [ { word: 'Dog', arabic: 'كلب' }, { word: 'Door', arabic: 'باب' } ] },
  E: { capital: 'E', small: 'e', words: [ { word: 'Elephant', arabic: 'فيل' }, { word: 'Egg', arabic: 'بيضة' } ] },
  F: { capital: 'F', small: 'f', words: [ { word: 'Fish', arabic: 'سمكة' }, { word: 'Flower', arabic: 'زهرة' } ] },
  G: { capital: 'G', small: 'g', words: [ { word: 'Giraffe', arabic: 'زرافة' }, { word: 'Guitar', arabic: 'جيتار' } ] },
  H: { capital: 'H', small: 'h', words: [ { word: 'Hat', arabic: 'قبعة' }, { word: 'House', arabic: 'بيت' } ] },
  I: { capital: 'I', small: 'i', words: [ { word: 'Ice', arabic: 'ثلج' }, { word: 'Insect', arabic: 'حشرة' } ] },
  J: { capital: 'J', small: 'j', words: [ { word: 'Juice', arabic: 'عصير' }, { word: 'Jam', arabic: 'مربى' } ] },
  K: { capital: 'K', small: 'k', words: [ { word: 'Kite', arabic: 'طائرة ورقية' }, { word: 'Key', arabic: 'مفتاح' } ] },
  L: { capital: 'L', small: 'l', words: [ { word: 'Lion', arabic: 'أسد' }, { word: 'Leaf', arabic: 'ورقة' } ] },
  M: { capital: 'M', small: 'm', words: [ { word: 'Monkey', arabic: 'قرد' }, { word: 'Moon', arabic: 'قمر' } ] },
  N: { capital: 'N', small: 'n', words: [ { word: 'Nest', arabic: 'عش' }, { word: 'Nose', arabic: 'أنف' } ] },
  O: { capital: 'O', small: 'o', words: [ { word: 'Orange', arabic: 'برتقال' }, { word: 'Owl', arabic: 'بومة' } ] },
  P: { capital: 'P', small: 'p', words: [ { word: 'Pen', arabic: 'قلم' }, { word: 'Pig', arabic: 'خنزير' } ] },
  Q: { capital: 'Q', small: 'q', words: [ { word: 'Queen', arabic: 'ملكة' }, { word: 'Quiz', arabic: 'اختبار' } ] },
  R: { capital: 'R', small: 'r', words: [ { word: 'Rabbit', arabic: 'أرنب' }, { word: 'Rain', arabic: 'مطر' } ] },
  S: { capital: 'S', small: 's', words: [ { word: 'Sun', arabic: 'شمس' }, { word: 'Star', arabic: 'نجمة' } ] },
  T: { capital: 'T', small: 't', words: [ { word: 'Tiger', arabic: 'نمر' }, { word: 'Tree', arabic: 'شجرة' } ] },
  U: { capital: 'U', small: 'u', words: [ { word: 'Umbrella', arabic: 'مظلة' }, { word: 'Unicorn', arabic: 'وحيد القرن' } ] },
  V: { capital: 'V', small: 'v', words: [ { word: 'Van', arabic: 'سيارة نقل' }, { word: 'Violin', arabic: 'كمان' } ] },
  W: { capital: 'W', small: 'w', words: [ { word: 'Water', arabic: 'ماء' }, { word: 'Watch', arabic: 'ساعة يد' } ] },
  X: { capital: 'X', small: 'x', words: [ { word: 'Xylophone', arabic: 'زيـلوفون' }, { word: 'X-ray', arabic: 'أشعة سينية' } ] },
  Y: { capital: 'Y', small: 'y', words: [ { word: 'Yogurt', arabic: 'زبادي' }, { word: 'Yacht', arabic: 'يخت' } ] },
  Z: { capital: 'Z', small: 'z', words: [ { word: 'Zebra', arabic: 'حمار وحشي' }, { word: 'Zoo', arabic: 'حديقة حيوان' } ] },
};


