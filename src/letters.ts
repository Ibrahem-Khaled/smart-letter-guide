export interface LetterAssets {
  capital: string;
  small: string;
  capitalImage?: string; // مسار صورة الحرف الكبير
  smallImage?: string;    // مسار صورة الحرف الصغير
  soundUrl?: string;
  words: { word: string; arabic: string; image?: string; customImage?: string }[]; // customImage للصور المرفوعة
  songUrl?: string;
}

export const LETTERS: Record<string, LetterAssets> = {
  A: {
    capital: 'A',
    small: 'a',
    soundUrl: undefined,
    words: [
      { word: 'Apple', arabic: 'تفاحة', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop' },
      { word: 'Ant', arabic: 'نملة', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop' },
    ],
    songUrl: 'https://www.youtube.com/embed/1dfXcN3VJxE'
  },
  B: {
    capital: 'B',
    small: 'b',
    words: [
      { word: 'Ball', arabic: 'كرة', image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop' },
      { word: 'Book', arabic: 'كتاب', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop' },
    ],
    songUrl: 'https://www.youtube.com/embed/lhgdG2rW5kk'
  },
  C: {
    capital: 'C',
    small: 'c',
    words: [
      { word: 'Cat', arabic: 'قطة', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop' },
      { word: 'Car', arabic: 'سيارة', image: 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=400&h=300&fit=crop' },
    ],
    songUrl: 'https://www.youtube.com/embed/QtJXl8h9JTI'
  },
  D: { capital: 'D', small: 'd', words: [ { word: 'Dog', arabic: 'كلب', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=300&fit=crop' }, { word: 'Door', arabic: 'باب', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' } ] },
  E: { capital: 'E', small: 'e', words: [ { word: 'Elephant', arabic: 'فيل', image: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&h=300&fit=crop' }, { word: 'Egg', arabic: 'بيضة', image: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d3?w=400&h=300&fit=crop' } ] },
  F: { capital: 'F', small: 'f', words: [ { word: 'Fish', arabic: 'سمكة', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop' }, { word: 'Flower', arabic: 'زهرة', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=300&fit=crop' } ] },
  G: { capital: 'G', small: 'g', words: [ { word: 'Giraffe', arabic: 'زرافة', image: 'https://images.unsplash.com/photo-1544966503-7cc4bb4b0b0b?w=400&h=300&fit=crop' }, { word: 'Guitar', arabic: 'جيتار', image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop' } ] },
  H: { capital: 'H', small: 'h', words: [ { word: 'Hat', arabic: 'قبعة', image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&h=300&fit=crop' }, { word: 'House', arabic: 'بيت', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop' } ] },
  I: { capital: 'I', small: 'i', words: [ { word: 'Ice', arabic: 'ثلج', image: 'https://images.unsplash.com/photo-1551524164-6cf2ac531d82?w=400&h=300&fit=crop' }, { word: 'Ice cream', arabic: 'آيس كريم', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop' } ] },
  J: { capital: 'J', small: 'j', words: [ { word: 'Juice', arabic: 'عصير', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop' }, { word: 'Jam', arabic: 'مربى', image: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=300&fit=crop' } ] },
  K: { capital: 'K', small: 'k', words: [ { word: 'Kite', arabic: 'طائرة ورقية', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop' }, { word: 'Key', arabic: 'مفتاح', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop' } ] },
  L: { capital: 'L', small: 'l', words: [ { word: 'Lion', arabic: 'أسد', image: 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=400&h=300&fit=crop' }, { word: 'Leaf', arabic: 'ورقة', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' } ] },
  M: { capital: 'M', small: 'm', words: [ { word: 'Monkey', arabic: 'قرد', image: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&h=300&fit=crop' }, { word: 'Moon', arabic: 'قمر', image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop' } ] },
  N: { capital: 'N', small: 'n', words: [ { word: 'Nest', arabic: 'عش', image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&h=300&fit=crop' }, { word: 'Nose', arabic: 'أنف', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop' } ] },
  O: { capital: 'O', small: 'o', words: [ { word: 'Orange', arabic: 'برتقال', image: 'https://images.unsplash.com/photo-1557800634-7bf3c73be389?w=400&h=300&fit=crop' }, { word: 'Owl', arabic: 'بومة', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop' } ] },
  P: { capital: 'P', small: 'p', words: [ { word: 'Pen', arabic: 'قلم', image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=300&fit=crop' }, { word: 'Pig', arabic: 'خنزير', image: 'https://images.unsplash.com/photo-1548550023-7b4a4b5b5b5b?w=400&h=300&fit=crop' } ] },
  Q: { capital: 'Q', small: 'q', words: [ { word: 'Queen', arabic: 'ملكة', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop' }, { word: 'Quiz', arabic: 'اختبار', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop' } ] },
  R: { capital: 'R', small: 'r', words: [ { word: 'Rabbit', arabic: 'أرنب', image: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&h=300&fit=crop' }, { word: 'Rain', arabic: 'مطر', image: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop' } ] },
  S: { capital: 'S', small: 's', words: [ { word: 'Sun', arabic: 'شمس', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' }, { word: 'Star', arabic: 'نجمة', image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop' } ] },
  T: { capital: 'T', small: 't', words: [ { word: 'Tiger', arabic: 'نمر', image: 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=400&h=300&fit=crop' }, { word: 'Tree', arabic: 'شجرة', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop' } ] },
  U: { capital: 'U', small: 'u', words: [ { word: 'Umbrella', arabic: 'مظلة', image: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop' }, { word: 'Unicorn', arabic: 'وحيد القرن', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop' } ] },
  V: { capital: 'V', small: 'v', words: [ { word: 'Van', arabic: 'سيارة نقل', image: 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=400&h=300&fit=crop' }, { word: 'Violin', arabic: 'كمان', image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop' } ] },
  W: { capital: 'W', small: 'w', words: [ { word: 'Water', arabic: 'ماء', image: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop' }, { word: 'Watch', arabic: 'ساعة يد', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop' } ] },
  X: { capital: 'X', small: 'x', words: [ { word: 'Xylophone', arabic: 'زيـلوفون', image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop' }, { word: 'X-ray', arabic: 'أشعة سينية', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop' } ] },
  Y: { capital: 'Y', small: 'y', words: [ { word: 'Yogurt', arabic: 'زبادي', image: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=300&fit=crop' }, { word: 'Yellow', arabic: 'أصفر', image: 'https://images.unsplash.com/photo-1557800634-7bf3c73be389?w=400&h=300&fit=crop' } ] },
  Z: { capital: 'Z', small: 'z', words: [ { word: 'Zebra', arabic: 'حمار وحشي', image: 'https://images.unsplash.com/photo-1544966503-7cc4bb4b0b0b?w=400&h=300&fit=crop' }, { word: 'Zoo', arabic: 'حديقة حيوان', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop' } ] },
};


