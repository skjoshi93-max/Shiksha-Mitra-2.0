import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Presentation,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  Award,
  Play,
  Pause,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Compass,
  FileText,
  Clock,
  Volume2,
  VolumeX,
  Cast,
  Eye,
  Settings,
  Sliders,
  Radio,
  Globe,
  Users,
} from 'lucide-react';
import {
  CourseModule,
  CourseData,
  SlideItem,
  generateAndDownloadTrainingPptx,
} from '../../lib/courseModulesData';
import {
  lifelikeAudioEngine,
  NarrationLanguage,
  NarrationVoiceGender,
} from '../../lib/lifelikeAudioEngine';

interface InteractivePptViewerProps {
  course: CourseData;
  currentModule: CourseModule;
  onCompleteModule: (moduleId: string) => void;
  isCompleted: boolean;
  onNextModule?: () => void;
  narrationLanguage?: NarrationLanguage;
  voiceGender?: NarrationVoiceGender;
  onLanguageChange?: (lang: NarrationLanguage) => void;
  onVoiceGenderChange?: (gender: NarrationVoiceGender) => void;
}

type TransitionStyle = 'slideWipe' | 'executiveFade' | 'dynamicZoom' | 'corporateFlip';

export const InteractivePptViewer: React.FC<InteractivePptViewerProps> = ({
  course,
  currentModule,
  onCompleteModule,
  isCompleted,
  onNextModule,
  narrationLanguage = 'bilingual',
  voiceGender = 'female',
  onLanguageChange,
  onVoiceGenderChange,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  // Auto-play and Lifelike Narration MUST BE STRICTLY OFF BY DEFAULT (Manual user interaction only)
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoAdvanceSpeed, setAutoAdvanceSpeed] = useState<number>(8); // seconds per slide
  const [autoProgress, setAutoProgress] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showPresenterNotes, setShowPresenterNotes] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('slideWipe');
  const [transitionAnimClass, setTransitionAnimClass] = useState<string>('animate-fadeInUp');
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState<boolean>(true);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastNarratedSlideRef = useRef<number>(-1);

  const slides = currentModule.slides || [];
  const currentSlide = slides[currentSlideIndex] || slides[0];

  // Stop any lingering speech on component mount
  useEffect(() => {
    lifelikeAudioEngine.stop();
    return () => {
      lifelikeAudioEngine.stop();
    };
  }, []);

  // Lifelike Narration for current slide: ONLY plays if user has explicitly activated isNarrating
  useEffect(() => {
    if (!isNarrating) {
      lifelikeAudioEngine.stop();
      return;
    }

    if (lastNarratedSlideRef.current !== currentSlideIndex) {
      lastNarratedSlideRef.current = currentSlideIndex;

      const script = `${currentSlide.title}. ${currentSlide.subtitle}. Key points: ${currentSlide.keyPoints.join('. ')}. Key takeaway: ${currentSlide.takeaway}`;
      lifelikeAudioEngine.speak(script, {
        language: narrationLanguage,
        voiceGender,
        autoPlay: false,
        volume: 0.9,
        playbackSpeed: 1.0,
      });
    }
  }, [currentSlideIndex, currentSlide, isNarrating, narrationLanguage, voiceGender]);

  // Reset slide index on module change (Strictly pause and silence audio)
  useEffect(() => {
    setCurrentSlideIndex(0);
    lastNarratedSlideRef.current = -1;
    setIsAutoPlaying(false);
    setIsNarrating(false);
    lifelikeAudioEngine.stop();
  }, [currentModule.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowPresenterNotes(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length]);

  // Slideshow auto-play countdown with smooth progress bar
  useEffect(() => {
    let progressTimer: NodeJS.Timeout | null = null;
    if (isAutoPlaying) {
      const intervalMs = 50;
      const step = (100 / (autoAdvanceSpeed * 1000)) * intervalMs;

      progressTimer = setInterval(() => {
        setAutoProgress(prev => {
          const next = prev + step;
          if (next >= 100) {
            return 100;
          }
          return next;
        });
      }, intervalMs);
    } else {
      setAutoProgress(0);
    }
    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isAutoPlaying, autoAdvanceSpeed]);

  const triggerSlideAnimation = (direction: 'next' | 'prev') => {
    lifelikeAudioEngine.playHarmonicChime(direction === 'next' ? 680 : 520, 0.12);
    setTransitionAnimClass('opacity-0 scale-98');
    setTimeout(() => {
      setTransitionAnimClass('animate-in fade-in zoom-in-95 duration-300');
    }, 40);
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      triggerSlideAnimation('next');
      setCurrentSlideIndex(prev => prev + 1);
    } else {
      // Reached final slide: mark complete
      onCompleteModule(currentModule.id);
      setIsAutoPlaying(false);
    }
  };

  // Auto-advance slide when progress bar reaches 100%
  useEffect(() => {
    if (isAutoPlaying && autoProgress >= 100) {
      setAutoProgress(0);
      handleNextSlide();
    }
  }, [autoProgress, isAutoPlaying, currentSlideIndex, slides.length]);

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      triggerSlideAnimation('prev');
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleDownloadPptx = async () => {
    setIsDownloading(true);
    try {
      await generateAndDownloadTrainingPptx(course, currentModule);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleToggleNarration = () => {
    const nextState = !isNarrating;
    setIsNarrating(nextState);
    if (nextState) {
      lastNarratedSlideRef.current = -1;
    } else {
      lifelikeAudioEngine.stop();
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#1E3A5F]/40 bg-[#0B1E36] p-4 sm:p-5 text-white shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-900 border border-blue-700/60 text-white shadow-md">
            <Presentation className="h-6 w-6 text-sky-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-950/80 border border-blue-800 px-2 py-0.5 text-[10px] font-black text-sky-300 uppercase tracking-wider">
                Module {currentModule.moduleIndex} Deck • Slide {currentSlideIndex + 1} of {slides.length}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                16:9 Widescreen Executive
              </span>
              <span className="flex items-center gap-1 rounded-md bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> iGOT Karmayogi Accredited
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white mt-1">
              {currentModule.title} (Executive Presentation Deck)
            </h2>
          </div>
        </div>

        {/* Action Buttons: Slide Narration, Presenter Notes, Download PPTX */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Explicit Manual Voice Narration Play/Pause Button */}
          <button
            id="ppt-top-narration-toggle"
            onClick={handleToggleNarration}
            className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              isNarrating
                ? 'border-amber-400 bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Play / Pause Lifelike Audio Narration for Current Slide"
          >
            {isNarrating ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            <span>{isNarrating ? 'Audio Playing' : 'Play Slide Audio'}</span>
          </button>

          {/* Toggle Presenter Notes Button */}
          <button
            onClick={() => setShowPresenterNotes(prev => !prev)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
              showPresenterNotes
                ? 'border-sky-400 bg-sky-950/60 text-sky-200'
                : 'border-white/20 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
            }`}
            title="Toggle Presenter Speaker Notes [N]"
          >
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            <span>Notes [N]</span>
          </button>

          {/* Download Real PPTX Button */}
          <button
            onClick={handleDownloadPptx}
            disabled={isDownloading}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-2 text-xs font-black text-white hover:from-blue-600 hover:to-indigo-600 border border-blue-500/40 shadow-md shadow-blue-700/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            title="Download Real Microsoft PowerPoint Presentation (.pptx)"
          >
            <Download className={`h-4 w-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Exporting PPTX...' : 'Download Deck (.pptx)'}</span>
          </button>
        </div>
      </div>

      {/* Main PPT Slide Stage (16:9 Presentation Frame) */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full rounded-3xl overflow-hidden bg-[#06152B] border border-[#1E3A5F] shadow-2xl flex flex-col justify-between"
      >
        {/* Active Slide Presentation Canvas */}
        <div className={`h-full w-full p-6 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-[#06152B] via-[#0B2545] to-[#0A192F] text-white select-none ${transitionAnimClass}`}>
          {/* Slide Top Band: Official Mission Karmayogi Insignia & Category */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-blue-900/90 border border-blue-500/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-300">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
                <span>iGOT Karmayogi Bharat</span>
              </div>
              <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                {currentSlide.category}
              </span>
              <span className="hidden md:inline-block text-xs font-bold text-slate-300">
                {course.title} • Module {currentModule.moduleIndex}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
              <span className="hidden sm:inline-block text-slate-400">NEP 2020 & PARAKH Standard</span>
              <span className="hidden sm:inline-block">•</span>
              <span className="text-amber-300 font-black">
                SLIDE {currentSlideIndex + 1} OF {slides.length}
              </span>
            </div>
          </div>

          {/* Slide Main Content Zone: Two-Column Corporate Layout */}
          <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 py-4">
            {/* Left Column: Heading & Core Instructional Points */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
                  {currentSlide.title}
                </h1>
                <p className="mt-1.5 text-sm sm:text-base font-semibold text-sky-300">
                  {currentSlide.subtitle}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 inline-block" />
                  Core Instructional Principles & Pedagogy
                </h3>
                {currentSlide.keyPoints.map((pt, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-xs hover:bg-white/10 transition-colors"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white text-[10px] font-black">
                      {pIdx + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                      {pt}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Framework Breakdown Bento Cards */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                Framework Execution Protocol
              </h3>
              <div className="space-y-2.5">
                {currentSlide.framework.map((f, fIdx) => (
                  <div
                    key={fIdx}
                    className="rounded-2xl bg-[#0B223D]/90 border border-[#1E3A5F] p-3.5 shadow-sm space-y-1 hover:border-sky-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <h4 className="text-xs font-black text-amber-300">
                        {f.label}
                      </h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed pl-5 font-normal">
                      {f.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slide Footer Band: Key-Takeaway Highlight Badge */}
          <div className="rounded-2xl bg-[#081B33]/90 border border-amber-400/40 p-3.5 sm:p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-sm shrink-0">
                ★
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-100">
                <span className="text-white font-black">Key Takeaway:</span> {currentSlide.takeaway}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-sky-300 shrink-0 pl-3">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified Curriculum • DoPT Standards
            </div>
          </div>
        </div>

        {/* Slideshow Auto-Play Progress Ticker Bar */}
        {isAutoPlaying && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${autoProgress}%` }}
            />
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="bg-[#07172C]/95 border-t border-[#1E3A5F] px-6 py-3 flex items-center justify-between text-white text-xs backdrop-blur-md">
          {/* Left Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold"
            >
              <ChevronLeft className="h-4 w-4" /> Prev Slide
            </button>

            <button
              onClick={handleNextSlide}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer font-bold shadow-md shadow-blue-600/30"
            >
              <span>{currentSlideIndex === slides.length - 1 ? 'Finish Module' : 'Next Slide'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Slide Index Pill */}
            <span className="font-mono text-slate-300 ml-2">
              Slide {currentSlideIndex + 1} of {slides.length}
            </span>
          </div>

          {/* Right Slideshow & View Controls */}
          <div className="flex items-center gap-3">
            {/* Explicit Manual Play/Pause Narration Button */}
            <button
              id="ppt-slide-play-narration-btn"
              onClick={handleToggleNarration}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isNarrating
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/30'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
              title="Manual Trigger: Play / Pause Voice Narration for Current Slide"
            >
              {isNarrating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isNarrating ? 'Pause Audio' : 'Play Slide Audio'}</span>
            </button>

            {/* Auto-Play Pacing Toggle */}
            <button
              onClick={() => setIsAutoPlaying(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAutoPlaying ? 'bg-sky-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
              title="Toggle Slide Auto-Advance Timer"
            >
              {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>{isAutoPlaying ? 'Auto-Advancing' : 'Manual Pacing'}</span>
            </button>

            {/* Speed Selector */}
            {isAutoPlaying && (
              <div className="flex items-center gap-1 rounded-xl bg-white/10 p-0.5 text-[10px] font-bold">
                {[5, 8, 12].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setAutoAdvanceSpeed(speed)}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      autoAdvanceSpeed === speed ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {speed}s
                  </button>
                ))}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Fullscreen Mode [F]"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Presenter Speaker Notes Drawer (Collapsible) */}
      {showPresenterNotes && (
        <div className="rounded-3xl border border-blue-200/80 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-[#0A1D37] shadow-sm space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-950 dark:text-sky-200">
              <FileText className="h-4 w-4 text-blue-600 dark:text-sky-400" /> Presenter Speaker Script & Pedagogical Notes
            </div>
            <span className="text-[10px] font-mono text-blue-800 dark:text-sky-300">
              Slide {currentSlideIndex + 1}: {currentSlide.title}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            In this section, emphasize <span className="font-bold text-slate-900 dark:text-white">{currentSlide.title}</span>. Guide learners through the <span className="font-semibold">{currentSlide.category}</span> framework and reinforce how <span className="text-blue-700 dark:text-sky-300 font-semibold">{currentSlide.takeaway}</span> directly elevates student conceptual understanding.
          </p>
        </div>
      )}

      {/* Slide Thumbnails Navigation Carousel */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <Layers className="h-4 w-4 text-blue-600 dark:text-sky-400" /> Deck Slides Grid ({slides.length} Slides)
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Click any slide to jump directly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {slides.map((s, idx) => {
            const isCurrent = idx === currentSlideIndex;
            return (
              <button
                key={s.id}
                onClick={() => {
                  triggerSlideAnimation(idx > currentSlideIndex ? 'next' : 'prev');
                  setCurrentSlideIndex(idx);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50/90 dark:border-sky-500 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-black font-mono">
                  <span className={isCurrent ? 'text-blue-700 dark:text-sky-400 font-black' : 'text-slate-500'}>
                    SLIDE {idx + 1}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 truncate max-w-[70px]">
                    {s.category}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {s.title}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {s.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
