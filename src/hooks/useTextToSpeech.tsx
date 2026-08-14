"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { DEFAULT_TTS_VOICE_ID, TTS_VOICE_OPTIONS, TTS_VOICE_STORAGE_KEY } from "@/lib/constants";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseTextToSpeechOptions {
  /**
   * The text to be spoken
   */
  text: string | undefined;
  /**
   * Whether speech should be disabled (e.g., when loading)
   */
  disabled?: boolean;
  /**
   * Speech rate (0.1 to 10, default: 0.9 for more natural speech)
   */
  rate?: number;
  /**
   * Speech pitch (0 to 2, default: 1.0)
   */
  pitch?: number;
  /**
   * Speech volume (0 to 1, default: 1.0)
   */
  volume?: number;
  /**
   * Language code (default: "en-IN")
   */
  lang?: string;
  /**
   * Preferred voice name (e.g., "Google UK English Female", "Microsoft Zira")
   * If not specified, will auto-select the best available voice
   */
  voiceName?: string;
  /**
   * Whether to use natural pauses for punctuation (default: true)
   */
  useNaturalPauses?: boolean;
}

interface TTSRequestBody {
  text: string;
  voice_id: string;
}

const allowedTtsVoiceIds = new Set<string>(TTS_VOICE_OPTIONS.map((option) => option.id));

function resolveStoredTtsVoiceId(): string {
  if (typeof window === "undefined") return DEFAULT_TTS_VOICE_ID;
  const raw = localStorage.getItem(TTS_VOICE_STORAGE_KEY);
  if (raw && allowedTtsVoiceIds.has(raw)) return raw;
  return DEFAULT_TTS_VOICE_ID;
}

/**
 * Finds the best available voice for the given language
 * with a preference for Indian-accent English where available.
 */
const findBestVoice = (lang: string, preferredVoiceName?: string): SpeechSynthesisVoice | null => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // If preferred voice is specified, try to find it
  if (preferredVoiceName) {
    const preferredVoice = voices.find(
      (voice) =>
        voice.name.toLowerCase().includes(preferredVoiceName.toLowerCase()) &&
        voice.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase())
    );
    if (preferredVoice) return preferredVoice;
  }

  // Prefer explicit Indian English voices (e.g., en-IN)
  const indianVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en-in"));
  if (indianVoices.length > 0) {
    return indianVoices[0];
  }

  // Fallback: any English voice
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  if (englishVoices.length > 0) return englishVoices[0];

  // Last resort: first available voice
  return voices[0];
};

/**
 * Preprocesses text to add natural pauses for better speech flow
 */
const preprocessTextForNaturalSpeech = (text: string): string => {
  // Add pauses after punctuation marks
  return text
    .replace(/\./g, ". ") // Periods
    .replace(/\?/g, "? ") // Question marks
    .replace(/!/g, "! ") // Exclamation marks
    .replace(/,/g, ", ") // Commas
    .replace(/;/g, "; ") // Semicolons
    .replace(/:/g, ": ") // Colons
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim();
};

/**
 * Custom hook for text-to-speech functionality using backend TTS API
 * Enhanced with text preprocessing for natural pauses
 *
 * @example
 * ```tsx
 * const { speak, stop, isSupported } = useTextToSpeech({
 *   text: "Hello, world!",
 *   disabled: false,
 *   rate: 0.9, // Slightly slower for more natural speech
 *   pitch: 1.0,
 *   volume: 1.0,
 *   lang: "en-IN",
 *   useNaturalPauses: true
 * });
 * ```
 */
export const useTextToSpeech = ({
  text,
  disabled = false,
  rate = 0.9, // Slightly slower for more natural speech
  pitch = 1.0,
  volume = 1.0,
  lang = "en-IN",
  voiceName,
  useNaturalPauses = true,
}: UseTextToSpeechOptions) => {
  const apiClient = createApiClient(APIService.TTS);
  const { mutateAsync: convertTextToSpeech } = apiClient.useMutation<Blob, TTSRequestBody>({
    url: ENDPOINTS.TTS.CONVERT,
    method: "post",
    config: {
      responseType: "blob",
      headers: {
        accept: "audio/mpeg",
      },
    },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakIdRef = useRef<number>(0);

  // TTS is supported in any browser that can play audio
  const isSupported = typeof window !== "undefined";

  const stop = useCallback(() => {
    speakIdRef.current += 1;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;

    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (textToSpeak: string) => {
      if (!isSupported) {
        console.warn("Text-to-speech is not supported in this browser");
        return;
      }

      if (!textToSpeak) return;

      // Cancel any ongoing speech
      stop();

      // Preprocess text for natural pauses
      const processedText = useNaturalPauses
        ? preprocessTextForNaturalSpeech(textToSpeak)
        : textToSpeak;

      const currentSpeakId = speakIdRef.current;

      // First, try to get audio from backend.
      let audioBlob: Blob | null = null;
      const voice_id = resolveStoredTtsVoiceId();

      try {
        audioBlob = await convertTextToSpeech({
          text: processedText,
          voice_id,
        });
      } catch (error) {
        console.error("TTS backend request failed, falling back to browser TTS", error);
      }

      if (currentSpeakId !== speakIdRef.current) {
        return;
      }

      // 🛠️ FIX HERE: Check audioBlob exists AND has size > 100 bytes (Not an empty fallback blob!)
      if (audioBlob && audioBlob.size > 100) {
        try {
          const audioUrl = URL.createObjectURL(audioBlob);
          audioUrlRef.current = audioUrl;

          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
          };

          audio.onerror = () => {
            console.warn("Audio playback error, unlocking speaking state");
            setIsSpeaking(false);
          };

          setIsSpeaking(true);
          await audio.play();
          return;
        } catch (playError) {
          console.error("Failed to play backend TTS audio", playError);
          setIsSpeaking(false);
          return;
        }
      }

      // If backend audio was empty (0 bytes) or failed, fall back to Browser Speech Synthesis
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSpeaking(false);
        return;
      }

      if (currentSpeakId !== speakIdRef.current) {
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(processedText);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;
        utterance.lang = lang;

        const selectedVoice = findBestVoice(lang, voiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utteranceRef.current = utterance;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error("Browser TTS fallback failed", fallbackError);
        setIsSpeaking(false);
      }
    },
    [isSupported, useNaturalPauses, stop, rate, pitch, volume, lang, voiceName, convertTextToSpeech]
  );
//   const speak = useCallback(
//     async (textToSpeak: string) => {
//       if (!isSupported) {
//         console.warn("Text-to-speech is not supported in this browser");
//         return;
//       }

//       if (!textToSpeak) return;

//       // Cancel any ongoing speech
//       stop();

//       // Preprocess text for natural pauses
//       const processedText = useNaturalPauses
//         ? preprocessTextForNaturalSpeech(textToSpeak)
//         : textToSpeak;

//       const currentSpeakId = speakIdRef.current;

//       // First, try to get audio from backend.
//       let audioBlob: Blob | null = null;
//       const voice_id = resolveStoredTtsVoiceId();

//       try {
//         audioBlob = await convertTextToSpeech({
//           text: processedText,
//           voice_id,
//         });
//       } catch (error) {
//         console.error("TTS backend request failed, falling back to browser TTS", error);
//       }

//       if (currentSpeakId !== speakIdRef.current) {
//         return;
//       }

//       if (audioBlob) {
//         // We have backend audio, play it and DO NOT fallback.
//         try {
//           const audioUrl = URL.createObjectURL(audioBlob);
//           audioUrlRef.current = audioUrl;

//           const audio = new Audio(audioUrl);
//           audioRef.current = audio;

//           audio.onended = () => {
//             setIsSpeaking(false);
//           };

//           audio.onerror = () => {
//             setIsSpeaking(false);
//           };

//           setIsSpeaking(true);
//           await audio.play();
//           return;
//         } catch (playError) {
//           console.error("Failed to play backend TTS audio", playError);
//           setIsSpeaking(false);
//           return;
//         }
//       }

//       // If we reach here, backend audio was not available; use browser fallback.
//       if (typeof window === "undefined" || !("speechSynthesis" in window)) {
//         setIsSpeaking(false);
//         return;
//       }

//       if (currentSpeakId !== speakIdRef.current) {
//         return;
//       }

//       try {
//         const utterance = new SpeechSynthesisUtterance(processedText);
//         utterance.rate = rate;
//         utterance.pitch = pitch;
//         utterance.volume = volume;
//         utterance.lang = lang;

//         const selectedVoice = findBestVoice(lang, voiceName);
//         if (selectedVoice) {
//           utterance.voice = selectedVoice;
//         }

//         utteranceRef.current = utterance;

//         utterance.onstart = () => {
//           setIsSpeaking(true);
//         };

//         utterance.onend = () => {
//           setIsSpeaking(false);
//         };

//         utterance.onerror = () => {
//           setIsSpeaking(false);
//         };

//         window.speechSynthesis.speak(utterance);
//       } catch (fallbackError) {
//         console.error("Browser TTS fallback failed", fallbackError);
//         setIsSpeaking(false);
//       }
//     },
//     [isSupported, useNaturalPauses, stop, rate, pitch, volume, lang, voiceName, convertTextToSpeech]
//   );

  useEffect(() => {
    // Only speak when text is available and not disabled
    if (disabled || !text) {
      stop();
      return;
    }

    speak(text);

    // Cleanup function
    return () => {
      stop();
    };
  }, [text, disabled, speak, stop]);

  return {
    speak,
    stop,
    isSupported,
    isSpeaking,
  };
};
