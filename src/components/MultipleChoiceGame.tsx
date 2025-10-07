import React, { useState } from 'react';
import './MultipleChoiceGame.css';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  image?: string;
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

  // Generate questions based on target letter
  const generateQuestions = (): Question[] => {
    const letterQuestions: Question[] = [
      {
        id: 1,
        question: `أي من هذه الكلمات تبدأ بحرف ${targetLetter}؟`,
        options: [
          targetLetter === 'A' ? 'Apple' : 'Ball',
          targetLetter === 'B' ? 'Ball' : 'Cat',
          targetLetter === 'C' ? 'Cat' : 'Dog',
          targetLetter === 'D' ? 'Dog' : 'Elephant'
        ],
        correctAnswer: 0
      },
      {
        id: 2,
        question: `ما هو شكل حرف ${targetLetter} الصغير؟`,
        options: [
          targetLetter.toLowerCase(),
          targetLetter.toUpperCase(),
          targetLetter === 'A' ? 'a' : targetLetter === 'B' ? 'b' : 'c',
          targetLetter === 'A' ? 'A' : targetLetter === 'B' ? 'B' : 'C'
        ],
        correctAnswer: 0
      },
      {
        id: 3,
        question: `كم مرة يظهر حرف ${targetLetter} في كلمة "${targetLetter}${targetLetter}${targetLetter}"؟`,
        options: ['1', '2', '3', '4'],
        correctAnswer: 2
      },
      {
        id: 4,
        question: `أي من هذه الأشياء تبدأ بحرف ${targetLetter}؟`,
        options: [
          targetLetter === 'A' ? 'تفاحة' : targetLetter === 'B' ? 'كرة' : 'قط',
          targetLetter === 'A' ? 'موز' : targetLetter === 'B' ? 'تفاحة' : 'كلب',
          targetLetter === 'A' ? 'برتقال' : targetLetter === 'B' ? 'موز' : 'فيل',
          targetLetter === 'A' ? 'عنب' : targetLetter === 'B' ? 'برتقال' : 'أسد'
        ],
        correctAnswer: 0
      },
      {
        id: 5,
        question: `ما هو ترتيب حرف ${targetLetter} في الأبجدية الإنجليزية؟`,
        options: [
          String(targetLetter.charCodeAt(0) - 64),
          String(targetLetter.charCodeAt(0) - 63),
          String(targetLetter.charCodeAt(0) - 65),
          String(targetLetter.charCodeAt(0) - 62)
        ],
        correctAnswer: 2
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

  // Move to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
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

            {showResult && (
              <div className="result-feedback">
                {selectedAnswer === currentQuestion.correctAnswer ? (
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
