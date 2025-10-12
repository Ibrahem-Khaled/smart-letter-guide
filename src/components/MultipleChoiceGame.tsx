import React, { useMemo, useState } from 'react';
import './MultipleChoiceGame.css';
import { LETTERS } from '../letters';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1505482692512-d6d588f0e3e0?w=200&h=200&fit=crop&auto=format';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  image?: string;
  type: 'text' | 'image' | 'writing';
  images?: string[];
}

interface MultipleChoiceGameProps {
  targetLetter: string;
  onGameComplete: () => void;
}

export const MultipleChoiceGame: React.FC<MultipleChoiceGameProps> = ({ targetLetter, onGameComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [isWritingCorrect, setIsWritingCorrect] = useState(false);

  const imageQuestion = useMemo(() => {
    const uppercaseLetter = targetLetter.toUpperCase();
    const letterData = LETTERS[uppercaseLetter];

    const availableWords = Object.entries(LETTERS)
      .flatMap(([letterKey, data]) =>
        data.words.slice(0, 3).map(word => ({
          letterKey,
          label: word.arabic,
          image: word.customImage || word.image,
        }))
      )
      .filter(word => word.image);

    const correctWord = letterData?.words.find(word => word.customImage || word.image);

    if (!correctWord || (!correctWord.image && !correctWord.customImage)) {
      return {
        options: ['تفاحة', 'قطة', 'موزة', 'شمس'],
        images: [
          'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1505482692512-d6d588f0e3e0?w=200&h=200&fit=crop'
        ],
        correctAnswer: 0,
      };
    }

    const distractors = availableWords
      .filter(word => word.letterKey !== uppercaseLetter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const correctImage = correctWord.customImage || correctWord.image;

    const fallbackDistractors = [
      { label: 'تفاحة', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&h=200&fit=crop' },
      { label: 'قطة', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop' },
      { label: 'موزة', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop' },
      { label: 'شمس', image: 'https://images.unsplash.com/photo-1505482692512-d6d588f0e3e0?w=200&h=200&fit=crop' }
    ];

    const usedLabels = new Set([correctWord.arabic, ...distractors.map(word => word.label)]);

    while (distractors.length < 3) {
      const nextFallback = fallbackDistractors.find(item => !usedLabels.has(item.label));
      if (!nextFallback) break;
      distractors.push({ letterKey: 'fallback', label: nextFallback.label, image: nextFallback.image });
      usedLabels.add(nextFallback.label);
    }

    const combined = [
      { label: correctWord.arabic, image: correctImage ?? FALLBACK_IMAGE, isCorrect: true },
      ...distractors.slice(0, 3).map(word => ({ label: word.label, image: word.image ?? FALLBACK_IMAGE, isCorrect: false })),
    ].sort(() => Math.random() - 0.5);

    const options = combined.map(item => item.label);
    const images = combined.map(item => item.image);
    const correctAnswer = combined.findIndex(item => item.isCorrect);

    return { options, images, correctAnswer };
  }, [targetLetter]);

  // Generate questions based on target letter
  const generateQuestions = (): Question[] => {
    const letterQuestions: Question[] = [
      {
        id: 1,
        question: `اختر الصورة التي تبدأ بحرف ${targetLetter}`,
        type: 'image',
        options: imageQuestion.options,
        images: imageQuestion.images,
        correctAnswer: imageQuestion.correctAnswer
      },
      {
        id: 2,
        question: `اضغط على الحرف الصغير لحرف ${targetLetter}`,
        type: 'text',
        options: [
          targetLetter.toLowerCase(),
          'd',
          'e', 
          'n'
        ],
        correctAnswer: 0
      },
      {
        id: 3,
        question: `اختر الحرف الذي تعلمناه اليوم`,
        type: 'text',
        options: [
          `${targetLetter}${targetLetter.toLowerCase()}`,
          'Bb',
          'Cc',
          'Dd'
        ],
        correctAnswer: 0
      },
      {
        id: 4,
        question: `اختر الحرف الكبير لحرف ${targetLetter.toLowerCase()}`,
        type: 'text',
        options: [
          'S',
          'D',
          'M',
          targetLetter.toUpperCase()
        ],
        correctAnswer: 3
      },
      {
        id: 5,
        question: `اكتب الحرف الذي تعلمناه اليوم`,
        type: 'writing',
        options: [],
        correctAnswer: 0
      }
    ];

    return letterQuestions;
  };

  // Start game
  const startGame = () => {
    const generatedQuestions = generateQuestions();
    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameEnded(false);
    setGameStarted(true);
    setWrittenAnswer('');
    setIsWritingCorrect(false);
  };

  // Handle answer selection
  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    if (answerIndex === questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 10);
    }
  };

  // Handle writing answer
  const handleWritingAnswer = () => {
    if (showResult) return;
    
    const correctAnswer = `${targetLetter}${targetLetter.toLowerCase()}`;
    const isCorrect = writtenAnswer.toLowerCase() === correctAnswer.toLowerCase() || 
                     writtenAnswer.toLowerCase() === targetLetter.toLowerCase() ||
                     writtenAnswer.toLowerCase() === targetLetter.toUpperCase().toLowerCase();
    
    setIsWritingCorrect(isCorrect);
    setShowResult(true);
    
    if (isCorrect) {
      setScore(prev => prev + 10);
    }
  };

  // Move to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setWrittenAnswer('');
      setIsWritingCorrect(false);
    } else {
      setGameEnded(true);
      setGameStarted(false);
    }
  };

  // Get option class
  const getOptionClass = (index: number) => {
    if (!showResult) return 'option';
    
    if (index === questions[currentQuestionIndex].correctAnswer) {
      return 'option correct';
    } else if (index === selectedAnswer && index !== questions[currentQuestionIndex].correctAnswer) {
      return 'option incorrect';
    }
    
    return 'option disabled';
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="multiple-choice-game">
      <div className="game-header">
        <h3>🎯 لعبة الاختيارات - حرف {targetLetter}</h3>
        <p>اختر الإجابة الصحيحة لكل سؤال</p>
      </div>

      {!gameStarted && !gameEnded && (
        <div className="game-start">
          <button className="start-game-btn" onClick={startGame}>
            🎮 ابدأ اللعبة
          </button>
        </div>
      )}

      {gameStarted && currentQuestion && (
        <div className="game-content">
          <div className="game-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              السؤال {currentQuestionIndex + 1} من {questions.length}
            </div>
          </div>

          <div className="score-display">
            النقاط: <span className="score-value">{score}</span>
          </div>

          <div className="question-container">
            <h4 className="question-text">{currentQuestion.question}</h4>
            
            {currentQuestion.type === 'image' && (
              <div className="image-options-container">
                {currentQuestion.images?.map((image, index) => (
                  <button
                    key={index}
                    className={getOptionClass(index)}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                  >
                    <img src={image} alt={currentQuestion.options[index]} className="option-image" />
                    <span className="option-text">{currentQuestion.options[index]}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <div className="options-container">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className={getOptionClass(index)}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="option-text">{option}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'writing' && (
              <div className="writing-container">
                <div className="writing-input-container">
                  <input
                    type="text"
                    value={writtenAnswer}
                    onChange={(e) => setWrittenAnswer(e.target.value)}
                    placeholder="اكتب الحرف هنا..."
                    className="writing-input"
                    disabled={showResult}
                  />
                  <button 
                    className="submit-writing-btn"
                    onClick={handleWritingAnswer}
                    disabled={showResult || !writtenAnswer.trim()}
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            )}

            {showResult && (
              <div className="result-feedback">
                {currentQuestion.type === 'writing' ? (
                  isWritingCorrect ? (
                    <div className="feedback correct">
                      <span className="feedback-icon">✅</span>
                      <span className="feedback-text">إجابة صحيحة! أحسنت!</span>
                    </div>
                  ) : (
                    <div className="feedback incorrect">
                      <span className="feedback-icon">❌</span>
                      <span className="feedback-text">
                        إجابة خاطئة. الإجابة الصحيحة هي: {targetLetter}
                      </span>
                    </div>
                  )
                ) : (
                  selectedAnswer === currentQuestion.correctAnswer ? (
                    <div className="feedback correct">
                      <span className="feedback-icon">✅</span>
                      <span className="feedback-text">إجابة صحيحة! أحسنت!</span>
                    </div>
                  ) : (
                    <div className="feedback incorrect">
                      <span className="feedback-icon">❌</span>
                      <span className="feedback-text">
                        إجابة خاطئة. الإجابة الصحيحة هي: {currentQuestion.options[currentQuestion.correctAnswer]}
                      </span>
                    </div>
                  )
                )}
                
                <button className="next-question-btn" onClick={nextQuestion}>
                  {currentQuestionIndex < questions.length - 1 ? 'السؤال التالي' : 'انهي اللعبة'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {gameEnded && (
        <div className="game-end">
          <div className="final-score">
            <h4>انتهت اللعبة!</h4>
            <div className="score-summary">
              <p>إجمالي النقاط: <span className="score-highlight">{score}</span></p>
              <p>من أصل: <span className="total-points">{questions.length * 10}</span> نقطة</p>
              <div className="percentage">
                النسبة: <span className="percentage-value">
                  {Math.round((score / (questions.length * 10)) * 100)}%
                </span>
              </div>
            </div>
            
            <div className="game-actions">
              <button className="play-again-btn" onClick={startGame}>
                🔄 العب مرة أخرى
              </button>
              <button className="finish-game-btn" onClick={onGameComplete}>
                🎮 العودة لاختيار الألعاب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
