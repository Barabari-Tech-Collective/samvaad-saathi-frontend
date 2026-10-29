"use client";
import { useLanguage } from "./language";

/** One clear button that names the other language in that language's own script. */
export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const toHindi = language === "en";
  return (
    <button
      type="button"
      className="ws-button student-language-toggle"
      lang={toHindi ? "hi" : "en"}
      aria-label={toHindi ? "Change language to Hindi" : "Change language to English"}
      onClick={() => setLanguage(toHindi ? "hi" : "en")}
    >
      {toHindi ? "हिन्दी" : "English"}
    </button>
  );
}
