"use client";

import DifficultyTag from "@/components/DifficultyTag";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { ArrowPathIcon, ArrowRightIcon, SpeakerWaveIcon } from "@heroicons/react/24/solid";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Word {
  index: number;
  word: string;
  phonetic: string;
}

interface PronunciationPracticeData {
  practiceId: number;
  difficulty: string;
  words: Word[];
  totalWords: number;
  status: string;
  createdAt: string;
}

const PronunciationPracticeStartPage = () => {
  const router = useRouter();
  const [practiceData, setPracticeData] = useState<PronunciationPracticeData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
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
    // Read data from sessionStorage
    const storedData = sessionStorage.getItem("pronunciationPracticeData");
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as PronunciationPracticeData;
        setPracticeData(data);
      } catch (error) {
        console.error("Error parsing practice data:", error);
        // Redirect back if data is invalid
        router.push("/pronunciation-practice");
      }
    } else {
      // Redirect back if no data
      router.push("/pronunciation-practice");
    }
  }, []);

  // Hide welcome screen after 2 seconds
  useEffect(() => {
    if (practiceData) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [practiceData]);

  // Call API when word changes or slow toggle changes
  useEffect(() => {
    if (practiceData && currentWord && !showWelcome && !showCompletion) {
      fetchAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordIndex, practiceData, isSlow, showWelcome, showCompletion, currentWord]);

  const handleNext = () => {
    if (practiceData && currentWordIndex < practiceData.words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else if (practiceData && currentWordIndex === practiceData.words.length - 1) {
      // All words completed, show congratulations screen
      setShowCompletion(true);
    }
  };

  const handlePlayAudio = () => {
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

    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
    });

    // Clean up when audio finishes playing
    audio.addEventListener("ended", () => {
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
  }, [audioData]);

  if (!practiceData) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show welcome screen
  if (showWelcome) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6">
        <div className="relative max-w-md w-full">
          {/* Gradient border using wrapper */}
          <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 rounded-2xl p-[2px]">
            <div className="bg-white rounded-xl p-8">
              <div className="text-gray-800 text-xl font-medium text-center">
                Hi ! Lets start your pronunciation practice 👋
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show completion screen
  if (showCompletion) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6">
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
          <Link href="/home">
            <button className="btn btn-primary">Back To Interview Practice</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-[#1f285b]">Pronunciation Practice</h1>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Practice {practiceData.totalWords} commonly mispronounced words every day to build
              clear speech habits.
            </p>
            <div className="ml-4">
              <DifficultyTag difficulty={practiceData.difficulty} size="sm" />
            </div>
          </div>
        </div>

        {/* Word Display */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-4xl font-bold text-black">{currentWord?.word || ""}</div>
          <div className="text-sm text-gray-600">
            {currentWordIndex + 1}/{practiceData.totalWords}
          </div>
        </div>

        <div className="border-t border-gray-200 my-2"></div>

        {/* Instruction */}
        <div className="text-gray-600 text-sm">Practice with me</div>

        {/* Pronunciation Details Box */}
        <div className="bg-purple-100 rounded-xl p-6 mt-4">
          <div className="flex flex-col gap-4 flex-wrap">
            <div className="text-gray-600 text-sm">Sounds like</div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-2xl font-bold break-all">{currentWord?.phonetic || ""}</div>
              <button
                onClick={handlePlayAudio}
                className="flex-shrink-0 p-2 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Play pronunciation"
                disabled={!audioData || isFetchingAudio}
              >
                {isFetchingAudio ? (
                  <ArrowPathIcon className="h-6 w-6 text-[#1f285b] animate-spin" />
                ) : (
                  <SpeakerWaveIcon className="h-6 w-6 text-[#1f285b]" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Stress:</span>
              <span className="bg-gray-200 text-black px-3 py-1 rounded-lg text-sm">
                {/* Stress indicator - would need API data for this */}
                {currentWord?.word
                  ? currentWord.word.charAt(Math.floor(currentWord.word.length / 2)).toLowerCase()
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Speed Toggle */}
        <div className="flex items-center gap-3 mt-4">
          <input
            type="checkbox"
            checked={!isSlow}
            onChange={(e) => setIsSlow(!e.target.checked)}
            className="toggle text-black border-black  checked:border-black checked:text-black"
            aria-label="Toggle speed"
          />
          <span className="text-gray-600 text-sm">{isSlow ? "Slow" : "Normal"}</span>
        </div>

        {/* Navigation Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleNext}
            className="btn bg-[#1f285b] hover:bg-[#1f285b]/90 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <span>Next Word</span>
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PronunciationPracticeStartPage;
