/**
 * Types for pacing practice API (see docs/REQUIREMENTS.md).
 */

export type PacingLevelStatus = "locked" | "in_progress" | "complete";

export interface PacingLevel {
  level: number;
  name: string;
  description: string;
  status: PacingLevelStatus;
  bestScore: number | null;
  unlockThreshold: number;
  unlockMessage: string;
}

export interface PacingLevelsResponse {
  levels: PacingLevel[];
  overallReadiness: number;
}

export interface CreatePacingSessionRequest {
  level: number;
}

export interface CreatePacingSessionResponse {
  sessionId: number;
  level: number;
  levelName: string;
  promptText: string;
  status: string;
  createdAt: string;
}

export interface SpeechSpeedMetric {
  value: number;
  idealRange: string;
  status: string;
  feedback: string;
}

export interface PauseDistributionMetric {
  score: number;
  status: string;
  feedback: string;
  avgWordsPerPause?: number;
  totalPauses?: number;
  expectedPauses?: number;
  mandatoryPauseCount?: number;
  mandatoryPausesHit?: number;
  mandatoryPausesMissed?: number;
  commaPausesMissed?: number;
  mandatoryCovered?: boolean;
  placementAccuracy?: number;
  mandatoryCompliance?: number;
  segmentAccuracy?: number;
  penaltyPct?: number;
}

export interface FillerWordsMetric {
  count: number;
  totalWords: number;
  fillerRatio: number;
  status: string;
  suggestion: string;
  fillersFound: string[];
}

export interface SubmitPacingSessionResponse {
  sessionId: number;
  level: number;
  score: number;
  scoreLabel: string;
  speechSpeed: SpeechSpeedMetric;
  pauseDistribution: PauseDistributionMetric;
  fillerWords: FillerWordsMetric;
  // Backend sends null when this attempt didn't unlock a new level
  // (level_unlocked: Optional[int] in pacing_practice.py) - this type
  // previously didn't declare that, so a consumer could read it as if it
  // were always a number.
  levelUnlocked: number | null;
}

export interface PacingSessionDetailResponse {
  sessionId: number;
  level: number;
  levelName: string;
  promptText: string;
  status: string;
  transcript?: string;
  score: number;
  scoreLabel?: string;
  speechSpeed: SpeechSpeedMetric;
  pauseDistribution: PauseDistributionMetric;
  fillerWords: FillerWordsMetric;
  analysisResult?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
