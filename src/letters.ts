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
      { word: 'Airplane', arabic: 'طائرة' },
      { word: 'Arm', arabic: 'ذراع' },
      { word: 'Arrow', arabic: 'سهم' },
    ],
    songUrl: 'https://www.youtube.com/embed/1dfXcN3VJxE'
  },
  B: {
    capital: 'B',
    small: 'b',
    words: [
      { word: 'Ball', arabic: 'كرة' },
      { word: 'Book', arabic: 'كتاب' },
      { word: 'Bird', arabic: 'طائر' },
      { word: 'Bear', arabic: 'دب' },
      { word: 'Butterfly', arabic: 'فراشة' },
    ],
    songUrl: 'https://www.youtube.com/embed/lhgdG2rW5kk'
  },
  C: {
    capital: 'C',
    small: 'c',
    words: [
      { word: 'Cat', arabic: 'قطة' },
      { word: 'Car', arabic: 'سيارة' },
      { word: 'Cake', arabic: 'كعكة' },
      { word: 'Cloud', arabic: 'سحابة' },
      { word: 'Clock', arabic: 'ساعة' },
    ],
    songUrl: 'https://www.youtube.com/embed/QtJXl8h9JTI'
  },
  D: { capital: 'D', small: 'd', words: [ { word: 'Dog', arabic: 'كلب' }, { word: 'Door', arabic: 'باب' }, { word: 'Duck', arabic: 'بطة' }, { word: 'Doll', arabic: 'دمية' }, { word: 'Drum', arabic: 'طبل' } ] },
  E: { capital: 'E', small: 'e', words: [ { word: 'Elephant', arabic: 'فيل' }, { word: 'Egg', arabic: 'بيضة' }, { word: 'Eagle', arabic: 'نسر' }, { word: 'Ear', arabic: 'أذن' }, { word: 'Eye', arabic: 'عين' } ] },
  F: { capital: 'F', small: 'f', words: [ { word: 'Fish', arabic: 'سمكة' }, { word: 'Flower', arabic: 'زهرة' }, { word: 'Fox', arabic: 'ثعلب' }, { word: 'Frog', arabic: 'ضفدع' }, { word: 'Fire', arabic: 'نار' } ] },
  G: { capital: 'G', small: 'g', words: [ { word: 'Giraffe', arabic: 'زرافة' }, { word: 'Guitar', arabic: 'جيتار' }, { word: 'Garden', arabic: 'حديقة' }, { word: 'Gift', arabic: 'هدية' }, { word: 'Glass', arabic: 'زجاج' } ] },
  H: { capital: 'H', small: 'h', words: [ { word: 'Hat', arabic: 'قبعة' }, { word: 'House', arabic: 'بيت' }, { word: 'Horse', arabic: 'حصان' }, { word: 'Heart', arabic: 'قلب' }, { word: 'Hand', arabic: 'يد' } ] },
  I: { capital: 'I', small: 'i', words: [ { word: 'Ice', arabic: 'ثلج' }, { word: 'Insect', arabic: 'حشرة' }, { word: 'Ice cream', arabic: 'آيس كريم' }, { word: 'Island', arabic: 'جزيرة' }, { word: 'Iron', arabic: 'حديد' } ] },
  J: { capital: 'J', small: 'j', words: [ { word: 'Juice', arabic: 'عصير' }, { word: 'Jam', arabic: 'مربى' }, { word: 'Jelly', arabic: 'جيلي' }, { word: 'Jacket', arabic: 'سترة' }, { word: 'Jump', arabic: 'قفزة' } ] },
  K: { capital: 'K', small: 'k', words: [ { word: 'Kite', arabic: 'طائرة ورقية' }, { word: 'Key', arabic: 'مفتاح' }, { word: 'Kangaroo', arabic: 'كنغر' }, { word: 'King', arabic: 'ملك' }, { word: 'Kitchen', arabic: 'مطبخ' } ] },
  L: { capital: 'L', small: 'l', words: [ { word: 'Lion', arabic: 'أسد' }, { word: 'Leaf', arabic: 'ورقة' }, { word: 'Lamp', arabic: 'مصباح' }, { word: 'Lemon', arabic: 'ليمون' }, { word: 'Ladder', arabic: 'سلم' } ] },
  M: { capital: 'M', small: 'm', words: [ { word: 'Monkey', arabic: 'قرد' }, { word: 'Moon', arabic: 'قمر' }, { word: 'Mouse', arabic: 'فأر' }, { word: 'Milk', arabic: 'حليب' }, { word: 'Mountain', arabic: 'جبل' } ] },
  N: { capital: 'N', small: 'n', words: [ { word: 'Nest', arabic: 'عش' }, { word: 'Nose', arabic: 'أنف' }, { word: 'Net', arabic: 'شبكة' }, { word: 'Nut', arabic: 'جوز' }, { word: 'Night', arabic: 'ليل' } ] },
  O: { capital: 'O', small: 'o', words: [ { word: 'Orange', arabic: 'برتقال' }, { word: 'Owl', arabic: 'بومة' }, { word: 'Octopus', arabic: 'أخطبوط' }, { word: 'Ocean', arabic: 'محيط' }, { word: 'Onion', arabic: 'بصل' } ] },
  P: { capital: 'P', small: 'p', words: [ { word: 'Pen', arabic: 'قلم' }, { word: 'Pig', arabic: 'خنزير' }, { word: 'Pizza', arabic: 'بيتزا' }, { word: 'Piano', arabic: 'بيانو' }, { word: 'Pencil', arabic: 'قلم رصاص' } ] },
  Q: { capital: 'Q', small: 'q', words: [ { word: 'Queen', arabic: 'ملكة' }, { word: 'Quiz', arabic: 'اختبار' }, { word: 'Quilt', arabic: 'لحاف' }, { word: 'Quail', arabic: 'سمان' }, { word: 'Question', arabic: 'سؤال' } ] },
  R: { capital: 'R', small: 'r', words: [ { word: 'Rabbit', arabic: 'أرنب' }, { word: 'Rain', arabic: 'مطر' }, { word: 'Rose', arabic: 'وردة' }, { word: 'Robot', arabic: 'روبوت' }, { word: 'Rocket', arabic: 'صاروخ' } ] },
  S: { capital: 'S', small: 's', words: [ { word: 'Sun', arabic: 'شمس' }, { word: 'Star', arabic: 'نجمة' }, { word: 'Snake', arabic: 'ثعبان' }, { word: 'Spoon', arabic: 'ملعقة' }, { word: 'Sock', arabic: 'جورب' } ] },
  T: { capital: 'T', small: 't', words: [ { word: 'Tiger', arabic: 'نمر' }, { word: 'Tree', arabic: 'شجرة' }, { word: 'Table', arabic: 'طاولة' }, { word: 'Train', arabic: 'قطار' }, { word: 'Toy', arabic: 'لعبة' } ] },
  U: { capital: 'U', small: 'u', words: [ { word: 'Umbrella', arabic: 'مظلة' }, { word: 'Unicorn', arabic: 'وحيد القرن' }, { word: 'Uniform', arabic: 'زي موحد' }, { word: 'Up', arabic: 'أعلى' }, { word: 'Under', arabic: 'تحت' } ] },
  V: { capital: 'V', small: 'v', words: [ { word: 'Van', arabic: 'سيارة نقل' }, { word: 'Violin', arabic: 'كمان' }, { word: 'Vase', arabic: 'مزهرية' }, { word: 'Vegetable', arabic: 'خضار' }, { word: 'Vacuum', arabic: 'مكنسة كهربائية' } ] },
  W: { capital: 'W', small: 'w', words: [ { word: 'Water', arabic: 'ماء' }, { word: 'Watch', arabic: 'ساعة يد' }, { word: 'Window', arabic: 'نافذة' }, { word: 'Wheel', arabic: 'عجلة' }, { word: 'Whale', arabic: 'حوت' } ] },
  X: { capital: 'X', small: 'x', words: [ { word: 'Xylophone', arabic: 'زيـلوفون' }, { word: 'X-ray', arabic: 'أشعة سينية' }, { word: 'Box', arabic: 'صندوق' }, { word: 'Fox', arabic: 'ثعلب' }, { word: 'Six', arabic: 'ستة' } ] },
  Y: { capital: 'Y', small: 'y', words: [ { word: 'Yogurt', arabic: 'زبادي' }, { word: 'Yacht', arabic: 'يخت' }, { word: 'Yellow', arabic: 'أصفر' }, { word: 'Yo-yo', arabic: 'يو يو' }, { word: 'Year', arabic: 'سنة' } ] },
  Z: { capital: 'Z', small: 'z', words: [ { word: 'Zebra', arabic: 'حمار وحشي' }, { word: 'Zoo', arabic: 'حديقة حيوان' }, { word: 'Zipper', arabic: 'سحاب' }, { word: 'Zero', arabic: 'صفر' }, { word: 'Zigzag', arabic: 'متعرج' } ] },
};


