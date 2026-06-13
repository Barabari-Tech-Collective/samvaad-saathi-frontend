import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;

export const DEGREE_OPTIONS = [
  "BBA",
  "BCA",
  "Bcom Computers",
  "BSc Al/ML",
  "BSc Computer Science",
  "BSc Life Science",
] as const;

export const UNIVERSITY_OPTIONS = [
  "GDC Begumpet",
  "GDC Nampally",
  "Government City College",
  "GDC Husaini Alam",
  "GDC Narayanguda",
  "Others",
] as const;

export const FULL_STACK_ROLE = "Full Stack Developer";

export const ROLE_OPTIONS = [
  FULL_STACK_ROLE,
  "React Developer",
  "Node JS Developer",
  "Express JS Developer",
  "MERN Stack Developer",
  "UI Developer",
  "JavaScript Developer",
] as const;

export const EXPERIENCE_OPTIONS = ["0", "1", "2", "3", "4", "5"] as const;

// File upload constants
export const RESUME_FILE_TYPES = ".pdf,.doc,.docx";
export const MAX_RESUME_SIZE_MB = 5; // 5MB for onboarding
export const MAX_PROFILE_RESUME_SIZE_MB = 1; // 1MB for profile updates

export const TTS_VOICE_STORAGE_KEY = "samvaad_tts_voice_id";

export const TTS_VOICE_OPTIONS = [
  { name: "Sia (Female)", id: "oO7sLA3dWfQXsKeSAjpA" },
  { name: "Tara (Female)", id: "P7vsEyTOpZ6YUTulin8m" },
  { name: "Shobhit (Male)", id: "RC0x4iZi3WQKkwkGubnK" },
] as const;

export const DEFAULT_TTS_VOICE_ID = TTS_VOICE_OPTIONS[0].id;
