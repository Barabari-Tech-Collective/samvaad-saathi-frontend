"use client";

import PageHeading from "@/components/studio/PageHeading";
import DifficultyTag from "@/components/DifficultyTag";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { ArrowPathIcon, ArrowRightIcon, SpeakerWaveIcon } from "@heroicons/react/24/solid";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  readPronunciationSession,
  type PronunciationPracticeData,
} from "@/lib/pronunciation-session";

const PronunciationPracticeStartPage = () => {
  const [practiceData, setPracticeData] = useState<PronunciationPracticeData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  // Get current word safely
  const currentWord = practiceData?.words[currentWordIndex];

  // Fetch audio using the API endpoint - must be called before any early returns
  const {
    data: audioData,
    refetch: fetchAudio,
    isFetching: isFetchingAudio,
    isError: isAudioError,
  } = apiClient.useQuery<Blob>({
    key: ["pronunciation-audio", practiceData?.practiceId, currentWord?.index, isSlow],
    url:
      practiceData && currentWord
        ? ENDPOINTS_V2.GET_PRONUNCIATION_PRACTICE_AUDIO(
            practiceData.practiceId.toString(),
            currentWord.index
          )
        : "",
    enabled: false, // Don't auto-fetch, we'll trigger it manually
    config: {
      responseType: "blob",
      params: isSlow ? { slow: true } : undefined,
    },
  });

  useEffect(() => {
    try {
      const data = readPronunciationSession(sessionStorage);
      setPracticeData(data);
      setLoadError(!data);
    } catch {
      setLoadError(true);
    }
  }, []);

  // Call API when word changes or slow toggle changes
  useEffect(() => {
    if (practiceData && currentWord && !showCompletion) {
      fetchAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordIndex, practiceData, isSlow, showCompletion, currentWord]);

  const handleNext = () => {
    if (practiceData && currentWordIndex < practiceData.words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else if (practiceData && currentWordIndex === practiceData.words.length - 1) {
      // All words completed, show congratulations screen
      setShowCompletion(true);
    }
  };

  const handlePlayAudio = () => {
    setPlayError(false);
    audioRef.current?.pause();
    if (!audioData) {
      // If audio is not loaded, fetch it first
      fetchAudio();
      return;
    }

    // Clean up previous audio URL if it exists
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    // Create object URL from blob
    const audioUrl = URL.createObjectURL(audioData);
    audioUrlRef.current = audioUrl;

    // Create and play audio
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.play().catch(() => {
      if (audioRef.current === audio) setPlayError(true);
    });

    // Clean up when audio finishes playing
    audio.addEventListener("ended", () => {
      if (audioRef.current !== audio) return;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      audioRef.current = null;
    });
  };

  // Cleanup audio URL on unmount or when audio data changes
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioData, currentWordIndex, isSlow, showCompletion]);

  if (!practiceData) {
    return (
      <div className="studio-panel" role={loadError ? "alert" : "status"}>
        <h1>{loadError ? "Open a new practice" : "Opening practice…"}</h1>
        <p>
          {loadError
            ? "This practice is missing or could not be read. Choose a level to begin again."
            : "Loading your words."}
        </p>
        {loadError && (
          <Link className="btn btn-neutral mt-4" href="/pronunciation-practice">
            Choose a level
          </Link>
        )}
      </div>
    );
  }

  // Show completion screen
  if (showCompletion) {
    return (
      <div className="flex flex-col min-h-[50vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 max-w-md w-full">
          {/* Celebration graphic placeholder - simple party popper icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              {/* Simple party popper representation */}
              <div className="size-24 flex items-center justify-center">
                <DotLottieReact src="/assets/lottie/Congratulations.lottie" autoplay loop />
              </div>
            </div>
          </div>

          {/* Congratulations Heading */}
          <h1 className="text-4xl sm:text-5xl font-bold italic text-black">Congratulations</h1>

          {/* Message */}
          <p className="text-lg text-black text-center">
            You practiced {practiceData.totalWords} words today!
          </p>

          {/* Back Button */}
          <Link href="/practice" className="btn btn-primary">
            Back to practice
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="studio-panel studio-drill-room flex flex-col gap-4">
        <PageHeading
          eyebrow="Pronunciation"
          title="One word at a time."
          description={`Listen and practise ${practiceData.totalWords} words. Replay a word whenever you need to.`}
          action={<DifficultyTag difficulty={practiceData.difficulty} size="sm" />}
        />
        {/* Word Display */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-3xl font-semibold text-black break-words min-w-0">
            {currentWord?.word || ""}
          </div>
          <div className="text-sm text-gray-600">
            {currentWordIndex + 1}/{practiceData.totalWords}
          </div>
        </div>

        <div className="border-t border-gray-200 my-2"></div>

        {/* Instruction */}
        <div className="text-gray-600 text-sm">Practice with me</div>

        {/* Pronunciation Details Box */}
        <div className="rounded-xl bg-[var(--studio-blue-wash)] p-6 mt-4">
          <div className="flex flex-col gap-4 flex-wrap">
            <div className="text-gray-600 text-sm">Sounds like</div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-2xl font-bold break-all">{currentWord?.phonetic || ""}</div>
              <button
                onClick={handlePlayAudio}
                className="flex-shrink-0 min-h-11 min-w-11 p-2 hover:bg-[var(--studio-line)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isAudioError ? "Retry loading pronunciation" : "Play pronunciation"}
                disabled={isFetchingAudio}
              >
                {isFetchingAudio ? (
                  <ArrowPathIcon className="h-6 w-6 text-[#1f285b] animate-spin" />
                ) : (
                  <SpeakerWaveIcon className="h-6 w-6 text-[#1f285b]" />
                )}
              </button>
            </div>
            {(isAudioError || playError) && (
              <p role="alert" className="text-sm text-red-700">
                Couldn&apos;t load the audio. Tap the speaker icon to try again.
              </p>
            )}
          </div>
        </div>

        {/* Speed Toggle */}
        <div className="flex items-center gap-3 mt-4">
          <input
            type="checkbox"
            checked={!isSlow}
            onChange={(e) => setIsSlow(!e.target.checked)}
            className="toggle text-black border-black  checked:border-black checked:text-black"
            aria-label="Use normal playback speed"
          />
          <span className="text-gray-600 text-sm">{isSlow ? "Slow" : "Normal"}</span>
        </div>

        {/* Navigation Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleNext}
            className="btn bg-[#1f285b] hover:bg-[#1f285b]/90 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <span>
              {currentWordIndex === practiceData.words.length - 1 ? "Finish practice" : "Next word"}
            </span>
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PronunciationPracticeStartPage;
