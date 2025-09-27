import { useEffect, useRef, useState } from 'react';
import { VoiceSdkClient } from './voiceSdkClient';
// import { LessonEngine } from './lessonEngine';
import { LETTERS } from './letters';
import { Robot3D } from './components/Robot3D';

function toYouTubeEmbedUrl(raw: string): string | null {
  try {
    const input = (raw || '').trim();
    if (!input) return null;
    // If already an embed URL, keep it
    if (/^https?:\/\/([a-z]+\.)?youtube\.com\/embed\//i.test(input)) {
      return input;
    }
    // Accept shorts, watch, and youtu.be formats
    // 1) youtu.be/VIDEO_ID
    const shortMatch = input.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    // 2) youtube.com/watch?v=VIDEO_ID
    const watchMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    // 3) youtube.com/shorts/VIDEO_ID
    const shortsMatch = input.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);

    const videoId = (shortMatch?.[1] || watchMatch?.[1] || shortsMatch?.[1])?.trim();
    if (!videoId) return null;

    // Extract start time from t or start param
    // t may be like 90, 1m30s, 1h2m3s
    const url = new URL(input, 'https://dummy-base.local');
    const t = url.searchParams.get('t') || url.searchParams.get('start');
    let startSeconds = 0;
    if (t) {
      const secondsOnly = t.match(/^\d+$/) ? parseInt(t, 10) : null;
      if (secondsOnly !== null && !Number.isNaN(secondsOnly)) {
        startSeconds = secondsOnly;
      } else {
        const h = /([0-9]+)h/i.exec(t)?.[1];
        const m = /([0-9]+)m/i.exec(t)?.[1];
        const s = /([0-9]+)s/i.exec(t)?.[1];
        startSeconds = (h ? parseInt(h, 10) * 3600 : 0) + (m ? parseInt(m, 10) * 60 : 0) + (s ? parseInt(s, 10) : 0);
      }
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const params = new URLSearchParams();
    if (startSeconds > 0) params.set('start', String(startSeconds));
    params.set('rel', '0');
    if (origin) params.set('origin', origin);
    const qs = params.toString();
    return `https://www.youtube.com/embed/${videoId}${qs ? `?${qs}` : ''}`;
  } catch {
    return null;
  }
}
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
  const [, setSongUrl] = useState<string | undefined>(undefined);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('https://www.youtube.com/embed/1dfXcN3VJxE');
  const normalizedYoutubeUrl = toYouTubeEmbedUrl(youtubeUrl) || youtubeUrl;
  const [showControlModal, setShowControlModal] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  // lesson stage tracking for progress bar and gating song to final stage
  type StageKey = 'intro' | 'words' | 'writing' | 'song' | 'outro';
  const stageOrder: StageKey[] = ['intro', 'words', 'writing', 'song', 'outro'];
  const [stage, setStage] = useState<StageKey>('intro');
  const stageIndex = stageOrder.indexOf(stage);
  const progressPercent = Math.round(((stageIndex + 1) / stageOrder.length) * 100);
  const stageLabels: Record<StageKey, string> = {
    intro: 'مقدمة',
    words: 'كلمات',
    writing: 'كتابة',
    song: 'أغنية',
    outro: 'ختام',
  };

  const applyStageVisuals = (targetStage: StageKey) => {
    setHasContent(true);
    setShowBoth(targetStage === 'intro');
    setShowWords(targetStage === 'words');
    setShowBoard(targetStage === 'writing');
    setSongUrl(() => {
      if (targetStage === 'song') {
        // Always use the current youtubeUrl from settings, not cached songUrl
        return normalizedYoutubeUrl;
      }
      return undefined;
    });
    setMessage(undefined);
  };

  const getStagePrompt = (targetStage: StageKey) => {
    switch (targetStage) {
      case 'intro':
        return {
          prompt: `من فضلك اشرح مرحلة المقدمة للحرف ${letter} الآن خطوة بخطوة.`,
          fallback: `انتقلت إلى مرحلة المقدمة لحرف ${letter}. عند الاتصال سيشرح الروبوت هذه المرحلة.`,
        };
      case 'words':
        return {
          prompt: `من فضلك انتقل إلى مرحلة الكلمات للحرف ${letter} واشرح الأمثلة للأطفال.`,
          fallback: `انتقلت إلى مرحلة الكلمات لحرف ${letter}. عند الاتصال سيشرح الروبوت الأمثلة.`,
        };
      case 'writing':
        return {
          prompt: `من فضلك انتقل إلى مرحلة الكتابة على السبورة للحرف ${letter} وارشد الأطفال في الرسم.`,
          fallback: `انتقلت إلى مرحلة كتابة الحرف ${letter}. عند الاتصال سيقود الروبوت هذه المرحلة.`,
        };
      case 'song':
        return {
          prompt: `من فضلك قدم أغنية الحرف ${letter} ودع الأطفال للغناء معك.`,
          fallback: `انتقلت إلى مرحلة أغنية الحرف ${letter}. عند الاتصال سيبدأ الروبوت بالأغنية.`,
        };
      case 'outro':
      default:
        return {
          prompt: `من فضلك نفّذ مرحلة الختام والتقييم للحرف ${letter} الآن.`,
          fallback: `انتقلت إلى مرحلة الختام لحرف ${letter}. عند الاتصال سيقود الروبوت التقييم.`,
        };
    }
  };

  const handleStageSelect = (targetStage: StageKey) => {
    applyStageVisuals(targetStage);
    setStage(targetStage);
    const { prompt, fallback } = getStagePrompt(targetStage);
    if (status === 'connected' && clientRef.current) {
      clientRef.current.speak(prompt).catch(() => {
        setMessage(fallback);
      });
    } else {
      setMessage(fallback);
    }
  };

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
          // do not change stage here
        },
        showLetter: (L) => { setMessage(`الحرف ${L}`); setHasContent(true); setStage('intro'); },
        showBoth: () => { 
          setShowBoth(true); 
          setShowBoard(false); 
          setShowWords(false); 
          setSongUrl(undefined); 
          setHasContent(true);
          setStage('intro');
        },
        showBlackboard: () => { 
          setShowBoard(true); 
          setShowBoth(false); 
          setShowWords(false); 
          setSongUrl(undefined); 
          setHasContent(true);
          setStage('writing');
        },
        showWords: (ws) => { 
          setWords(ws); 
          setShowWords(true); 
          setShowBoth(false); 
          setShowBoard(false); 
          setSongUrl(undefined); 
          setHasContent(true);
          setStage('words');
        },
        showSong: (url) => { 
          setSongUrl(url); 
          setShowBoth(false); 
          setShowBoard(false); 
          setShowWords(false); 
          setHasContent(true);
          setStage('song');
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
            setStage('words');
          },
          showSongForLetter: (L: string) => { 
            const U = L.toUpperCase() as keyof typeof LETTERS; 
            setSongUrl(LETTERS[U]?.songUrl); 
            setShowBoth(false); 
            setShowBoard(false); 
            setShowWords(false); 
            setHasContent(true);
            setStage('song');
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
      {/* Header - Glass design with inline settings */}
      <div className="header glass-lg">
        <div className="header-content">
          <div className="header-titles">
            <h1 className="main-title">🤖 روبوت تعليم الحروف</h1>
            <p className="subtitle">تعليم الحروف الإنجليزية باستخدام ذكاء اصطناعي صوتي تفاعلي</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-primary header-settings-btn"
              onClick={() => setShowControlModal(true)}
              aria-label="فتح لوحة التحكم"
            >
              ⚙️ الإعدادات
            </button>
          </div>
        </div>
        {/* Header Progress */}
        <div className="header-progress">
          <div className="progress-wrapper">
            <div className="progress-label">المرحلة الحالية: {stageLabels[stage]} — {stageIndex + 1} / {stageOrder.length} — {progressPercent}%</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="progress-steps">
              {stageOrder.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className={`progress-step ${i <= stageIndex ? 'done' : ''} ${i === stageIndex ? 'current' : ''}`}
                  onClick={() => handleStageSelect(s)}
                  aria-current={i === stageIndex ? 'step' : undefined}
                  aria-label={`اذهب إلى مرحلة ${stageLabels[s]}`}
                >
                  {stageLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`main-content ${hasContent ? 'has-content' : ''}`}>
        {/* Robot Section - Central when no content, side when content */}
        <div className={`robot-section ${hasContent ? 'side-position' : 'center-position'}`}>
          <Robot3D speaking={isSpeaking} message={message} />
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
                <Blackboard 
                  traceLetter={letter} 
                  onClearBoard={async () => {
                    if (status === 'connected' && clientRef.current) {
                      const encouragements = [
                        'عاش! ممتاز!',
                        'رائع! استمر!',
                        'أحسنت!',
                        'ممتاز! أنت تتقدم!',
                        'عظيم! استمر في المحاولة!',
                        'رائع! أنت تتعلم بسرعة!',
                        'ممتاز! أنت مبدع!',
                        'عاش! أنت تفعل ذلك بشكل رائع!'
                      ];
                      const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
                      try {
                        await clientRef.current.speak(randomEncouragement);
                      } catch (error) {
                        console.log('Voice feedback error:', error);
                      }
                    }
                  }}
                />
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

            {stage === 'song' && normalizedYoutubeUrl && (
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">🎵 أغنية الحرف {letter}</h3>
                <div className="song-container">
            <iframe 
              className="song-iframe"
              width="560" 
              height="315" 
              src={normalizedYoutubeUrl} 
              title="Letter Song" 
              frameBorder={0} 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
                </div>
              </div>
            )}
            {stage === 'outro' && (
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">🏁 الختام والتقييم</h3>
                <div className="outro-container">
                  <p className="outro-text">رائع! انتهينا من الدرس. اضغط على الاختبارات لبدء التقييم.</p>
                  <div className="outro-actions">
                    <a className="btn btn-success" href={normalizedYoutubeUrl} target="_blank" rel="noreferrer">🔗 فتح فيديو اليوتيوب</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions - Full Width */}
      {hasContent && (
        <div className="footer-actions">
          <button 
            className="btn btn-primary btn-large" 
            onClick={() => setStage('outro')}
            disabled={stage === 'outro'}
          >
            {stage === 'outro' ? '🏁 انتهى الدرس' : '📝 الاختبارات'}
          </button>
        </div>
      )}

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
                    onBlur={(e) => {
                      const next = toYouTubeEmbedUrl(e.target.value);
                      if (next) setYoutubeUrl(next);
                    }}
                    placeholder="https://www.youtube.com/watch?v=... أو youtu.be/..."
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

