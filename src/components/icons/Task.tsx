// Task SVG Icon Component
const TaskIcon = ({ className }: { className?: string }) => (
  <svg
    width="31"
    height="31"
    viewBox="0 0 31 31"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    className={className}
  >
    <defs>
      <pattern id="pattern0_259_840" patternContentUnits="objectBoundingBox" width="1" height="1">
        <use xlinkHref="#image0_259_840" transform="scale(0.0111111)" />
      </pattern>
      <image
        id="image0_259_840"
        width="90"
        height="90"
        preserveAspectRatio="none"
        xlinkHref="data:image/png;base64,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"
      />
    </defs>
    <rect width="31" height="31" fill="url(#pattern0_259_840)" />
  </svg>
);

export default TaskIcon;
