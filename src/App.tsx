import { useEffect, useRef, useState } from 'react';
import { VoiceSdkClient } from './voiceSdkClient';
// import { LessonEngine } from './lessonEngine';
import { LETTERS } from './letters';
import { Robot3D } from './components/Robot3D';
import { Blackboard } from './Blackboard';
import Particles from './components/Particles';
import { BalloonsGame } from './components/BalloonsGame';
import { MultipleChoiceGame } from './components/MultipleChoiceGame';
import { ImageUpload } from './components/ImageUpload';
import { WordImageUpload } from './components/WordImageUpload';
import { AudioRecorder } from './components/AudioRecorder';

type ImageSelectionOption = {
  id: string;
  word: string;
  arabic: string;
  image?: string;
  isCorrect: boolean;
};

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

export default function App() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [mic, setMic] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<VoiceSdkClient | null>(null);
  const [letter, setLetter] = useState<'A' | 'B' | 'C'>('A');
  const [showBoth, setShowBoth] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [words, setWords] = useState(LETTERS['A'].words);
  const [, setSongUrl] = useState<string | undefined>(undefined);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('https://www.youtube.com/embed/1dfXcN3VJxE');
  const normalizedYoutubeUrl = toYouTubeEmbedUrl(youtubeUrl) || youtubeUrl;
  const [showControlModal, setShowControlModal] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [selectedGame, setSelectedGame] = useState<'balloons' | 'multiple-choice' | null>(null);
  const [letterImages, setLetterImages] = useState<Record<string, { capitalImage?: string; smallImage?: string }>>({});
  const [wordImages, setWordImages] = useState<Record<string, Record<string, string>>>({});
  const [letterRecordings, setLetterRecordings] = useState<Record<string, string>>({});
  const [letterRepetitionCount, setLetterRepetitionCount] = useState<Record<string, number>>({});
  const [isWaitingForStudentResponse, setIsWaitingForStudentResponse] = useState(false);
  // lesson stage tracking for progress bar and gating song to final stage
  type StageKey = 'intro' | 'words' | 'writing' | 'song' | 'outro' | 'image-selection';
  const stageOrder: StageKey[] = ['intro', 'words', 'writing', 'song', 'outro'];
  const [stage, setStage] = useState<StageKey>('intro');
  const [imageSelectionOptions, setImageSelectionOptions] = useState<ImageSelectionOption[]>([]);
  const [imageSelectionState, setImageSelectionState] = useState<{
    status: 'idle' | 'correct' | 'incorrect';
    selectedId?: string;
    feedbackMessage?: string;
  }>({ status: 'idle' });
  const stageIndex = stageOrder.indexOf(stage);
  const progressPercent = Math.round(((stageIndex + 1) / stageOrder.length) * 100);
  const stageLabels: Record<StageKey, string> = {
    intro: 'مقدمة',
    words: 'كلمات',
    writing: 'كتابة',
    song: 'أغنية',
    outro: 'ختام',
    'image-selection': 'اختيار الصور',
  };

  const applyStageVisuals = (targetStage: StageKey) => {
    setHasContent(true);
    setShowBoth(targetStage === 'intro');
    setShowWords(targetStage === 'words');
    setShowBoard(targetStage === 'writing');
    setShowGameSelection(targetStage === 'outro');
    setSelectedGame(null);
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
          prompt: `من فضلك نفّذ مرحلة الختام والتقييم للحرف ${letter} الآن. قدم للأطفال خيارين للعب: لعبة البالونات أو لعبة الاختيارات.`,
          fallback: `انتقلت إلى مرحلة الختام لحرف ${letter}. عند الاتصال سيقود الروبوت التقييم ويقدم خيارات الألعاب.`,
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
      clientRef.current?.disconnect().catch(() => { });
    };
  }, []);

  const connect = async () => {
    if (!audioRef.current) return;
    try {
      setStatus('connecting');
      const client = new VoiceSdkClient();
      client.attachAudioElement(audioRef.current);
      client.setUiHooks({
        clearVisuals: () => {
          setShowBoth(false);
          setShowBoard(false);
          setShowWords(false);
          setShowGameSelection(false);
          setSelectedGame(null);
          setSongUrl(undefined);
          setHasContent(false);
          // do not change stage here
        },
        showLetter: (L) => { setMessage(`الحرف ${L}`); setHasContent(true); setStage('intro'); },
        showBoth: () => {
          setShowBoth(true);
          setShowBoard(false);
          setShowWords(false);
          setShowGameSelection(false);
          setSelectedGame(null);
          setSongUrl(undefined);
          setHasContent(true);
          setStage('intro');
        },
        showBlackboard: () => {
          setShowBoard(true);
          setShowBoth(false);
          setShowWords(false);
          setShowGameSelection(false);
          setSelectedGame(null);
          setSongUrl(undefined);
          setHasContent(true);
          setStage('writing');
        },
        showWords: (ws) => {
          setWords(ws);
          setShowWords(true);
          setShowBoth(false);
          setShowBoard(false);
          setShowGameSelection(false);
          setSelectedGame(null);
          setSongUrl(undefined);
          setHasContent(true);
          setStage('words');
        },
        showSong: (url) => {
          setSongUrl(url);
          setShowBoth(false);
          setShowBoard(false);
          setShowWords(false);
          setShowGameSelection(false);
          setSelectedGame(null);
          setHasContent(true);
          setStage('song');
        },
        showGameSelection: () => {
          setShowGameSelection(true);
          setShowBoth(false);
          setShowBoard(false);
          setShowWords(false);
          setSongUrl(undefined);
          setSelectedGame(null);
          setHasContent(true);
          setStage('outro');
        },
        setLetter: (L) => { const U = (L.toUpperCase() as keyof typeof LETTERS); if (LETTERS[U]) { setLetter(U as any); setWords(LETTERS[U].words); } },
        updateRepetitionCount: (letter: string, count: number) => {
          updateLetterRepetitionCount(letter, count);
        },
        resetRepetitionCount: (letter: string) => {
          resetLetterRepetitionCount(letter);
        },
        playLetterRecording: async (letter: string) => {
          await playLetterRecordingForLetter(letter);
        },
        stopLetterRecording: async () => {
          await stopLetterRecordingForLetter();
        },
        waitForStudentResponse: async ({ timeoutMs }: { timeoutMs?: number } = {}) => {
          const effectiveTimeout = typeof timeoutMs === 'number' ? timeoutMs : 8000;
          setIsWaitingForStudentResponse(true);
          // Duck output audio while listening to reduce echo/latency
          const audioEl = audioRef.current;
          const prevVolume = audioEl ? audioEl.volume : 1;
          if (audioEl) audioEl.volume = 0.2;
          try {
            const response = await clientRef.current?.awaitUserSpeech(effectiveTimeout);
            return response || '';
          } finally {
            if (audioEl) audioEl.volume = prevVolume;
            setIsWaitingForStudentResponse(false);
          }
        },
        // helpers for tools that pass only letter
        ...({
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
          showImageSelectionForLetter: (L: string) => {
            const U = L.toUpperCase() as keyof typeof LETTERS;
            setWords(LETTERS[U]?.words || []);
            setShowWords(false);
            setShowBoth(false);
            setShowBoard(false);
            setShowImageSelection(true);
            setSongUrl(undefined);
            setHasContent(true);
            setStage('image-selection');
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

  const updateLetterImage = (letter: string, type: 'capital' | 'small', imagePath: string | null) => {
    setLetterImages(prev => ({
      ...prev,
      [letter]: {
        ...prev[letter],
        [`${type}Image`]: imagePath || undefined
      }
    }));
  };

  const getLetterImage = (letter: string, type: 'capital' | 'small'): string | undefined => {
    return letterImages[letter]?.[`${type}Image`];
  };

  const updateWordImage = (letter: string, word: string, imagePath: string | null) => {
    setWordImages(prev => ({
      ...prev,
      [letter]: {
        ...prev[letter],
        [word]: imagePath || ''
      }
    }));
  };

  const getWordImage = (letter: string, word: string): string | undefined => {
    return wordImages[letter]?.[word];
  };

  const updateLetterRecording = (letter: string, audioBlob: Blob | null) => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      setLetterRecordings(prev => ({
        ...prev,
        [letter]: audioUrl
      }));
    } else {
      setLetterRecordings(prev => {
        const newRecordings = { ...prev };
        if (newRecordings[letter]) {
          URL.revokeObjectURL(newRecordings[letter]);
          delete newRecordings[letter];
        }
        return newRecordings;
      });
    }
  };

  const getLetterRecording = (letter: string): string | undefined => {
    return letterRecordings[letter];
  };

  const hasLetterRecording = (letter: string): boolean => {
    return !!letterRecordings[letter];
  };

  const getLetterRepetitionCount = (letter: string): number => {
    return letterRepetitionCount[letter] || 0;
  };

  const updateLetterRepetitionCount = (letter: string, count: number) => {
    setLetterRepetitionCount(prev => ({
      ...prev,
      [letter]: count
    }));
  };

  const resetLetterRepetitionCount = (letter: string) => {
    setLetterRepetitionCount(prev => ({
      ...prev,
      [letter]: 0
    }));
  };

  const playLetterRecordingForLetter = async (letter: string) => {
    const recordingUrl = getLetterRecording(letter);
    if (recordingUrl && clientRef.current) {
      await clientRef.current.waitForAgentSilence?.(2000);
      await new Promise(resolve => setTimeout(resolve, 250));
      await clientRef.current.playLetterRecording(recordingUrl);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  };

  const stopLetterRecordingForLetter = async () => {
    await clientRef.current?.stopLetterRecording();
  };


  // Image Selection Game
  const generateImageSelectionOptions = (currentLetter: string) => {
    const currentLetterWords = LETTERS[currentLetter]?.words || [];

    const correctWord = currentLetterWords[0];
    const correctOption = correctWord ? {
      word: correctWord.word,
      arabic: correctWord.arabic,
      image: getWordImage(currentLetter, correctWord.word) || correctWord.image,
      isCorrect: true,
    } : null;

    const otherLetters = Object.keys(LETTERS).filter(l => l !== currentLetter);
    const incorrectOptions: ImageSelectionOption[] = [];

    while (incorrectOptions.length < 3 && otherLetters.length) {
      const randomLetter = otherLetters[Math.floor(Math.random() * otherLetters.length)];
      const words = LETTERS[randomLetter].words;
      if (words?.length) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        incorrectOptions.push({
          word: randomWord.word,
          arabic: randomWord.arabic,
          image: getWordImage(randomLetter, randomWord.word) || randomWord.image,
          isCorrect: false,
          id: `${randomLetter}-${randomWord.word}`,
        });
      } else {
        otherLetters.splice(otherLetters.indexOf(randomLetter), 1);
      }
    }

    const options = correctOption ? [
      { ...correctOption, id: `${currentLetter}-${correctOption.word}` },
      ...incorrectOptions,
    ] : incorrectOptions.map((opt, index) => ({ ...opt, id: opt.id ?? `incorrect-${index}` }));

    return options
      .map(opt => opt.id ? opt : { ...opt, id: `${opt.word}-${opt.arabic}` })
      .sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    if (showImageSelection) {
      setImageSelectionOptions(generateImageSelectionOptions(letter));
      setImageSelectionState({ status: 'idle' });
      if (status === 'connected' && clientRef.current) {
        const prompt = `حان الآن وقت لعبة الصور. اختَر الصورة التي تبدأ بحرف ${letter}.`;
        clientRef.current.speak(prompt).catch(() => {
          setMessage(`اختر الصورة الصحيحة لحرف ${letter}`);
        });
      } else {
        setMessage(`اختر الصورة الصحيحة لحرف ${letter}`);
      }
    }
  }, [showImageSelection, letter, status]);

  const handleImageSelection = (option: ImageSelectionOption) => {
    if (imageSelectionState.status !== 'idle') return;
    if (option.isCorrect) {
      setImageSelectionState({
        status: 'correct',
        selectedId: option.id,
        feedbackMessage: 'أحسنت! هذا هو الاختيار الصحيح.'
      });
      if (status === 'connected' && clientRef.current) {
        clientRef.current.speak('أحسنت! هذا هو الاختيار الصحيح. هل أنت جاهز للمرحلة التالية؟').catch(() => {
          setMessage('أحسنت! هذا هو الاختيار الصحيح. هل أنت جاهز للمرحلة التالية؟');
        });
      } else {
        setMessage('أحسنت! هذا هو الاختيار الصحيح. هل أنت جاهز للمرحلة التالية؟');
      }
      setTimeout(() => {
        setImageSelectionState({ status: 'idle', selectedId: undefined });
        setShowImageSelection(false);
        handleStageSelect('writing');
      }, 2000);
    } else {
      const correctOption = imageSelectionOptions.find(opt => opt.isCorrect);
      const correctWord = correctOption?.word;
      setImageSelectionState({
        status: 'incorrect',
        selectedId: option.id,
        feedbackMessage: correctWord
          ? `خطأ. حاول أن تجد الصورة التي تبدأ بكلمة ${correctWord}.`
          : 'خطأ. حاول اختيار الصورة الصحيحة.'
      });
      if (status === 'connected' && clientRef.current) {
        const incorrectPrompt = correctWord
          ? `خطأ. تذكر أن تختار الصورة التي تبدأ بكلمة ${correctWord}.`
          : 'خطأ. حاول اختيار الصورة الصحيحة.';
        clientRef.current.speak(incorrectPrompt).catch(() => {
          setMessage(incorrectPrompt);
        });
      } else {
        setMessage(correctWord
          ? `خطأ. تذكر أن تختار الصورة التي تبدأ بكلمة ${correctWord}.`
          : 'خطأ. حاول اختيار الصورة الصحيحة.');
      }
      setTimeout(() => {
        setImageSelectionState({ status: 'idle', selectedId: undefined });
      }, 2000);
    }
  };

  return (
    <div className="app">
      <Particles
        particleColors={['#ffffff', '#ffffff']}
        particleCount={200}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />
      {/* Header - Glass design with inline settings */}
      <div className="header glass-lg">
        <div className="header-content">
          <div className="header-titles">
            <h1 className="main-title">🤖 روبوت تعليم الحروف</h1>
            <p className="subtitle">تعليم الحروف الإنجليزية باستخدام ذكاء اصطناعي صوتي تفاعلي</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-accent header-mic-btn"
              onClick={toggleMic}
              disabled={status !== 'connected'}
              aria-label={mic ? 'كتم المايكروفون' : 'تشغيل المايكروفون'}
            >
              {mic ? '🔇 كتم المايك' : '🎤 تشغيل المايك'}
            </button>
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
          <div className="robot-section-inner">
            <Robot3D speaking={isSpeaking} message={message} />
          </div>
        </div>

        {/* Content Area - Only visible when there's content */}
        {hasContent && (
          <div className="content-area animate-slideInLeft">
            {showBoth && (
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">الأشكال المختلفة للحرف {letter}</h3>
                
                {/* Repetition Progress */}
                {stage === 'intro' && (
                  <div className="repetition-progress">
                    <div className="progress-header">
                      <h4 className="progress-title">🎯 مرحلة تكرار النطق</h4>
                      <div className="progress-counter">
                        {getLetterRepetitionCount(letter)} / 5
                      </div>
                    </div>
                    
                    <div className="progress-bars">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div 
                          key={step}
                          className={`progress-bar-step ${step <= getLetterRepetitionCount(letter) ? 'completed' : ''}`}
                        >
                          <div className="step-number">{step}</div>
                          <div className="step-indicator">
                            {step <= getLetterRepetitionCount(letter) ? '✅' : '⏳'}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {isWaitingForStudentResponse && (
                      <div className="waiting-indicator">
                        <div className="waiting-icon">🎤</div>
                        <div className="waiting-text">نستمع لرد الطلاب...</div>
                      </div>
                    )}

                    {getLetterRepetitionCount(letter) >= 5 && (
                      <div className="completion-message">
                        <div className="completion-icon">🎉</div>
                        <div className="completion-text">ممتاز! أكملت نطق الحرف 5 مرات</div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="both-letters-container">
                  <div className="letter-variant">
                    <div className="variant-label">صغير</div>
                    {getLetterImage(letter, 'small') ? (
                      <div className="variant-image">
                        <img 
                          src={getLetterImage(letter, 'small')} 
                          alt={`حرف ${letter} صغير`}
                          className="letter-image"
                        />
                      </div>
                    ) : (
                      <div className="variant-letter">{LETTERS[letter].small}</div>
                    )}
                  </div>
                  <div className="letter-variant">
                    <div className="variant-label">كبير</div>
                    {getLetterImage(letter, 'capital') ? (
                      <div className="variant-image">
                        <img 
                          src={getLetterImage(letter, 'capital')} 
                          alt={`حرف ${letter} كبير`}
                          className="letter-image"
                        />
                      </div>
                    ) : (
                      <div className="variant-letter">{LETTERS[letter].capital}</div>
                    )}
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
                  {words.map((w, i) => {
                    const customImage = getWordImage(letter, w.word);
                    const displayImage = customImage || w.image;
                    
                    return (
                      <div key={i} className="word-card">
                        {displayImage && (
                          <div className="word-image-container">
                            <img src={displayImage} alt={w.word} className="word-image" />
                          </div>
                        )}
                        <div className="word-english">{w.word}</div>
                        <div className="word-arabic">{w.arabic}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showImageSelection && (
              <div className="content-panel animate-fadeInUp">
                <h3 className="content-title">🎯 اختر الصورة التي تبدأ بحرف {letter}</h3>
                {imageSelectionState.feedbackMessage && (
                  <div className={`image-selection-feedback ${imageSelectionState.status}`}>
                    {imageSelectionState.feedbackMessage}
                  </div>
                )}
                <div className="image-selection-grid">
                  {imageSelectionOptions.map((option, i) => {
                    const isSelected = imageSelectionState.selectedId === option.id;
                    const statusClass = imageSelectionState.status === 'correct' && isSelected
                      ? 'correct'
                      : imageSelectionState.status === 'incorrect' && isSelected
                        ? 'incorrect'
                        : '';
                    return (
                      <div 
                        key={option.id ?? i}
                        className={`image-selection-card ${statusClass}`}
                        onClick={() => handleImageSelection(option)}
                      >
                        <div className="image-selection-container">
                          <img src={option.image} alt={option.word} className="image-selection-image" />
                        </div>
                        <div className="image-selection-word">{option.word}</div>
                        <div className="image-selection-arabic">{option.arabic}</div>
                      </div>
                    );
                  })}
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
            {showGameSelection && !selectedGame && (
              <div className="content-panel animate-scaleIn">
                <h3 className="content-title">🎮 اختر لعبة للعب</h3>
                <div className="game-selection-container">
                  <p className="game-selection-text">رائع! انتهينا من الدرس. الآن يمكنك اختيار لعبة للعب:</p>
                  <div className="game-options">
                    <button 
                      className="game-option-btn balloons-option"
                      onClick={() => setSelectedGame('balloons')}
                    >
                      <div className="game-icon">🎈</div>
                      <div className="game-title">لعبة البالونات</div>
                      <div className="game-description">انقر على البالونات التي تحتوي على حرف {letter}</div>
                    </button>
                    <button 
                      className="game-option-btn multiple-choice-option"
                      onClick={() => setSelectedGame('multiple-choice')}
                    >
                      <div className="game-icon">🎯</div>
                      <div className="game-title">لعبة الاختيارات</div>
                      <div className="game-description">اختر الإجابة الصحيحة لكل سؤال</div>
                    </button>
                  </div>
                  <div className="game-selection-footer">
                    <button 
                      className="finish-lesson-btn"
                      onClick={() => {
                        setShowGameSelection(false);
                        setHasContent(false);
                      }}
                    >
                      ✅ انهي الدرس
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedGame === 'balloons' && (
              <div className="content-panel animate-scaleIn">
                <BalloonsGame 
                  targetLetter={letter} 
                  onGameComplete={() => {
                    setSelectedGame(null);
                    // Keep showGameSelection true to show game selection again
                    setShowGameSelection(true);
                    setHasContent(true);
                  }} 
                />
              </div>
            )}

            {selectedGame === 'multiple-choice' && (
              <div className="content-panel animate-scaleIn">
                <MultipleChoiceGame 
                  targetLetter={letter} 
                  onGameComplete={() => {
                    setSelectedGame(null);
                    // Keep showGameSelection true to show game selection again
                    setShowGameSelection(true);
                    setHasContent(true);
                  }} 
                />
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
                      const L = (e.target.value as 'A' | 'B' | 'C');
                      setLetter(L);
                      setWords(LETTERS[L].words);
                    }}
                  >
                    {Object.keys(LETTERS).map((L) => <option key={L} value={L}>{L}</option>)}
                  </select>
                </div>
              </div>

              <div className="control-section">
                <div className="section-label">تسجيل نطق حرف {letter}</div>
                <AudioRecorder
                  letter={letter}
                  currentRecording={getLetterRecording(letter)}
                  onRecordingChange={(audioBlob) => updateLetterRecording(letter, audioBlob)}
                />
              </div>

              <div className="control-section">
                <div className="section-label">صور الحرف {letter}</div>
                <div className="letter-images-section">
                  <ImageUpload
                    label="صورة الحرف الكبير (Capital)"
                    currentImage={getLetterImage(letter, 'capital')}
                    onImageChange={(imagePath) => updateLetterImage(letter, 'capital', imagePath)}
                  />
                  <ImageUpload
                    label="صورة الحرف الصغير (Small)"
                    currentImage={getLetterImage(letter, 'small')}
                    onImageChange={(imagePath) => updateLetterImage(letter, 'small', imagePath)}
                  />
                </div>
              </div>

              <div className="control-section">
                <div className="section-label">صور كلمات حرف {letter}</div>
                <div className="word-images-section">
                  {LETTERS[letter].words.map((word, index) => (
                    <WordImageUpload
                      key={index}
                      word={word.word}
                      arabic={word.arabic}
                      currentImage={getWordImage(letter, word.word)}
                      onImageChange={(imagePath) => updateWordImage(letter, word.word, imagePath)}
                    />
                  ))}
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
                {!hasLetterRecording(letter) && (
                  <div className="lesson-warning">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-text">
                      يجب تسجيل نطق حرف {letter} قبل بدء الدرس
                    </div>
                  </div>
                )}
                <button
                  className={`btn btn-large ${hasLetterRecording(letter) ? 'btn-success' : 'btn-secondary'}`}
                  onClick={async () => {
                    if (!hasLetterRecording(letter)) {
                      alert(`يجب تسجيل نطق حرف ${letter} أولاً قبل بدء الدرس`);
                      return;
                    }
                    try {
                      // Reset repetition count
                      updateLetterRepetitionCount(letter, 0);
                      
                      // Start the intro stage
                      setStage('intro');
                      setShowBoth(true);
                      setHasContent(true);
                      
                      // Let the Voice Agent handle everything
                      const lessonPrompt = `ابدأ درس حرف ${letter} بالكامل باتباع الخطة المحدّثة.`;
                      
                      if (clientRef.current) {
                        await clientRef.current.speak(lessonPrompt);
                      }
                      
                      setShowControlModal(false);
                    } catch (error) {
                      console.error('Error starting lesson:', error);
                      alert('حدث خطأ في بدء الدرس');
                    }
                  }}
                  disabled={status !== 'connected' || !hasLetterRecording(letter)}
                >
                  {hasLetterRecording(letter) ? '🚀 ابدأ الدرس' : '⚠️ يجب تسجيل النطق أولاً'}
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

