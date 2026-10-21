import type { AnswerPhase } from "@/hooks/useInterviewAnswer";
export type CompanionSpeech = "idle" | "preparing" | "speaking";
export interface CompanionActivity {
  connected: boolean;
  answer: AnswerPhase;
  speech: CompanionSpeech;
  working: boolean;
  saved: boolean;
  blocked?: boolean;
}
export function companionActivity({
  connected,
  answer,
  speech,
  working,
  saved,
  blocked,
}: CompanionActivity) {
  if (!connected)
    return {
      state: "reconnecting",
      text: "You’re offline. Keep this page open and reconnect before saving.",
    };
  if (answer === "recording")
    return { state: "listening", text: "Microphone on. Recording your answer." };
  if (answer === "requesting")
    return { state: "waiting", text: "Waiting for microphone permission." };
  if (answer === "saving")
    return { state: "thinking", text: "Saving your answer. Keep this page open." };
  if (answer === "failed")
    return { state: "idle", text: "Your recording needs attention. Check the message below." };
  if (speech === "speaking") return { state: "speaking", text: "Reading the question aloud." };
  if (speech === "preparing") return { state: "thinking", text: "Preparing question audio." };
  if (blocked)
    return {
      state: "waiting",
      text: "Interview controls are paused. Check the session message before continuing.",
    };
  if (working) return { state: "thinking", text: "Your answer is saved. Preparing feedback." };
  if (saved || answer === "saved")
    return { state: "idle", text: "Answer saved. Continue when you’re ready." };
  return { state: "idle", text: "Ready when you are. Start recording to answer." };
}
