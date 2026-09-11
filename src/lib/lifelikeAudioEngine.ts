/**
 * Lifelike Bilingual & Multi-Voice Audio Narration Engine
 * Supports English, Hindi, and Bilingual (Hinglish) with
 * Professional Male (Dr. Rajesh Verma), Professional Female (Dr. Priya Sharma),
 * and Dual-Narrator Co-Presenter dialogue modes.
 * Features Web Speech API high-fidelity voice mapping + Web Audio harmonic enhancers.
 */

export type NarrationLanguage = 'en' | 'hi' | 'bilingual';
export type NarrationVoiceGender = 'female' | 'male' | 'dual';

export interface NarrationSettings {
  language: NarrationLanguage;
  voiceGender: NarrationVoiceGender;
  autoPlay: boolean;
  volume: number;
  playbackSpeed: number;
}

export const DEFAULT_NARRATION_SETTINGS: NarrationSettings = {
  language: 'bilingual',
  voiceGender: 'female',
  autoPlay: false,
  volume: 0.9,
  playbackSpeed: 1.0,
};

export class LifelikeAudioEngine {
  private static instance: LifelikeAudioEngine;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private synthSupported: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private onSpeakingStateChange?: (speaking: boolean, currentSpeaker: 'female' | 'male') => void;
  private currentSpeaker: 'female' | 'male' = 'female';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.synthSupported = 'speechSynthesis' in window;
      if (this.synthSupported) {
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  public static getInstance(): LifelikeAudioEngine {
    if (!LifelikeAudioEngine.instance) {
      LifelikeAudioEngine.instance = new LifelikeAudioEngine();
    }
    return LifelikeAudioEngine.instance;
  }

  public setSpeakingListener(cb: (speaking: boolean, speaker: 'female' | 'male') => void) {
    this.onSpeakingStateChange = cb;
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices() || [];
  }

  public initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return null;
        this.audioCtx = new AudioCtx();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      } else if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (_) {}
    return this.audioCtx;
  }

  /**
   * Finds the most natural, human-like voice available for the language and gender
   */
  public selectBestVoice(lang: NarrationLanguage, gender: 'female' | 'male'): SpeechSynthesisVoice | null {
    this.loadVoices();
    if (!this.voices || this.voices.length === 0) return null;

    const isHindi = lang === 'hi' || lang === 'bilingual';

    // Prioritized search for natural, high-definition neural voices
    const candidates = this.voices.filter(v => {
      const vLang = v.lang.toLowerCase();
      const vName = v.name.toLowerCase();

      if (isHindi) {
        if (vLang.includes('hi') || vLang.includes('in') || vName.includes('hindi') || vName.includes('india')) {
          if (gender === 'female') {
            return (
              vName.includes('female') ||
              vName.includes('swara') ||
              vName.includes('kalpana') ||
              vName.includes('ananya') ||
              vName.includes('priya') ||
              vName.includes('neerja') ||
              !vName.includes('male')
            );
          } else {
            return (
              vName.includes('male') ||
              vName.includes('madhav') ||
              vName.includes('rajesh') ||
              vName.includes('arjun') ||
              vName.includes('prabhat')
            );
          }
        }
      }

      // English Voice Search
      if (vLang.includes('en')) {
        if (gender === 'female') {
          return (
            vName.includes('female') ||
            vName.includes('natural') ||
            vName.includes('google uk english female') ||
            vName.includes('samantha') ||
            vName.includes('victoria') ||
            vName.includes('zira') ||
            vName.includes('jenny') ||
            !vName.includes('male')
          );
        } else {
          return (
            vName.includes('male') ||
            vName.includes('george') ||
            vName.includes('guy') ||
            vName.includes('david') ||
            vName.includes('google uk english male')
          );
        }
      }

      return false;
    });

    // Prefer online/natural Google or Microsoft voices over standard generic
    const bestMatch =
      candidates.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft')) ||
      candidates[0];

    return bestMatch || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  /**
   * Prepares bilingual, natural script text
   */
  public generateLocalizedScript(
    englishText: string,
    lang: NarrationLanguage,
    speakerRole?: string
  ): string {
    if (lang === 'en') {
      return englishText;
    }

    if (lang === 'hi') {
      // Natural Hindi pedagogical phrasing
      return `नमस्ते। आइए इस महत्वपूर्ण विषय को समझते हैं। ${englishText}। सभी शिक्षकों के लिए यह अत्यंत आवश्यक है।`;
    }

    // Bilingual / Hinglish mode (Natural for iGOT Karmayogi & Indian education)
    return `Namaskar educators. Let us focus on this key concept: ${englishText}. Ye framework hamare classroom pedagogy ko effectively enhance karega.`;
  }

  /**
   * Speaks the text with lifelike modulation and acoustic presence
   */
  public speak(
    text: string,
    settings: NarrationSettings = DEFAULT_NARRATION_SETTINGS,
    onEnd?: () => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    this.stop();
    this.initAudioContext();

    // Determine speaker for this turn
    let activeGender: 'female' | 'male' = 'female';
    if (settings.voiceGender === 'male') {
      activeGender = 'male';
    } else if (settings.voiceGender === 'dual') {
      // Alternate in dual mode
      activeGender = this.currentSpeaker === 'female' ? 'male' : 'female';
      this.currentSpeaker = activeGender;
    } else {
      activeGender = 'female';
      this.currentSpeaker = 'female';
    }

    const localizedText = this.generateLocalizedScript(text, settings.language);
    const utter = new SpeechSynthesisUtterance(localizedText);

    const voice = this.selectBestVoice(settings.language, activeGender);
    if (voice) utter.voice = voice;

    // Set human prosody and tone
    utter.rate = activeGender === 'male' ? 0.96 * settings.playbackSpeed : 1.0 * settings.playbackSpeed;
    utter.pitch = activeGender === 'male' ? 0.92 : 1.04;
    utter.volume = settings.volume;

    utter.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(true, activeGender);
      }
    };

    utter.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(false, activeGender);
      }
      if (onEnd) onEnd();
    };

    utter.onerror = (e) => {
      console.warn('Speech synthesis playback note:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(false, activeGender);
      }
      if (onEnd) onEnd();
    };

    this.currentUtterance = utter;
    window.speechSynthesis.speak(utter);
  }

  /**
   * Plays a pleasant harmonic audio chime
   */
  public playHarmonicChime(freq = 660, dur = 0.15) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + dur);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (_) {}
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (this.onSpeakingStateChange) {
      this.onSpeakingStateChange(false, this.currentSpeaker);
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const lifelikeAudioEngine = LifelikeAudioEngine.getInstance();
