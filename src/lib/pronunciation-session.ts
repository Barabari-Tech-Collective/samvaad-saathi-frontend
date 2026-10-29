export const PRONUNCIATION_STORAGE_KEY = "pronunciationPracticeData";
export const PRONUNCIATION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export interface PronunciationPracticeData {
  practiceId: number;
  difficulty: string;
  words: { index: number; word: string; phonetic: string }[];
  totalWords: number;
  status: string;
  createdAt: string;
}

// Browser storage is user-controlled; a TypeScript cast is not validation.
export function validatePronunciationSession(value: unknown): PronunciationPracticeData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as PronunciationPracticeData;
  if (
    !Number.isSafeInteger(data.practiceId) ||
    data.practiceId <= 0 ||
    !PRONUNCIATION_DIFFICULTIES.some((level) => level === data.difficulty) ||
    !Array.isArray(data.words) ||
    data.words.length === 0 ||
    data.words.length > 10 ||
    data.totalWords !== data.words.length ||
    !["active", "completed"].includes(data.status) ||
    typeof data.createdAt !== "string" ||
    !Number.isFinite(Date.parse(data.createdAt))
  )
    return null;
  if (
    !data.words.every(
      (word, index) =>
        word &&
        word.index === index &&
        typeof word.word === "string" &&
        word.word.trim().length > 0 &&
        word.word.length <= 200 &&
        typeof word.phonetic === "string" &&
        word.phonetic.length <= 500
    )
  )
    return null;
  return data;
}

export function readPronunciationSession(
  storage: Pick<Storage, "getItem">
): PronunciationPracticeData | null {
  try {
    return validatePronunciationSession(
      JSON.parse(storage.getItem(PRONUNCIATION_STORAGE_KEY) ?? "null")
    );
  } catch {
    return null;
  }
}
