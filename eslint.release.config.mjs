import nextTypeScript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

// Enforce real TypeScript linting on this release. The legacy global config
// only has ignores; expanding enforcement across legacy modules is separate work.
const files = [
  "src/components/companion/**/*.tsx",
  "src/hooks/useCompanionPreferences.ts",
  "src/lib/interview-companion.ts",
  "src/app/(protected)/interview/page.tsx",
  "src/components/practice/**/*.tsx",
  "src/app/(protected)/practice/page.tsx",
  "src/hooks/useProctoring.tsx",
  "src/components/guides/**/*.tsx",
  "src/app/layout.tsx",
  "src/app/(protected)/layout.tsx",
  "src/hooks/useInterviewAnswer.ts",
  "src/hooks/useQuestionAttempt.ts",
  "src/app/(protected)/interview/_components/Footer.tsx",
  "tests/**/*.ts",
  "tests/**/*.tsx",
];
export default [
  {
    files: files.filter((file) => !file.startsWith("tests/")),
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },
  ...nextTypeScript.map((config) => ({ ...config, files })),
];
