import React, { useState, useEffect, useRef } from 'react';
import './BalloonsGame.css';

interface Balloon {
  id: number;
  letter: string;
  x: number;
  y: number;
  color: string;
  popped: boolean;
}

interface BalloonsGameProps {
  targetLetter: string;
  onGameComplete: () => void;
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

export const BalloonsGame: React.FC<BalloonsGameProps> = ({ targetLetter, onGameComplete }) => {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [balloonsPopped, setBalloonsPopped] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const balloonIdCounter = useRef(0);

  // Generate a single random balloon
  const generateRandomBalloon = (): Balloon => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    
    return {
      id: balloonIdCounter.current++,
      letter: randomLetter,
      x: Math.random() * 80 + 10, // 10-90% of container width
      y: 100, // Start from bottom
      color: colors[Math.floor(Math.random() * colors.length)],
      popped: false
    };
  };

  // Add new balloon
  const addNewBalloon = () => {
    if (gameStarted && !gameEnded) {
      const newBalloon = generateRandomBalloon();
      setBalloons(prev => [...prev, newBalloon]);
    }
  };

  // Move balloons upward
  const moveBalloons = () => {
    setBalloons(prev => prev.map(balloon => ({
      ...balloon,
      y: balloon.y - 2 // Move up by 2 pixels
    })).filter(balloon => balloon.y > -10)); // Remove balloons that are off-screen
  };

  // Pop balloon
  const popBalloon = (balloonId: number) => {
    setBalloons(prev => prev.map(balloon => {
      if (balloon.id === balloonId && !balloon.popped) {
        if (balloon.letter === targetLetter) {
          setScore(prev => prev + 10);
          setBalloonsPopped(prev => prev + 1);
        } else {
          // Wrong balloon - lose a life
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameEnded(true);
              setGameStarted(false);
            }
            return newLives;
          });
        }
        return { ...balloon, popped: true };
      }
      return balloon;
    }));
  };

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setScore(0);
    setLives(3);
    setGameEnded(false);
    setBalloonsPopped(0);
    setTimeLeft(60);
    setBalloons([]);
    balloonIdCounter.current = 0;
  };

  // Game timer
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameStarted && timeLeft === 0) {
      // Time's up - end game
      setGameEnded(true);
      setGameStarted(false);
    }
  }, [gameStarted, timeLeft]);

  // Balloon generation and movement
  useEffect(() => {
    if (gameStarted && !gameEnded) {
      // Add new balloon every 1.5 seconds
      const balloonInterval = setInterval(addNewBalloon, 1500);
      
      // Move balloons every 50ms
      const movementInterval = setInterval(moveBalloons, 50);
      
      return () => {
        clearInterval(balloonInterval);
        clearInterval(movementInterval);
      };
    }
  }, [gameStarted, gameEnded]);

  // Check if lives are lost
  useEffect(() => {
    if (lives <= 0 && gameStarted) {
      setGameEnded(true);
      setGameStarted(false);
    }
  }, [lives, gameStarted]);

  return (
    <div className="balloons-game">
      <div className="game-header">
        <h3>🎈 لعبة البالونات - حرف {targetLetter}</h3>
        <p>انقر على البالونات التي تحتوي على حرف {targetLetter}</p>
        <p className="lives-info">الأرواح المتبقية: {lives}</p>
      </div>

      {!gameStarted && !gameEnded && (
        <div className="game-start">
          <button className="start-game-btn" onClick={startGame}>
            🎮 ابدأ اللعبة
          </button>
        </div>
      )}

      {gameStarted && (
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">النقاط:</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">الوقت:</span>
            <span className="stat-value">{timeLeft}</span>
          </div>
          <div className="stat">
            <span className="stat-label">الأرواح:</span>
            <span className="stat-value lives-value">{lives}</span>
          </div>
          <div className="stat">
            <span className="stat-label">البالونات المفرقعة:</span>
            <span className="stat-value">{balloonsPopped}</span>
          </div>
        </div>
      )}

      {gameStarted && (
        <div className="game-area" ref={gameAreaRef}>
          {balloons.map(balloon => (
            <div
              key={balloon.id}
              className={`balloon ${balloon.popped ? 'popped' : ''}`}
              style={{
                left: `${balloon.x}%`,
                top: `${balloon.y}%`,
                backgroundColor: balloon.color,
                animationDelay: `${balloon.id * 0.1}s`
              }}
              onClick={() => !balloon.popped && popBalloon(balloon.id)}
            >
              <span className="balloon-letter">{balloon.letter}</span>
            </div>
          ))}
        </div>
      )}

      {gameEnded && (
        <div className="game-end">
          <div className="final-score">
            <h4>{lives > 0 && timeLeft === 0 ? '🎉 انتهى الوقت!' : lives <= 0 ? '💔 انتهت الأرواح!' : '🎉 انتهت اللعبة!'}</h4>
            <div className="game-result">
              {lives > 0 && timeLeft === 0 ? (
                <p>انتهى الوقت! لقد فرقعت {balloonsPopped} بالون صحيح!</p>
              ) : lives <= 0 ? (
                <p>انتهت أرواحك الثلاثة. حاول مرة أخرى!</p>
              ) : (
                <p>ممتاز! لقد فرقعت {balloonsPopped} بالون صحيح!</p>
              )}
            </div>
            <div className="final-stats">
              <p>إجمالي النقاط: <span className="score-highlight">{score}</span></p>
              <p>البالونات المفرقعة: <span className="score-highlight">{balloonsPopped}</span></p>
              <p>الأرواح المتبقية: <span className="score-highlight">{lives}</span></p>
              <p>الوقت المتبقي: <span className="score-highlight">{timeLeft}</span> ثانية</p>
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
