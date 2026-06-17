import {
  ArchiveBoxIcon,
  DocumentIcon,
  FolderOpenIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import React from "react";

interface EmptyProps {
  /**
   * The icon to display. Can be a custom React component or one of the predefined icon names.
   */
  icon?: React.ComponentType<{ className?: string }> | "inbox" | "folder" | "document" | "archive";
  /**
   * The title/heading text
   */
  title?: string;
  /**
   * The description/message text
   */
  description?: string;
  /**
   * Optional action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "accent" | "neutral" | "ghost";
  };
  /**
   * Size of the empty state (affects icon and text sizes)
   */
  size?: "sm" | "md" | "lg";
  /**
   * Custom className for additional styling
   */
  className?: string;
}

const ICON_MAP = {
  inbox: InboxIcon,
  folder: FolderOpenIcon,
  document: DocumentIcon,
  archive: ArchiveBoxIcon,
};

const Empty: React.FC<EmptyProps> = ({
  icon = "inbox",
  title = "No data available",
  description = "There's nothing here yet. Check back later or try a different view.",
  action,
  size = "md",
  className = "",
}) => {
  // Determine the icon component to use
  const IconComponent = typeof icon === "string" ? ICON_MAP[icon] : icon;

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: "w-12 h-12",
      title: "text-base",
      description: "text-xs",
      container: "py-6",
    },
    md: {
      icon: "w-16 h-16",
      title: "text-lg",
      description: "text-sm",
      container: "py-8",
    },
    lg: {
      icon: "w-20 h-20",
      title: "text-xl",
      description: "text-base",
      container: "py-12",
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${config.container} ${className}`}
    >
      {/* Icon */}
      <div className="mb-4">
        <div className="inline-flex items-center justify-center rounded-full bg-base-200 p-4">
          {IconComponent && (
            <IconComponent className={`${config.icon} text-base-content opacity-40`} />
          )}
        </div>
      </div>

      {/* Title */}
      {title && <h3 className={`font-semibold text-base-content mb-2 ${config.title}`}>{title}</h3>}

      {/* Description */}
      {description && (
        <p className={`text-base-content opacity-60 max-w-md mb-4 ${config.description}`}>
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`btn btn-${action.variant || "primary"} btn-sm mt-2`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default Empty;
