/** Quiet brand ornament, never used to imply live microphone activity. */
export default function VoiceMark({ className = "" }: { className?: string }) {
  return (
    <div className={`studio-voice-mark ${className}`} aria-hidden="true">
      {[20, 34, 52, 76, 48, 92, 64, 112, 84, 56, 94, 64, 42, 58, 32, 20].map((height, index) => (
        <span key={index} style={{ height }} />
      ))}
    </div>
  );
}
