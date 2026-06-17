import React from "react";

interface DifficultyTagProps {
  /**
   * The difficulty level
   */
  difficulty: string;
  /**
   * Size of the badge
   */
  size?: "xs" | "sm" | "md" | "lg";
  /**
   * Whether to show the badge as outlined/soft style
   */
  soft?: boolean;
  /**
   * Custom className for additional styling
   */
  className?: string;
}

const DifficultyTag: React.FC<DifficultyTagProps> = ({
  difficulty,
  size = "xs",
  className = "",
}) => {
  // Helper function to get difficulty color based on level
  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "hard":
        return "badge-error";
      case "easy":
        return "badge-success";
      case "medium":
        return "badge-warning";
      default:
        return "badge-neutral";
    }
  };

  return (
    <span
      className={`badge badge-${size} badge-soft ${getDifficultyColor(difficulty)} ${className}`}
    >
      {difficulty?.toUpperCase()}
    </span>
  );
};

export default DifficultyTag;
