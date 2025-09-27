import React, { useRef, useEffect } from 'react';

interface Robot3DProps {
  speaking: boolean;
  message?: string;
}

export function Robot3D({ speaking, message }: Robot3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // إعداد Canvas
    const resizeCanvas = () => {
      canvas.width = 300;
      canvas.height = 300;
    };
    
    resizeCanvas();

    // رسم الروبوت ثلاثي الأبعاد بسيط
    const drawRobot = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // خلفية دائرية
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 120;
      
      // خلفية متدرجة
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#4facfe');
      gradient.addColorStop(1, '#00f2fe');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // إطار خارجي
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // جسم الروبوت (مكعب ثلاثي الأبعاد)
      const bodySize = 80;
      const bodyX = centerX - bodySize / 2;
      const bodyY = centerY - bodySize / 2;
      
      // الوجه الأمامي
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(bodyX, bodyY, bodySize, bodySize);
      
      // الوجه الجانبي (للمظهر ثلاثي الأبعاد)
      ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
      ctx.beginPath();
      ctx.moveTo(bodyX + bodySize, bodyY);
      ctx.lineTo(bodyX + bodySize + 20, bodyY - 20);
      ctx.lineTo(bodyX + bodySize + 20, bodyY + bodySize - 20);
      ctx.lineTo(bodyX + bodySize, bodyY + bodySize);
      ctx.closePath();
      ctx.fill();
      
      // الوجه العلوي
      ctx.fillStyle = 'rgba(180, 180, 180, 0.8)';
      ctx.beginPath();
      ctx.moveTo(bodyX, bodyY);
      ctx.lineTo(bodyX + 20, bodyY - 20);
      ctx.lineTo(bodyX + bodySize + 20, bodyY - 20);
      ctx.lineTo(bodyX + bodySize, bodyY);
      ctx.closePath();
      ctx.fill();
      
      // العيون
      const eyeY = centerY - 15;
      const leftEyeX = centerX - 20;
      const rightEyeX = centerX + 20;
      
      // عيون بيضاء
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // بؤبؤ العين
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // تأثير الرمش عند التحدث
      if (speaking) {
        ctx.fillStyle = '#333';
        ctx.fillRect(leftEyeX - 12, eyeY - 2, 24, 4);
        ctx.fillRect(rightEyeX - 12, eyeY - 2, 24, 4);
      }
      
      // الفم
      const mouthY = centerY + 20;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      
      if (speaking) {
        // فم مفتوح عند التحدث
        ctx.beginPath();
        ctx.arc(centerX, mouthY, 15, 0, Math.PI);
        ctx.stroke();
        
        // أسنان
        ctx.fillStyle = 'white';
        for (let i = 0; i < 3; i++) {
          const toothX = centerX - 10 + i * 10;
          ctx.fillRect(toothX, mouthY - 15, 3, 8);
        }
      } else {
        // ابتسامة عادية
        ctx.beginPath();
        ctx.arc(centerX, mouthY, 12, 0, Math.PI);
        ctx.stroke();
      }
      
      // أذرع الروبوت
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      // الذراع اليسرى
      ctx.fillRect(bodyX - 15, bodyY + 10, 15, 40);
      // الذراع اليمنى
      ctx.fillRect(bodyX + bodySize, bodyY + 10, 15, 40);
      
      // تأثير الحركة عند التحدث
      if (speaking) {
        // إضافة تأثير نبضة
        const pulseRadius = radius + Math.sin(Date.now() * 0.01) * 10;
        ctx.strokeStyle = 'rgba(79, 172, 254, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    // رسم الروبوت
    drawRobot();
    
    // تحديث الرسم عند التحدث
    let animationId: number;
    if (speaking) {
      const animate = () => {
        drawRobot();
        animationId = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [speaking]);

  return (
    <div className="robot-3d-container">
      <div className="robot-canvas-wrapper">
        <canvas 
          ref={canvasRef}
          className="robot-canvas"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      {message && (
        <div className="speech-bubble">
          <div className="speech-text">{message}</div>
        </div>
      )}
    </div>
  );
}
