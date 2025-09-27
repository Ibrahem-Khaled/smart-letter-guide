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
  const [youtubeUrl, setYoutubeUrl] = useState<string>('https://www.youtube.com/embed/1dfXcN3VJxE');
  const [showControlModal, setShowControlModal] = useState(false);
  const [hasContent, setHasContent] = useState(false);

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
        clearVisuals: () => { 
          setShowBoth(false); 
          setShowBoard(false); 
          setShowWords(false); 
          setSongUrl(undefined); 
          setHasContent(false);
        },
        showLetter: (L) => { setMessage(`الحرف ${L}`); setHasContent(true); },
        showBoth: () => { 
          setShowBoth(true); 
          setShowBoard(false); 
          setShowWords(false); 
          setSongUrl(undefined); 
          setHasContent(true);
        },
        showBlackboard: () => { 
          setShowBoard(true); 
          setShowBoth(false); 
          setShowWords(false); 
          setSongUrl(undefined); 
          setHasContent(true);
        },
        showWords: (ws) => { 
          setWords(ws); 
          setShowWords(true); 
          setShowBoth(false); 
          setShowBoard(false); 
          setSongUrl(undefined); 
          setHasContent(true);
        },
        showSong: (url) => { 
          setSongUrl(url); 
          setShowBoth(false); 
          setShowBoard(false); 
          setShowWords(false); 
          setHasContent(true);
        },
        setLetter: (L) => { const U = (L.toUpperCase() as keyof typeof LETTERS); if (LETTERS[U]) { setLetter(U as any); setWords(LETTERS[U].words); } },
        // helpers for tools that pass only letter
        ...( {
          showWordsForLetter: (L: string) => { 
            const U = L.toUpperCase() as keyof typeof LETTERS; 
            setWords(LETTERS[U]?.words || []); 
            setShowWords(true); 
            setShowBoth(false); 
            setShowBoard(false); 
            setSongUrl(undefined); 
            setHasContent(true);
          },
          showSongForLetter: (L: string) => { 
            const U = L.toUpperCase() as keyof typeof LETTERS; 
            setSongUrl(LETTERS[U]?.songUrl); 
            setShowBoth(false); 
            setShowBoard(false); 
            setShowWords(false); 
            setHasContent(true);
          },
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
      {/* Header */}
      <div className="header">
        <h1 className="main-title">🤖 روبوت تعليم الحروف</h1>
        <p className="subtitle">تعليم الحروف الإنجليزية باستخدام ذكاء اصطناعي صوتي تفاعلي</p>
      </div>

      {/* Control Button - Floating */}
      <button 
        className="control-toggle-btn"
        onClick={() => setShowControlModal(true)}
        aria-label="فتح لوحة التحكم"
      >
        ⚙️
      </button>

      {/* Main Content Area */}
      <div className={`main-content ${hasContent ? 'has-content' : ''}`}>
        {/* Robot Section - Central when no content, side when content */}
        <div className={`robot-section ${hasContent ? 'side-position' : 'center-position'}`}>
          <RobotView speaking={isSpeaking} message={message} />
        </div>

        {/* Content Area - Only visible when there's content */}
        {hasContent && (
          <div className="content-area animate-slideInLeft">
            {showBoth && (
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">الأشكال المختلفة للحرف {letter}</h3>
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
            )}

            {showBoard && (
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">✏️ سبورة الكتابة</h3>
                <div className="blackboard-container">
                  <div className="blackboard-title">ارسم الحرف {letter}</div>
                  <Blackboard traceLetter={letter} />
                </div>
              </div>
            )}

            {showWords && (
              <div className="content-panel animate-fadeInUp">
                <h3 className="content-title">📖 كلمات تبدأ بحرف {letter}</h3>
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
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">🎵 أغنية الحرف {letter}</h3>
                <div className="song-container">
            <iframe 
              className="song-iframe"
              width="560" 
              height="315" 
              src={songUrl || youtubeUrl} 
              title="Letter Song" 
              frameBorder={0} 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Modal */}
      {showControlModal && (
        <div className="modal-overlay animate-fadeIn" onClick={() => setShowControlModal(false)}>
          <div className="modal-content animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🎛️ لوحة التحكم</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowControlModal(false)}
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
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
                <div className="section-label">رابط أغنية اليوتيوب</div>
                <div className="youtube-url-input">
                  <input 
                    type="text" 
                    className="url-input" 
                    value={youtubeUrl} 
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/VIDEO_ID"
                  />
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
                  className="btn btn-success btn-large" 
                  onClick={async () => {
                    try { 
                      await clientRef.current?.speak(`ابدأ الدرس بحرف ${letter}`); 
                      setShowControlModal(false);
                    } catch {}
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

              <div className="control-section">
                <a className="btn btn-primary btn-small" href="/api/ephemeral" target="_blank" rel="noreferrer">
                  🔧 اختبار API الخادم
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} autoPlay playsInline />
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