import { useState, useRef, useEffect } from 'react';
import './AudioRecorder.css';

interface AudioRecorderProps {
  letter: string;
  currentRecording?: string;
  onRecordingChange: (audioBlob: Blob | null) => void;
  disabled?: boolean;
}

export function AudioRecorder({ letter, currentRecording, onRecordingChange, disabled = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        onRecordingChange(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('خطأ في الوصول للميكروفون. تأكد من السماح بالوصول للميكروفون.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (currentRecording && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = () => {
    onRecordingChange(null);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasRecording = !!currentRecording;

  return (
    <div className="audio-recorder">
      <div className="recorder-header">
        <h4 className="recorder-title">🎤 تسجيل نطق حرف {letter}</h4>
        {!hasRecording && (
          <div className="recorder-status">
            <span className="status-indicator required">⚠️ مطلوب</span>
          </div>
        )}
      </div>

      <div className="recorder-controls">
        {!isRecording && !currentRecording && (
          <button
            className="btn btn-primary recorder-btn"
            onClick={startRecording}
            disabled={disabled}
          >
            🎤 بدء التسجيل
          </button>
        )}

        {isRecording && (
          <div className="recording-active">
            <button
              className="btn btn-accent recorder-btn"
              onClick={stopRecording}
            >
              ⏹️ إيقاف التسجيل
            </button>
            <div className="recording-timer">
              <span className="timer-icon">🔴</span>
              <span className="timer-text">{formatTime(recordingTime)}</span>
            </div>
          </div>
        )}

        {currentRecording && !isRecording && (
          <div className="recording-complete">
            <button
              className="btn btn-success recorder-btn"
              onClick={playRecording}
              disabled={isPlaying}
            >
              ▶️ تشغيل التسجيل
            </button>
            <button
              className="btn btn-accent recorder-btn"
              onClick={deleteRecording}
            >
              🗑️ حذف التسجيل
            </button>
            <button
              className="btn btn-primary recorder-btn"
              onClick={startRecording}
              disabled={disabled}
            >
              🔄 تسجيل جديد
            </button>
          </div>
        )}
      </div>

      {currentRecording && (
        <div className="recording-info">
          <div className="recording-status">
            <span className="status-indicator success">✅ مسجل</span>
          </div>
          <audio
            ref={audioRef}
            src={currentRecording}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      )}

      <div className="recorder-instructions">
        <p className="instructions-text">
          {!currentRecording 
            ? `اضغط "بدء التسجيل" ونطق حرف ${letter} بوضوح، ثم اضغط "إيقاف التسجيل"`
            : `تم تسجيل نطق حرف ${letter} بنجاح. يمكنك تشغيله أو تسجيل نسخة جديدة.`
          }
        </p>
      </div>
    </div>
  );
}
