import { useEffect, useRef, useState, useCallback } from 'react';

export function Blackboard({ traceLetter, onClearBoard }: { traceLetter: string; onClearBoard?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#fee140');
  const [brushSize, setBrushSize] = useState(12);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLetter, setShowLetter] = useState(true);

  // Simplified colors for basic use
  const basicColors = [
    { name: 'أصفر', value: '#fee140' },
    { name: 'أبيض', value: '#ffffff' },
    { name: 'أحمر', value: '#ff6b6b' },
    { name: 'أزرق', value: '#4ecdc4' },
  ];

  // Advanced colors for detailed settings
  const advancedColors = [
    { name: 'أصفر', value: '#fee140', hex: '#fee140' },
    { name: 'أبيض', value: '#ffffff', hex: '#ffffff' },
    { name: 'أحمر', value: '#ff6b6b', hex: '#ff6b6b' },
    { name: 'أزرق', value: '#4ecdc4', hex: '#4ecdc4' },
    { name: 'أخضر', value: '#45b7d1', hex: '#45b7d1' },
    { name: 'بنفسجي', value: '#96ceb4', hex: '#96ceb4' },
    { name: 'برتقالي', value: '#feca57', hex: '#feca57' },
    { name: 'وردي', value: '#ff9ff3', hex: '#ff9ff3' },
  ];

  const brushSizes = [4, 8, 12, 16, 20, 24];

  // Initialize canvas with letters
  const initializeCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Only draw letters if showLetter is true
    if (showLetter) {
      // Draw letter outlines with glow effect
      ctx.globalAlpha = 0.4;
      ctx.font = 'bold 120px Cairo, Arial';
      ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255, 107, 107, 0.8)';
      ctx.shadowBlur = 15;
      
      // Show both capital and small letters side by side
      const capitalLetter = traceLetter.toUpperCase();
      const smallLetter = traceLetter.toLowerCase();
      
      // Draw capital letter on the left
      ctx.fillText(capitalLetter, ctx.canvas.width / 3, ctx.canvas.height / 2 + 50);
      
      // Draw small letter on the right
      ctx.fillText(smallLetter, (ctx.canvas.width * 2) / 3, ctx.canvas.height / 2 + 50);
      
      // Add labels
      ctx.font = 'bold 24px Cairo, Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 5;
      
      // Label for capital letter
      ctx.fillText('كبير', ctx.canvas.width / 3, ctx.canvas.height / 2 + 120);
      
      // Label for small letter
      ctx.fillText('صغير', (ctx.canvas.width * 2) / 3, ctx.canvas.height / 2 + 120);
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }, [traceLetter, showLetter]);

  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawWithBrush = (ctx: CanvasRenderingContext2D, currentPos: { x: number; y: number }, lastPos: { x: number; y: number }) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = brushSize / 2;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
  };


  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setLastPoint(pos);
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const currentPos = getMousePos(e);
    drawWithBrush(ctx, currentPos, lastPoint);
    setLastPoint(currentPos);
  };

  const onUp = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearBoard = async () => {
    setIsAnimating(true);
    
    // Add celebration animation with multiple effects
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Create multiple sparkle effects
        for (let i = 0; i < 30; i++) {
          setTimeout(() => {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 15 + 5;
            const colors = ['#fee140', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add star shape for some sparkles
            if (Math.random() > 0.5) {
              ctx.beginPath();
              for (let j = 0; j < 5; j++) {
                const angle = (j * Math.PI * 2) / 5;
                const starX = x + Math.cos(angle) * size;
                const starY = y + Math.sin(angle) * size;
                if (j === 0) ctx.moveTo(starX, starY);
                else ctx.lineTo(starX, starY);
              }
              ctx.closePath();
              ctx.fill();
            }
            
            ctx.restore();
          }, i * 30);
        }
        
        // Add confetti effect
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const confettiColors = ['🎉', '🎊', '✨', '🌟', '💫'];
            const confetti = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(confetti, x, y);
            ctx.restore();
          }, i * 50);
        }
      }
    }
    
    // Call voice feedback
    if (onClearBoard) {
      onClearBoard();
    }
    
    // Clear and redraw after animation
    setTimeout(() => {
      initializeCanvas();
      setIsAnimating(false);
    }, 1500);
  };


  return (
    <div className="blackboard-container">
      {/* Simple Toolbar */}
      <div className="simple-toolbar">
        {/* Basic Colors */}
        <div className="color-section">
          <h4 className="section-title">🎨 الألوان</h4>
          <div className="colors-row">
            {basicColors.map((color, index) => (
              <button
                key={index}
                className={`color-btn ${currentColor === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setCurrentColor(color.value)}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="size-section">
          <h4 className="section-title">📏 الحجم</h4>
          <div className="size-row">
            {brushSizes.map((size, index) => (
              <button
                key={index}
                className={`size-btn ${brushSize === size ? 'active' : ''}`}
                onClick={() => setBrushSize(size)}
                title={`حجم ${size}px`}
              >
                <div 
                  className="size-preview"
                  style={{ 
                    width: Math.min(size * 1.5, 16), 
                    height: Math.min(size * 1.5, 16),
                    backgroundColor: currentColor
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="actions-section">
          <button 
            className="action-btn clear-btn"
            onClick={clearBoard}
            disabled={isAnimating}
          >
            🧹 مسح
          </button>
          <button 
            className={`action-btn ${showLetter ? 'hide-letter-btn' : 'show-letter-btn'}`}
            onClick={() => {
              setShowLetter(!showLetter);
              initializeCanvas();
            }}
            title={showLetter ? 'إخفاء الحرف' : 'إظهار الحرف'}
          >
            {showLetter ? '👁️‍🗨️ إخفاء الحرف' : '👁️ إظهار الحرف'}
          </button>
          <button 
            className="action-btn settings-btn"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            ⚙️ إعدادات
          </button>
        </div>
      </div>

      {/* Advanced Settings Panel */}
      {showAdvancedSettings && (
        <div className="advanced-settings">
          <div className="settings-header">
            <h3>⚙️ إعدادات متقدمة</h3>
            <button 
              className="close-settings-btn"
              onClick={() => setShowAdvancedSettings(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="settings-content">
            {/* Advanced Colors */}
            <div className="setting-group">
              <h4>🎨 جميع الألوان</h4>
              <div className="advanced-colors-grid">
                {advancedColors.map((color, index) => (
                  <button
                    key={index}
                    className={`color-btn ${currentColor === color.hex ? 'active' : ''}`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setCurrentColor(color.hex)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Brush Modes */}
            <div className="setting-group">
              <h4>🖌️ أوضاع الفرشاة</h4>
              <div className="brush-modes">
                <button className="brush-mode-btn active">
                  🖌️ عادي
                </button>
                <button className="brush-mode-btn">
                  💨 رش
                </button>
                <button className="brush-mode-btn">
                  ✨ متوهج
                </button>
              </div>
            </div>

            {/* Tools */}
            <div className="setting-group">
              <h4>🛠️ أدوات إضافية</h4>
              <div className="tools-grid">
                <button className="tool-btn">
                  🧽 ممحاة
                </button>
                <button className="tool-btn">
                  📏 خط مستقيم
                </button>
                <button className="tool-btn">
                  ⭕ دائرة
                </button>
                <button className="tool-btn">
                  ⬜ مربع
                </button>
              </div>
            </div>

            {/* Stickers */}
            <div className="setting-group">
              <h4>🎨 ملصقات</h4>
              <div className="stickers-grid">
                {['🎉', '🌟', '💫', '✨', '🎊', '🎈', '🎁', '🏆'].map((sticker, index) => (
                  <button
                    key={index}
                    className="sticker-btn"
                    title={`إضافة ${sticker}`}
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className={`blackboard-canvas ${isAnimating ? 'celebrating' : ''}`}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{ cursor: 'crosshair' }}
        />
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">اللون:</span>
          <span className="status-value" style={{ color: currentColor }}>
            ● {basicColors.find(c => c.value === currentColor)?.name || advancedColors.find(c => c.hex === currentColor)?.name}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">الحجم:</span>
          <span className="status-value">{brushSize}px</span>
        </div>
      </div>
    </div>
  );
}