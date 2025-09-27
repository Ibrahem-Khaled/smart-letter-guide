import { useEffect, useRef, useState, useCallback } from 'react';

interface DrawingTool {
  name: string;
  icon: string;
  type: 'brush' | 'eraser' | 'shape' | 'text';
}

interface Color {
  name: string;
  value: string;
  hex: string;
}

export function Blackboard({ traceLetter, onClearBoard }: { traceLetter: string; onClearBoard?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool['type']>('brush');
  const [currentColor, setCurrentColor] = useState('#fee140');
  const [brushSize, setBrushSize] = useState(12);
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [brushMode, setBrushMode] = useState<'normal' | 'spray' | 'glow'>('normal');

  const colors: Color[] = [
    { name: 'أصفر', value: '#fee140', hex: '#fee140' },
    { name: 'أبيض', value: '#ffffff', hex: '#ffffff' },
    { name: 'أحمر', value: '#ff6b6b', hex: '#ff6b6b' },
    { name: 'أزرق', value: '#4ecdc4', hex: '#4ecdc4' },
    { name: 'أخضر', value: '#45b7d1', hex: '#45b7d1' },
    { name: 'بنفسجي', value: '#96ceb4', hex: '#96ceb4' },
    { name: 'برتقالي', value: '#feca57', hex: '#feca57' },
    { name: 'وردي', value: '#ff9ff3', hex: '#ff9ff3' },
  ];

  const tools: DrawingTool[] = [
    { name: 'فرشاة', icon: '🖌️', type: 'brush' },
    { name: 'ممحاة', icon: '🧽', type: 'eraser' },
    { name: 'خط مستقيم', icon: '📏', type: 'shape' },
    { name: 'دائرة', icon: '⭕', type: 'shape' },
    { name: 'مربع', icon: '⬜', type: 'shape' },
    { name: 'مثلث', icon: '🔺', type: 'shape' },
    { name: 'نجمة', icon: '⭐', type: 'shape' },
    { name: 'نص', icon: '📝', type: 'text' },
  ];

  const stickers = ['🎉', '🌟', '💫', '✨', '🎊', '🎈', '🎁', '🏆', '🥇', '👏', '👍', '❤️', '😊', '🎯', '🎨'];

  const brushSizes = [4, 8, 12, 16, 20, 24];

  // Initialize canvas with letters
  const initializeCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw letter outlines with glow effect
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 120px Cairo, Arial';
    ctx.fillStyle = 'rgba(79, 172, 254, 0.6)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(79, 172, 254, 0.8)';
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
  }, [traceLetter]);

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
    ctx.globalAlpha = brushOpacity;
    
    if (brushMode === 'spray') {
      // Spray effect
      for (let i = 0; i < 20; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize;
        const offsetY = (Math.random() - 0.5) * brushSize;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        
        if (distance <= brushSize / 2) {
          ctx.fillStyle = currentColor;
          ctx.beginPath();
          ctx.arc(currentPos.x + offsetX, currentPos.y + offsetY, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (brushMode === 'glow') {
      // Glow effect
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = currentColor;
      ctx.shadowBlur = brushSize * 2;
      
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else {
      // Normal brush
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
    }
    
    ctx.globalAlpha = 1;
  };

  const drawWithEraser = (ctx: CanvasRenderingContext2D, currentPos: { x: number; y: number }, lastPos: { x: number; y: number }) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = brushSize * 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 0;
    
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
    
    if (currentTool === 'brush') {
      drawWithBrush(ctx, currentPos, lastPoint);
    } else if (currentTool === 'eraser') {
      drawWithEraser(ctx, currentPos, lastPoint);
    }
    
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

  const drawShape = (shape: string, startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = brushSize / 2;
    
    ctx.beginPath();
    
    switch (shape) {
      case 'line':
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        break;
      case 'rectangle':
        ctx.rect(startPos.x, startPos.y, endPos.x - startPos.x, endPos.y - startPos.y);
        break;
      case 'triangle':
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.lineTo(startPos.x + (endPos.x - startPos.x) / 2, startPos.y - Math.abs(endPos.y - startPos.y));
        ctx.closePath();
        break;
      case 'star':
        const centerX = (startPos.x + endPos.x) / 2;
        const centerY = (startPos.y + endPos.y) / 2;
        const outerRadius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)) / 2;
        const innerRadius = outerRadius * 0.4;
        const spikes = 5;
        
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
    }
    
    ctx.stroke();
  };

  const addTextToCanvas = (text: string, x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = currentColor;
    ctx.font = `${brushSize * 2}px Cairo, Arial`;
    ctx.textAlign = 'center';
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = brushSize / 2;
    ctx.fillText(text, x, y);
  };

  const addSticker = (sticker: string, x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${brushSize * 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = brushSize;
    ctx.fillText(sticker, x, y);
  };

  return (
    <div className="blackboard-container">
      {/* Professional Toolbar */}
      {showToolbar && (
        <div className="blackboard-toolbar">
          {/* Main Tools Row */}
          <div className="toolbar-row main-tools">
            {/* Tools Section */}
            <div className="toolbar-section tools-section">
              <h4 className="toolbar-title">🛠️ الأدوات</h4>
              <div className="tools-grid">
                {tools.map((tool, index) => (
                  <button
                    key={index}
                    className={`tool-btn ${currentTool === tool.type ? 'active' : ''}`}
                    onClick={() => setCurrentTool(tool.type)}
                    title={tool.name}
                  >
                    <span className="tool-icon">{tool.icon}</span>
                    <span className="tool-name">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors Section */}
            <div className="toolbar-section colors-section">
              <h4 className="toolbar-title">🎨 الألوان</h4>
              <div className="colors-grid">
                {colors.map((color, index) => (
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
          </div>

          {/* Brush Controls Row */}
          <div className="toolbar-row brush-controls">
            {/* Brush Mode Section */}
            <div className="toolbar-section brush-mode-section">
              <h4 className="toolbar-title">🎨 وضع الفرشاة</h4>
              <div className="brush-modes">
                <button 
                  className={`brush-mode-btn ${brushMode === 'normal' ? 'active' : ''}`}
                  onClick={() => setBrushMode('normal')}
                  title="فرشاة عادية"
                >
                  🖌️ عادي
                </button>
                <button 
                  className={`brush-mode-btn ${brushMode === 'spray' ? 'active' : ''}`}
                  onClick={() => setBrushMode('spray')}
                  title="فرشاة رش"
                >
                  💨 رش
                </button>
                <button 
                  className={`brush-mode-btn ${brushMode === 'glow' ? 'active' : ''}`}
                  onClick={() => setBrushMode('glow')}
                  title="فرشاة متوهجة"
                >
                  ✨ متوهج
                </button>
              </div>
            </div>

            {/* Brush Size Section */}
            <div className="toolbar-section brush-size-section">
              <h4 className="toolbar-title">📏 حجم الفرشاة</h4>
              <div className="brush-sizes">
                {brushSizes.map((size, index) => (
                  <button
                    key={index}
                    className={`brush-size-btn ${brushSize === size ? 'active' : ''}`}
                    onClick={() => setBrushSize(size)}
                    title={`حجم ${size}px`}
                  >
                    <div 
                      className="brush-preview"
                      style={{ 
                        width: Math.min(size * 2, 20), 
                        height: Math.min(size * 2, 20),
                        backgroundColor: currentColor,
                        opacity: brushOpacity
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Section */}
            <div className="toolbar-section opacity-section">
              <h4 className="toolbar-title">👁️ الشفافية</h4>
              <div className="opacity-control">
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={brushOpacity}
                  onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
                  className="opacity-slider"
                />
                <div className="opacity-value">{Math.round(brushOpacity * 100)}%</div>
              </div>
            </div>
          </div>

          {/* Stickers and Actions Row */}
          <div className="toolbar-row stickers-actions">
            {/* Stickers Section */}
            <div className="toolbar-section stickers-section">
              <h4 className="toolbar-title">🎨 ملصقات</h4>
              <div className="stickers-grid">
                {stickers.map((sticker, index) => (
                  <button
                    key={index}
                    className="sticker-btn"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (canvas) {
                        const rect = canvas.getBoundingClientRect();
                        const x = rect.width / 2;
                        const y = rect.height / 2;
                        addSticker(sticker, x, y);
                      }
                    }}
                    title={`إضافة ${sticker}`}
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div className="toolbar-section actions-section">
              <h4 className="toolbar-title">⚡ الإجراءات</h4>
              <div className="actions-grid">
                <button 
                  className="action-btn clear-btn"
                  onClick={clearBoard}
                  disabled={isAnimating}
                >
                  🧹 مسح السبورة
                </button>
                <button 
                  className="action-btn toggle-btn"
                  onClick={() => setShowToolbar(!showToolbar)}
                >
                  👁️ إخفاء الأدوات
                </button>
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
          style={{ cursor: currentTool === 'eraser' ? 'crosshair' : 'crosshair' }}
        />
        
        {/* Quick Access Toolbar */}
        {!showToolbar && (
          <div className="quick-toolbar">
            <button 
              className="quick-btn"
              onClick={() => setShowToolbar(true)}
              title="إظهار الأدوات"
            >
              🛠️
            </button>
            <button 
              className="quick-btn"
              onClick={clearBoard}
              disabled={isAnimating}
              title="مسح السبورة"
            >
              🧹
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">الأداة:</span>
          <span className="status-value">
            {tools.find(t => t.type === currentTool)?.icon} {tools.find(t => t.type === currentTool)?.name}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">اللون:</span>
          <span className="status-value" style={{ color: currentColor }}>
            ● {colors.find(c => c.hex === currentColor)?.name}
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