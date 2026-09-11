import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  CheckCircle2,
  Clock,
  Subtitles,
  Sparkles,
  Award,
  Video,
  Settings,
  RotateCcw,
  FastForward,
  ChevronRight,
  ShieldCheck,
  Radio,
  Sliders,
  Check,
  ChevronDown,
  FileVideo,
  Zap,
  Globe,
  Users,
  UserCheck,
} from 'lucide-react';
import {
  CourseModule,
  CourseData,
  VideoResolution,
  VideoContainerFormat,
  generateAndDownloadLectureVideoMultiFormat,
} from '../../lib/courseModulesData';
import {
  lifelikeAudioEngine,
  NarrationLanguage,
  NarrationVoiceGender,
} from '../../lib/lifelikeAudioEngine';

interface VideoCoursePlayerProps {
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

export const VideoCoursePlayer: React.FC<VideoCoursePlayerProps> = ({
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
  // Auto-play DEFAULT OFF for video lecture (Strict manual user-initiated playback)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0); // in seconds (0 to 300)
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showThumbnailOverlay, setShowThumbnailOverlay] = useState<boolean>(false);

  // Quality Selector State
  const [selectedQuality, setSelectedQuality] = useState<VideoResolution>('1080p');
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  // Multi-Format Download Dropdown State (Z-INDEX FIX: z-[9999])
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);
  const [downloadFormat, setDownloadFormat] = useState<VideoContainerFormat>('mp4');
  const [downloadResolution, setDownloadResolution] = useState<VideoResolution>('1080p');

  // Speaking state for avatar lip-sync and audio visualizer
  const [isSpeakingLive, setIsSpeakingLive] = useState<boolean>(false);
  const [activeSpeakerRole, setActiveSpeakerRole] = useState<'female' | 'male'>('female');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNarratedChapterRef = useRef<string>('');

  const duration = currentModule.durationSeconds || 300; // 5 minutes (300 seconds)

  // Current Chapter & Caption calculation based on currentTime
  const currentChapter = [...currentModule.chapters]
    .reverse()
    .find(ch => currentTime >= ch.timestamp) || currentModule.chapters[0];

  const formatTime = (secs: number): string => {
    const clamped = Math.max(0, Math.min(duration, Math.floor(secs)));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Connect speaking listener to lifelike audio engine
  useEffect(() => {
    lifelikeAudioEngine.setSpeakingListener((speaking, speaker) => {
      setIsSpeakingLive(speaking);
      setActiveSpeakerRole(speaker);
    });
  }, []);

  // Auto-Play Lifelike Narration whenever chapter changes or module loads
  useEffect(() => {
    if (!isPlaying) {
      lifelikeAudioEngine.stop();
      return;
    }

    const chapterKey = `${currentModule.id}_${currentChapter.timestamp}`;
    if (lastNarratedChapterRef.current !== chapterKey) {
      lastNarratedChapterRef.current = chapterKey;
      
      const script = `${currentChapter.title}. ${currentChapter.caption}. ${currentChapter.description}`;
      lifelikeAudioEngine.speak(
        script,
        {
          language: narrationLanguage,
          voiceGender,
          autoPlay: true,
          volume: isMuted ? 0 : volume,
          playbackSpeed,
        }
      );
    }
  }, [currentChapter, currentModule.id, isPlaying, narrationLanguage, voiceGender, isMuted, volume, playbackSpeed]);

  // Main playback timer loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    if (isPlaying) {
      const step = (now: number) => {
        const deltaSec = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        setCurrentTime(prev => {
          const next = prev + deltaSec * playbackSpeed;
          if (next >= duration) {
            return duration;
          }
          return next;
        });

        animationFrameId = requestAnimationFrame(step);
      };

      animationFrameId = requestAnimationFrame(step);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSpeed, duration]);

  // Handle video completion cleanly when currentTime reaches duration
  useEffect(() => {
    if (currentTime >= duration && isPlaying) {
      setIsPlaying(false);
      onCompleteModule(currentModule.id);
    }
  }, [currentTime, duration, isPlaying, currentModule.id, onCompleteModule]);

  // Reset audio & timestamp on module change (keep strictly paused)
  useEffect(() => {
    setCurrentTime(0);
    lastNarratedChapterRef.current = '';
    setIsPlaying(false);
    setShowThumbnailOverlay(false);
  }, [currentModule.id]);

  // Render Photorealistic Canvas Graphics & Corporate Avatar matching iGOT Karmayogi standards
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let waveOffset = 0;
    let blinkTimer = 0;
    let isBlinking = false;

    const render = () => {
      waveOffset += 0.05 * (isPlaying ? playbackSpeed : 0.15);
      blinkTimer += 0.016;

      if (blinkTimer > 3.8) {
        isBlinking = true;
        if (blinkTimer > 4.0) {
          isBlinking = false;
          blinkTimer = 0;
        }
      }

      const width = canvas.width;
      const height = canvas.height;

      // Executive Studio Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.4, '#0f172a');
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Studio Geometric Acoustic Panels / Architectural Lighting Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Left Section: Interactive Slide Board (16:9 Presentation Canvas)
      const slideW = width * 0.60;
      const slideH = height * 0.74;
      const slideX = width * 0.035;
      const slideY = height * 0.11;

      // Slide Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(slideX, slideY, slideW, slideH, 14);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Slide Header Bar
      const headerGrad = ctx.createLinearGradient(slideX, slideY, slideX + slideW, slideY);
      headerGrad.addColorStop(0, '#0f172a');
      headerGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = headerGrad;
      ctx.beginPath();
      ctx.roundRect(slideX, slideY, slideW, 46, [14, 14, 0, 0]);
      ctx.fill();

      // Slide Header Badges
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(
        `SHIKSHAMITRA PEDAGOGY • MODULE ${currentModule.moduleIndex} OF 4`,
        slideX + 18,
        slideY + 28
      );

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        `TIME: ${formatTime(currentTime)} / 05:00`,
        slideX + slideW - 150,
        slideY + 28
      );

      // Slide Body Content - Dynamic based on current chapter
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(currentChapter.title, slideX + 22, slideY + 82);

      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(`${course.subject} • ${course.classLevel || 'Class 1-12'} • ${course.board || 'CBSE / iGOT'}`, slideX + 22, slideY + 104);

      // Visual Framework Steps on Slide Board
      const boxY = slideY + 124;
      const boxW = (slideW - 60) / 3;
      const boxH = slideH - 162;

      const steps = [
        { label: '1. Inquire (CRA)', desc: 'Concrete Anchors & Prior Intuition', color: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
        { label: '2. Scaffold (5E)', desc: 'Active Discourse & Guided Modeling', color: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
        { label: '3. Formative Hinge', desc: 'Real-time Diagnostic Exit Check', color: '#fef3c7', border: '#fde68a', text: '#b45309' },
      ];

      steps.forEach((st, idx) => {
        const bx = slideX + 22 + idx * (boxW + 8);
        ctx.fillStyle = st.color;
        ctx.strokeStyle = st.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, boxY, boxW, boxH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = st.text;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(st.label, bx + 10, boxY + 24);

        ctx.fillStyle = '#334155';
        ctx.font = '10.5px system-ui, sans-serif';
        const words = st.desc.split(' ');
        ctx.fillText(words.slice(0, 2).join(' '), bx + 10, boxY + 48);
        ctx.fillText(words.slice(2).join(' '), bx + 10, boxY + 65);
      });

      // Slide Footer Takeaway Bar
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(slideX, slideY + slideH - 36, slideW, 36);
      ctx.fillStyle = '#475569';
      ctx.font = 'italic 10.5px system-ui, sans-serif';
      ctx.fillText(`Key Focus: ${currentChapter.description}`, slideX + 18, slideY + slideH - 14);

      // Right Section: Executive Presenter Studio Viewport
      const camW = width * 0.31;
      const camH = height * 0.46;
      const camX = width * 0.655;
      const camY = height * 0.11;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(camX, camY, camW, camH, 14);
      ctx.clip();

      // Studio Broadcast Backdrop
      const camBg = ctx.createLinearGradient(camX, camY, camX + camW, camY + camH);
      camBg.addColorStop(0, '#1e1b4b');
      camBg.addColorStop(0.5, '#0f172a');
      camBg.addColorStop(1, '#090d16');
      ctx.fillStyle = camBg;
      ctx.fillRect(camX, camY, camW, camH);

      // Warm studio accent lighting behind presenter
      const auraGrad = ctx.createRadialGradient(camX + camW / 2, camY + camH * 0.45, 10, camX + camW / 2, camY + camH * 0.45, 90);
      auraGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      auraGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.15)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(camX, camY, camW, camH);

      // RENDER REALISTIC CORPORATE INSTRUCTOR AVATAR
      const isDual = voiceGender === 'dual';
      const isMale = voiceGender === 'male' || (isDual && activeSpeakerRole === 'male');
      const headBob = isPlaying ? Math.sin(waveOffset * 3) * 2.5 : 0;
      const mouthOpen = isPlaying && isSpeakingLive ? Math.abs(Math.sin(waveOffset * 8)) * 4 + 1 : 0;

      // Presenter Center Coordinates
      const pX = camX + camW / 2;
      const pY = camY + camH * 0.52 + headBob;

      // 1. Shoulders & Executive Tailored Suit
      ctx.fillStyle = isMale ? '#1e293b' : '#0f2042'; // Charcoal / Deep Navy Blazer
      ctx.beginPath();
      ctx.ellipse(pX, pY + 48, 56, 42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blazer Lapels & Seams
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pX - 22, pY + 28);
      ctx.lineTo(pX - 10, pY + 54);
      ctx.lineTo(pX, pY + 70);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pX + 22, pY + 28);
      ctx.lineTo(pX + 10, pY + 54);
      ctx.lineTo(pX, pY + 70);
      ctx.stroke();

      // Formal White Shirt / Blouse Collar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(pX - 14, pY + 16);
      ctx.lineTo(pX, pY + 36);
      ctx.lineTo(pX + 14, pY + 16);
      ctx.fill();

      if (isMale) {
        // Formal Silk Tie for Male Instructor
        ctx.fillStyle = '#991b1b'; // Crimson executive tie
        ctx.beginPath();
        ctx.moveTo(pX - 5, pY + 32);
        ctx.lineTo(pX + 5, pY + 32);
        ctx.lineTo(pX + 3, pY + 68);
        ctx.lineTo(pX, pY + 72);
        ctx.lineTo(pX - 3, pY + 68);
        ctx.fill();
      }

      // Official iGOT Karmayogi / Govt of India Gold Lapel Badge
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(pX - 24, pY + 42, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. Realistic Neck & Jaw Shading
      ctx.fillStyle = '#e2a97e'; // Natural neck shadow tone
      ctx.beginPath();
      ctx.roundRect(pX - 9, pY + 4, 18, 18, 4);
      ctx.fill();

      // 3. Realistic Head & Facial Features
      // Dimensional face gradient
      const skinGrad = ctx.createRadialGradient(pX, pY - 14, 5, pX, pY - 14, 30);
      skinGrad.addColorStop(0, '#ffd8be'); // Highlight
      skinGrad.addColorStop(0.7, '#f5ba93'); // Midtone
      skinGrad.addColorStop(1, '#e39e72'); // Jaw contour
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.ellipse(pX, pY - 12, 25, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheekbone subtle blush
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.beginPath();
      ctx.ellipse(pX - 12, pY - 10, 6, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(pX + 12, pY - 10, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Professional Hair Styling
      ctx.fillStyle = '#1e1b18'; // Natural deep espresso hair
      if (isMale) {
        // Executive Side-Part Crop
        ctx.beginPath();
        ctx.arc(pX, pY - 24, 27, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(pX - 8, pY - 32, 18, 12, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Polished Academic Updo / Waves
        ctx.beginPath();
        ctx.arc(pX, pY - 22, 28, Math.PI * 0.85, Math.PI * 2.15);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(pX - 14, pY - 18, 14, 20, 0.3, 0, Math.PI * 2);
        ctx.ellipse(pX + 14, pY - 18, 14, 20, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Expressive Realistic Eyes & Brows
      // Eyebrows
      ctx.strokeStyle = '#291d14';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pX - 16, pY - 19);
      ctx.quadraticCurveTo(pX - 10, pY - 22, pX - 4, pY - 19);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pX + 4, pY - 19);
      ctx.quadraticCurveTo(pX + 10, pY - 22, pX + 16, pY - 19);
      ctx.stroke();

      if (!isBlinking) {
        // Eye whites
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(pX - 10, pY - 14, 5, 3.2, 0, 0, Math.PI * 2);
        ctx.ellipse(pX + 10, pY - 14, 5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Irises (Deep Amber/Brown)
        ctx.fillStyle = '#3d2314';
        ctx.beginPath();
        ctx.arc(pX - 10, pY - 14, 2.5, 0, Math.PI * 2);
        ctx.arc(pX + 10, pY - 14, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Specular Catchlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pX - 11, pY - 15, 0.9, 0, Math.PI * 2);
        ctx.arc(pX + 9, pY - 15, 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Blinking Eyelid lines
        ctx.strokeStyle = '#6b4329';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pX - 15, pY - 14);
        ctx.lineTo(pX - 5, pY - 14);
        ctx.moveTo(pX + 5, pY - 14);
        ctx.lineTo(pX + 15, pY - 14);
        ctx.stroke();
      }

      // Nose Contour
      ctx.strokeStyle = '#c48259';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(pX, pY - 13);
      ctx.lineTo(pX - 1.5, pY - 6);
      ctx.lineTo(pX + 1.5, pY - 5);
      ctx.stroke();

      // 6. Realistic Mouth & Speech Sync
      if (isPlaying && isSpeakingLive && mouthOpen > 1) {
        // Open talking mouth
        ctx.fillStyle = '#831843'; // Natural lip
        ctx.beginPath();
        ctx.ellipse(pX, pY + 2, 6, 2.5 + mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff'; // Subtle teeth visibility
        ctx.fillRect(pX - 3.5, pY + 1, 7, 1.8);
      } else {
        // Closed / Smile mouth
        ctx.strokeStyle = '#9f1239';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pX - 6, pY + 2);
        ctx.quadraticCurveTo(pX, pY + 4, pX + 6, pY + 2);
        ctx.stroke();
      }

      // 7. Interactive Laser Pointer Gesture towards Slide
      if (isPlaying && (currentTime % 15 < 6)) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; // Red Laser Beam
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pX - 25, pY + 35);
        ctx.lineTo(slideX + slideW * 0.5, slideY + 160);
        ctx.stroke();

        // Laser dot on slide
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(slideX + slideW * 0.5, slideY + 160, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Live Audio Waveform visualizer at bottom of camera view
      if (isPlaying) {
        ctx.fillStyle = '#38bdf8';
        const barCount = 16;
        const barWidth = 3;
        const barGap = 3.5;
        const startX = camX + (camW - (barCount * (barWidth + barGap))) / 2;
        for (let b = 0; b < barCount; b++) {
          const barHeight = 4 + Math.abs(Math.sin(waveOffset * 5 + b * 0.6)) * 18 * (isMuted ? 0.1 : volume);
          ctx.fillRect(startX + b * (barWidth + barGap), camY + camH - 18 - barHeight / 2, barWidth, barHeight);
        }
      }

      ctx.restore();

      // Camera Frame Border with Active Speaker Halo
      ctx.strokeStyle = isSpeakingLive ? '#38bdf8' : '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(camX, camY, camW, camH, 14);
      ctx.stroke();

      // "LIVE INSTRUCTOR" Badge Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(camX + 10, camY + 10, 125, 22, 7);
      ctx.fill();

      ctx.fillStyle = isPlaying ? '#10b981' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(camX + 20, camY + 21, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px system-ui, sans-serif';
      const speakerNameTag = isDual
        ? `DUAL: ${activeSpeakerRole === 'female' ? 'DR. PRIYA' : 'DR. RAJESH'}`
        : voiceGender === 'male'
        ? 'DR. RAJESH VERMA'
        : 'DR. PRIYA SHARMA';
      ctx.fillText(isPlaying ? speakerNameTag : 'PAUSED', camX + 30, camY + 25);

      // Instructor Name Plate Below Feed
      const plateY = camY + camH + 10;
      const plateH = height * 0.26;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.beginPath();
      ctx.roundRect(camX, plateY, camW, plateH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12.5px system-ui, sans-serif';
      const fullInstructorTitle =
        voiceGender === 'male'
          ? 'Dr. Rajesh Verma (Principal Pedagogy Fellow)'
          : voiceGender === 'dual'
          ? 'Dr. Priya Sharma & Dr. Rajesh Verma'
          : `${currentModule.instructorName} (${currentModule.instructorRole})`;
      ctx.fillText(fullInstructorTitle.slice(0, 32), camX + 12, plateY + 24);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9.5px system-ui, sans-serif';
      ctx.fillText(`LANGUAGE: ${narrationLanguage.toUpperCase()} • iGOT ACCREDITED`, camX + 12, plateY + 44);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText(`OBJECTIVE (${((currentModule.moduleIndex) * 25)}% CURRICULUM):`, camX + 12, plateY + 66);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px system-ui, sans-serif';
      const objText = currentModule.objectives[0] || 'Evidence-based pedagogical mastery and alignment.';
      ctx.fillText(objText.slice(0, 38) + '...', camX + 12, plateY + 84);

      // Top Broadcast Header Bar with Quality Indicator
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      const qText = selectedQuality === '2160p' ? '4K UHD (2160p60)' : `${selectedQuality}60`;
      ctx.fillText(`${qText} • iGOT KARMAYOGI BROADCAST SPEC 2.0`, width - 330, 26);

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, currentTime, volume, playbackSpeed, currentChapter, currentModule, course, isMuted, selectedQuality, voiceGender, narrationLanguage, isSpeakingLive, activeSpeakerRole]);

  // Controls auto-hide on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu && !showDownloadMenu) {
        setShowControls(false);
      }
    }, 3500);
  };

  const handleTogglePlay = () => {
    if (showThumbnailOverlay) {
      setShowThumbnailOverlay(false);
    }
    lifelikeAudioEngine.initAudioContext();
    setIsPlaying(prev => !prev);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    lastNarratedChapterRef.current = '';
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(ratio * duration);
    lastNarratedChapterRef.current = '';
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleSelectQuality = (q: VideoResolution) => {
    setSelectedQuality(q);
    setShowQualityMenu(false);
  };

  const handleExecuteDownload = (res: VideoResolution, fmt: VideoContainerFormat) => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      generateAndDownloadLectureVideoMultiFormat(course, currentModule, res, fmt);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Header & Multi-Format Download Action Bar (Z-INDEX FIX: relative z-50) */}
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-4 border border-slate-200/80 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                Module {currentModule.moduleIndex} Video • 05:00 Widescreen
              </span>
              <span className="rounded-md bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 text-[10px] font-black text-sky-700 dark:text-sky-300">
                {selectedQuality === '2160p' ? '4K UHD' : selectedQuality}
              </span>
              <span className="flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                <Radio className="h-3 w-3 text-emerald-600 animate-pulse" /> Auto-Audio ON
              </span>
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {currentModule.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Multi-Format HD Download Dropdown Menu Component (Z-INDEX 9999 WRAPPER) */}
          <div className="relative z-[9999]">
            <button
              onClick={() => setShowDownloadMenu(prev => !prev)}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 px-4 py-2.5 text-xs font-black text-white hover:from-rose-500 hover:to-pink-500 shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-98"
              title="Select Resolution & Container Format to Download"
            >
              <Download className={`h-4 w-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>Download Video Lecture</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Modal (Z-INDEX 9999 - COMPLETELY ON TOP OF CANVAS) */}
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900/95 backdrop-blur-xl z-[9999] animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <FileVideo className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      HD Video Export Package
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    H.264 / 60fps Broadcast
                  </span>
                </div>

                {/* Container Format Selection */}
                <div className="space-y-1.5 mb-3">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    1. Video Container Format:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['mp4', 'mkv', 'avi', 'mov'] as VideoContainerFormat[]).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setDownloadFormat(fmt)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                          downloadFormat === fmt
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        .{fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Selection */}
                <div className="space-y-1.5 mb-4">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    2. Resolution Quality:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { res: '720p', label: '720p HD' },
                      { res: '1080p', label: '1080p FHD' },
                      { res: '2160p', label: '4K Ultra HD' },
                    ].map(item => (
                      <button
                        key={item.res}
                        type="button"
                        onClick={() => setDownloadResolution(item.res as VideoResolution)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                          downloadResolution === item.res
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger Export Button */}
                <button
                  type="button"
                  onClick={() => handleExecuteDownload(downloadResolution, downloadFormat)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 py-2.5 text-xs font-black text-white hover:from-rose-500 hover:to-indigo-500 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Generate & Download {downloadResolution.toUpperCase()} (.{downloadFormat})</span>
                </button>

                {/* Quick Presets */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <span>Quick Presets:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteDownload('1080p', 'mp4')}
                      className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                    >
                      1080p MP4
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleExecuteDownload('2160p', 'mkv')}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                    >
                      4K MKV
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleExecuteDownload('1080p', 'mov')}
                      className="text-slate-600 dark:text-slate-300 hover:underline font-bold cursor-pointer"
                    >
                      MOV
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isCompleted ? (
            <button
              onClick={() => onCompleteModule(currentModule.id)}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Completed
            </div>
          )}
        </div>
      </div>

      {/* Main Video Player Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 group"
      >
        {/* Canvas Engine */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="h-full w-full object-contain cursor-pointer"
          onClick={handleTogglePlay}
        />

        {/* Manual Play Overlay When Paused / Initial Load */}
        {!isPlaying && (
          <div
            onClick={handleTogglePlay}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center cursor-pointer transition-all hover:bg-slate-950/30 z-20"
          >
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/20 bg-slate-900/90 px-6 py-5 shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 text-center max-w-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/40">
                <Play className="h-7 w-7 fill-white translate-x-0.5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {currentTime > 0 ? 'Resume Lecture' : 'Start Lecture & Narration'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Click to start video presentation & lifelike faculty speech
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Closed Captions Ticker Overlay */}
        {showCaptions && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 text-center pointer-events-none z-20">
            <div className="inline-block rounded-xl bg-slate-950/85 px-4 py-2 border border-slate-700/60 text-xs sm:text-sm font-semibold text-white shadow-xl backdrop-blur-sm animate-in fade-in">
              <span className="text-amber-400 font-bold mr-2">[{currentChapter.timestampFormatted}]</span>
              {currentChapter.caption}
            </div>
          </div>
        )}

        {/* Video Player Controls Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent p-4 transition-opacity duration-300 z-30 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Interactive Seek Bar */}
          <div
            onClick={handleTimelineClick}
            className="relative h-2.5 w-full bg-slate-800/80 rounded-full cursor-pointer group/seek overflow-hidden mb-3 hover:h-3.5 transition-all"
          >
            {/* Chapter Markers */}
            {currentModule.chapters.map((ch, idx) => (
              <div
                key={`${ch.timestamp}_${idx}`}
                style={{ left: `${(ch.timestamp / duration) * 100}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                title={`${ch.title} (${ch.timestampFormatted})`}
              />
            ))}

            {/* Filled Progress */}
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-indigo-500 to-sky-400 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between text-white text-xs">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
              </button>

              <button
                onClick={() => setCurrentTime(prev => Math.max(0, prev - 10))}
                className="p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-slate-300 hover:text-white"
                title="Rewind 10s"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={() => setCurrentTime(prev => Math.min(duration, prev + 10))}
                className="p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-slate-300 hover:text-white"
                title="Fast Forward 10s"
              >
                <FastForward className="h-4 w-4" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 group/vol">
                <button
                  onClick={handleToggleMute}
                  className="text-slate-300 hover:text-white cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Time Display */}
              <span className="font-mono text-[11px] text-slate-300">
                {formatTime(currentTime)} / 05:00
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Playback Speed Pill */}
              <div className="flex items-center rounded-xl bg-white/10 p-0.5 text-[11px] font-bold">
                {[1, 1.25, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      playbackSpeed === speed ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Captions Toggle */}
              <button
                onClick={() => setShowCaptions(prev => !prev)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  showCaptions ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'
                }`}
                title="Toggle Closed Captions (CC)"
              >
                <Subtitles className="h-4 w-4" />
              </button>

              {/* Quality Selector Gear Menu (z-[9999]) */}
              <div className="relative z-[9999]">
                <button
                  onClick={() => setShowQualityMenu(prev => !prev)}
                  className="flex items-center gap-1 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer font-bold text-[11px]"
                  title="Resolution & Playback Quality"
                >
                  <Settings className="h-4 w-4" />
                  <span>{selectedQuality}</span>
                </button>

                {showQualityMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-44 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl z-[9999]">
                    <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">
                      Stream Resolution:
                    </div>
                    {(['720p', '1080p', '2160p'] as VideoResolution[]).map(q => (
                      <button
                        key={q}
                        onClick={() => handleSelectQuality(q)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedQuality === q ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{q === '2160p' ? '4K UHD (2160p)' : `${q} HD`}</span>
                        {selectedQuality === q && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Carousel & Timestamps */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-rose-600" /> Module Chapters & Video Timestamps (5m Lecture)
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Click any timestamp to jump to that instructional segment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {currentModule.chapters.map((ch, idx) => {
            const isCurrent = currentChapter.timestamp === ch.timestamp;
            return (
              <button
                key={`${ch.timestamp}_${idx}`}
                onClick={() => {
                  setCurrentTime(ch.timestamp);
                  lastNarratedChapterRef.current = '';
                }}
                className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-rose-500 bg-rose-50/80 dark:border-rose-600 dark:bg-rose-950/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-black font-mono">
                  <span className={isCurrent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>
                    CH {idx + 1}
                  </span>
                  <span className="rounded-md bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
                    {ch.timestampFormatted}
                  </span>
                </div>
                <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {ch.title}
                </h4>
                <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {ch.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
