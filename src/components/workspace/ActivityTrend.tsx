import type { PracticeHubActivity } from "@/lib/practice-hub";

export function ActivityTrend({ activity }: { activity: PracticeHubActivity }) {
  const values = activity.dailyActivity.map((day) => day.completedMocks + day.completedDrills);
  const maximum = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = 8 + (index * 84) / 6;
    const y = 58 - (value / maximum) * 46;
    return `${x},${y}`;
  });
  return (
    <section className="ws-activity-trend" aria-labelledby="activity-trend-title">
      <div>
        <p className="studio-eyebrow">Your activity</p>
        <h2 id="activity-trend-title">Your last 7 days</h2>
        <p>Completed practice activities, shown in your India calendar days.</p>
      </div>
      <svg
        viewBox="0 0 100 68"
        role="img"
        aria-label={`Daily practice: ${values.join(", ")} activities`}
      >
        <line x1="8" x2="92" y1="58" y2="58" />
        <polyline points={points.join(" ")} />
        {points.map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={activity.dailyActivity[index].date} cx={cx} cy={cy} r="2.5" />;
        })}
      </svg>
      <ol aria-label="Daily activity details">
        {activity.dailyActivity.map((day) => {
          const total = day.completedMocks + day.completedDrills;
          return (
            <li key={day.date}>
              <span>
                {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "narrow",
                })}
              </span>
              <strong>{total}</strong>
            </li>
          );
        })}
      </ol>
      <p className="ws-activity-note">
        This is activity, not a score. Missing days are simply days without a recorded completion.
      </p>
    </section>
  );
}
