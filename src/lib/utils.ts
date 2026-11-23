import { clsx, type ClassValue } from "clsx";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString: string) => {
  return dayjs(dateString).format("DD MMM YYYY");
};

// Generate initials from first and last name
export const getInitials = (name: string): string => {
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 0) return "U";
  if (nameParts.length === 1) return nameParts[0][0]?.toUpperCase() || "U";
  const firstInitial = nameParts[0][0]?.toUpperCase() || "";
  const lastInitial = nameParts[nameParts.length - 1][0]?.toUpperCase() || "";
  return `${firstInitial}${lastInitial}` || "U";
};
