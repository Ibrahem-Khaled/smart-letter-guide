import React, { useState, useEffect, useRef } from 'react';
import './BalloonsGame.css';

interface Balloon {
  id: number;
  letter: string;
  x: number;
  y: number;
  color: string;
  popped: boolean;
  particles?: Array<{ id: number; x: number; y: number; vx: number; vy: number; life: number; }>;
}

interface BalloonsGameProps {
  targetLetter: string;
  onGameComplete: () => void;
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
const TARGET_LETTER_PROBABILITY = 0.6;

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

  const normalizedTargetLetter = targetLetter.toUpperCase();

  // Generate a single random balloon
  const generateRandomBalloon = (forceTarget = false): Balloon => {
    const allCapitalLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(letter => letter !== normalizedTargetLetter);
    const allSmallLetters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(letter => letter !== normalizedTargetLetter.toLowerCase());
    
    // Combine both capital and small letters
    const allLetters = [...allCapitalLetters, ...allSmallLetters];
    
    const shouldUseTarget = forceTarget || Math.random() < TARGET_LETTER_PROBABILITY;
    const letter = shouldUseTarget
      ? (Math.random() < 0.5 ? normalizedTargetLetter : normalizedTargetLetter.toLowerCase())
      : allLetters[Math.floor(Math.random() * allLetters.length)] ?? normalizedTargetLetter;

    return {
      id: balloonIdCounter.current++,
      letter,
      x: Math.random() * 80 + 10, // 10-90% of container width
      y: 100, // Start from bottom
      color: colors[Math.floor(Math.random() * colors.length)],
      popped: false
    };
  };

  // Add new balloon
  const addNewBalloon = () => {
    if (!gameStarted || gameEnded) {
      return;
    }

    setBalloons(prev => {
      const activeTargets = prev.filter(balloon => 
        !balloon.popped && 
        (balloon.letter === normalizedTargetLetter || balloon.letter === normalizedTargetLetter.toLowerCase())
      ).length;

      const nextBalloons = prev.filter(balloon => !balloon.popped || (balloon.particles && balloon.particles.length > 0));

      if (activeTargets === 0) {
        const newBalloon = generateRandomBalloon(true);
        return [...nextBalloons, newBalloon];
      }

      if (nextBalloons.length >= 10) {
        return nextBalloons;
      }

      const newBalloon = generateRandomBalloon();
      return [...nextBalloons, newBalloon];
    });
  };

  // Move balloons upward
  const moveBalloons = () => {
    setBalloons(prev => prev
      .map(balloon => (
        balloon.popped
          ? balloon
          : { ...balloon, y: balloon.y - 1 }
      ))
      .filter(balloon => balloon.popped || balloon.particles || balloon.y > -10)
    );
  };

  // Update particles
  const updateParticles = () => {
    setBalloons(prev => prev.map(balloon => {
      if (balloon.particles && balloon.particles.length > 0) {
        const updatedParticles = balloon.particles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 0.05
          }))
          .filter(particle => particle.life > 0);
        
        return { ...balloon, particles: updatedParticles };
      }
      return balloon;
    }));
  };

  // Pop balloon
  const popBalloon = (balloonId: number) => {
    setBalloons(prev => prev.map(balloon => {
      if (balloon.id === balloonId && !balloon.popped) {
        // Check if it's the target letter (both capital and small)
        const isTargetLetter = balloon.letter === normalizedTargetLetter || 
                              balloon.letter === normalizedTargetLetter.toLowerCase();

        if (isTargetLetter) {
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
        
        // Create particles for explosion effect
        const particles = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: balloon.x,
          y: balloon.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 1
        }));
        
        window.setTimeout(() => {
          setBalloons(current => current.filter(b => b.id !== balloonId));
        }, 1200);

        return { ...balloon, popped: true, particles };
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
    balloonIdCounter.current = 0;
    setBalloons([
      generateRandomBalloon(true),
      generateRandomBalloon(),
      generateRandomBalloon(),
    ]);
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
      
      // Update particles every 16ms (60fps)
      const particleInterval = setInterval(updateParticles, 16);
      
      return () => {
        clearInterval(balloonInterval);
        clearInterval(movementInterval);
        clearInterval(particleInterval);
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
        <p>انقر على البالونات التي تحتوي على حرف {targetLetter} أو {targetLetter.toLowerCase()}</p>
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
            <div key={balloon.id}>
              <div
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
              {/* Render particles */}
              {balloon.particles && balloon.particles.map(particle => (
                <div
                  key={`${balloon.id}-particle-${particle.id}`}
                  className="particle"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    backgroundColor: balloon.color,
                    opacity: particle.life,
                    transform: `scale(${particle.life})`
                  }}
                />
              ))}
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
