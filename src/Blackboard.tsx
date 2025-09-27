import { useEffect, useRef, useState } from 'react';

export function Blackboard({ traceLetter }: { traceLetter: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCapital, setShowCapital] = useState(true);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Drawing settings
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    // Draw letter outline with glow effect
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 140px Cairo, Arial';
    ctx.fillStyle = 'rgba(79, 172, 254, 0.6)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(79, 172, 254, 0.8)';
    ctx.shadowBlur = 15;
    
    // Show the appropriate case
    const letterToShow = showCapital ? traceLetter.toUpperCase() : traceLetter.toLowerCase();
    ctx.fillText(letterToShow, ctx.canvas.width / 2, ctx.canvas.height / 2 + 50);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }, [traceLetter, showCapital]);

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Bright chalk effect
    ctx.strokeStyle = '#fee140';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#fee140';
    ctx.shadowBlur = 8;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const onUp = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.shadowBlur = 0;
    }
  };

  const clearBoard = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear and redraw background
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Redraw letter outline
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 140px Cairo, Arial';
    ctx.fillStyle = 'rgba(79, 172, 254, 0.6)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(79, 172, 254, 0.8)';
    ctx.shadowBlur = 15;
    
    // Show the appropriate case
    const letterToShow = showCapital ? traceLetter.toUpperCase() : traceLetter.toLowerCase();
    ctx.fillText(letterToShow, ctx.canvas.width / 2, ctx.canvas.height / 2 + 50);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  return (
    <div className="blackboard-container">
      <canvas
        ref={canvasRef}
        width={500}
        height={350}
        className="blackboard-canvas"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      />
      <div className="mt-4">
        <div className="blackboard-controls">
          <button 
            className={`btn ${showCapital ? 'btn-primary' : 'btn-accent'}`} 
            onClick={() => setShowCapital(true)}
          >
            🔤 كبير (Capital)
          </button>
          <button 
            className={`btn ${!showCapital ? 'btn-primary' : 'btn-accent'}`} 
            onClick={() => setShowCapital(false)}
          >
            🔡 صغير (Small)
          </button>
          <button className="btn btn-accent" onClick={clearBoard}>
            🧹 مسح السبورة
          </button>
        </div>
      </div>
    </div>
  );
}


