import { useEffect, useRef, useState } from 'react';
import { VoiceSdkClient } from './voiceSdkClient';
// import { LessonEngine } from './lessonEngine';
import { LETTERS } from './letters';
import { Blackboard } from './Blackboard';

export default function App() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [mic, setMic] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<VoiceSdkClient | null>(null);
  const [letter, setLetter] = useState<'A'|'B'|'C'>('A');
  const [showBoth, setShowBoth] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [words, setWords] = useState(LETTERS['A'].words);
  const [songUrl, setSongUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect().catch(() => {});
    };
  }, []);

  const connect = async () => {
    if (!audioRef.current) return;
    try {
      setStatus('connecting');
      const client = new VoiceSdkClient();
      client.setUiHooks({
        clearVisuals: () => { setShowBoth(false); setShowBoard(false); setShowWords(false); setSongUrl(undefined); },
        showLetter: (L) => { setMessage(`الحرف ${L}`); },
        showBoth: () => { setShowBoth(true); setShowBoard(false); setShowWords(false); setSongUrl(undefined); },
        showBlackboard: () => { setShowBoard(true); setShowBoth(false); setShowWords(false); setSongUrl(undefined); },
        showWords: (ws) => { setWords(ws); setShowWords(true); setShowBoth(false); setShowBoard(false); setSongUrl(undefined); },
        showSong: (url) => { setSongUrl(url); setShowBoth(false); setShowBoard(false); setShowWords(false); },
        setLetter: (L) => { const U = (L.toUpperCase() as keyof typeof LETTERS); if (LETTERS[U]) { setLetter(U as any); setWords(LETTERS[U].words); } },
        // helpers for tools that pass only letter
        ...( {
          showWordsForLetter: (L: string) => { const U = L.toUpperCase() as keyof typeof LETTERS; setWords(LETTERS[U]?.words || []); setShowWords(true); setShowBoth(false); setShowBoard(false); setSongUrl(undefined); },
          showSongForLetter: (L: string) => { const U = L.toUpperCase() as keyof typeof LETTERS; setSongUrl(LETTERS[U]?.songUrl); setShowBoth(false); setShowBoard(false); setShowWords(false); },
        } as any)
      });
      client.onUpdate((s) => {
        setStatus(s.isConnected ? 'connected' : 'disconnected');
        setMic(s.isMicEnabled);
        setIsSpeaking(!!s.isSpeaking);
        if (s.message) setMessage(s.message);
        setError(s.error);
      });
      await client.connect(letter);
      clientRef.current = client;
    } catch (e: any) {
      setError(e?.message || 'failed_to_connect');
      setStatus('disconnected');
    }
  };

  const disconnect = async () => {
    await clientRef.current?.disconnect();
    clientRef.current = null;
  };

  const toggleMic = () => {
    const next = !mic;
    clientRef.current?.setMicEnabled(next);
    setMic(next);
  };

  return (
    <div className="app">
      <div className="header">
        <h1 className="main-title">🤖 روبوت تعليم الحروف</h1>
        <p className="subtitle">تعليم الحروف الإنجليزية باستخدام ذكاء اصطناعي صوتي تفاعلي</p>
      </div>

      <div className="main-grid">
        <div className="control-panel">
          <div className="control-section">
            <div className="section-label">حرف الدرس</div>
            <div className="letter-selector">
              <select 
                className="letter-dropdown" 
                value={letter} 
                onChange={(e) => {
                  const L = (e.target.value as 'A'|'B'|'C');
                  setLetter(L);
                  setWords(LETTERS[L].words);
                }}
              >
                {Object.keys(LETTERS).map((L) => <option key={L} value={L}>{L}</option>)}
              </select>
            </div>
          </div>
          <div className="control-section">
            <div className="section-label">التحكم في الاتصال</div>
            <div className="control-buttons">
              <button className="btn btn-primary" onClick={connect} disabled={status !== 'disconnected'}>
                🔗 اتصال
              </button>
              <button className="btn btn-accent" onClick={disconnect} disabled={status !== 'connected'}>
                ❌ قطع الاتصال
              </button>
              <button className="btn btn-accent" onClick={toggleMic} disabled={status !== 'connected'}>
                {mic ? '🎤 إيقاف المايك' : '🔇 تشغيل المايك'}
              </button>
            </div>
          </div>

          <div className="control-section">
            <div className="section-label">إدارة الدرس</div>
            <button 
              className="btn btn-success" 
              onClick={async () => {
                // نرسل تلميح للوكيل بالبداية، وهو يتحكم بالأدوات
                try { await clientRef.current?.speak(`ابدأ الدرس بحرف ${letter}`); } catch {}
              }} 
              disabled={status !== 'connected'}
            >
              🚀 ابدأ الدرس
            </button>
          </div>

          <div className="control-section">
            <div className="section-label">حالة النظام</div>
            <div className="status-section">
              <div className={`status-item status-${status}`}>
                <span>{status === 'connected' ? '🟢' : status === 'connecting' ? '🟡' : '🔴'}</span>
                الحالة: {status === 'connected' ? 'متصل' : status === 'connecting' ? 'جاري الاتصال' : 'غير متصل'}
              </div>
              {error && <div className="error-message">❗ خطأ: {error}</div>}
            </div>
          </div>

          <audio ref={audioRef} autoPlay playsInline />

          <div className="control-section">
            <a className="btn btn-primary" href="/api/ephemeral" target="_blank" rel="noreferrer">
              🔧 اختبار API الخادم
            </a>
          </div>
        </div>

        <div className="robot-container">
          <RobotView speaking={isSpeaking} message={message} />
        </div>
      </div>

      <div className="visual-section">
        <h2 className="section-title">📝 منطقة التعلم التفاعلية</h2>
        
        <div className="content-grid">
          <div className="letter-display-section animate-fadeInUp">
            <h3 className="section-title">الحرف الحالي</h3>
            <div className="big-letter">{letter}</div>
          </div>
          
          <div className="letter-display-section animate-fadeInUp">
            {showBoth ? (
              <div>
                <h3 className="section-title">الأشكال المختلفة</h3>
                <div className="both-letters-container">
                  <div className="letter-variant">
                    <div className="variant-label">كبير</div>
                    <div className="variant-letter">{LETTERS[letter].capital}</div>
                  </div>
                  <div className="letter-variant">
                    <div className="variant-label">صغير</div>
                    <div className="variant-letter">{LETTERS[letter].small}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="section-title">في انتظار التفاعل</h3>
                <div style={{ opacity: 0.5, fontSize: '2rem' }}>🤖</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBoard && (
        <div className="visual-section animate-scaleIn">
          <h2 className="section-title">✏️ سبورة الكتابة</h2>
          <div className="blackboard-container">
            <div className="blackboard-title">ارسم الحرف {letter}</div>
            <Blackboard traceLetter={letter} />
          </div>
        </div>
      )}

      {showWords && (
        <div className="visual-section animate-fadeInUp">
          <h2 className="section-title">📖 كلمات تبدأ بحرف {letter}</h2>
          <div className="words-grid">
            {words.map((w, i) => (
              <div key={i} className="word-card">
                <div className="word-english">{w.word}</div>
                <div className="word-arabic">{w.arabic}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {songUrl && (
        <div className="visual-section animate-scaleIn">
          <h2 className="section-title">🎵 أغنية الحرف {letter}</h2>
          <div className="song-container">
            <iframe 
              className="song-iframe"
              width="560" 
              height="315" 
              src={songUrl} 
              title="Letter Song" 
              frameBorder={0} 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
          </div>
        </div>
      )}
      </div>
  );
}

function RobotView({ speaking, message }: { speaking: boolean; message?: string }) {
  return (
    <div className="text-center">
      <div className={`robot-avatar ${speaking ? 'speaking' : ''}`}>
        <div className="robot-eyes">
          <Eye blinking={speaking} />
          <Eye blinking={speaking} />
        </div>
        <Mouth talking={speaking} />
      </div>
      {message && (
        <div className="speech-bubble">
          <div className="speech-text">{message}</div>
        </div>
      )}
    </div>
  );
}

function Eye({ blinking }: { blinking: boolean }) {
  return (
    <div className={`robot-eye ${blinking ? 'blinking' : ''}`}>
      <div className="eye-pupil" />
    </div>
  );
}

function Mouth({ talking }: { talking: boolean }) {
  return (
    <div className={`robot-mouth ${talking ? 'talking' : ''}`} />
  );
}