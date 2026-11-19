import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { journey } from "@/lib/i18n/hi-journey";
import { hi } from "@/lib/i18n/hi";
import { tidy } from "@/lib/i18n/page-translator";

/**
 * A student who picks Hindi should never get an English error just because nobody added
 * it to the dictionary. This reads every message the app shows through t(), a toast, an
 * error setter or a returned sentence, and fails when one has no Hindi.
 */
const SRC = path.resolve(__dirname, "../src");
// Text that must stay in English: it is sent to the support team, not read by the student.
const ENGLISH_ON_PURPOSE = new Set(["Hi, I need support with Samvaad Saathi app."]);

const STR = String.raw`"((?:[^"\\]|\\.)+)"`;
const PATTERNS = [
  new RegExp(String.raw`\bt\(\s*${STR}\s*\)`, "g"),
  new RegExp(String.raw`toast(?:\.\w+)?\(\s*${STR}`, "g"),
  new RegExp(String.raw`toast(?:\.\w+)?\([^;]*?,\s*${STR}\s*\)`, "g"),
  new RegExp(String.raw`set\w*Error\(\s*${STR}`, "g"),
  new RegExp(String.raw`(?:message|fallback|errorMessage)\s*[:=]\s*${STR}`, "g"),
  new RegExp(String.raw`return\s+"((?:[^"\\]|\\.)+[.!?])"\s*;`, "g"),
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "i18n" ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

it("has Hindi for every message a student can see", () => {
  const known = new Set(Object.keys({ ...journey, ...hi }).map(tidy));
  const missing = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        const message = tidy(match[1].replace(/\\(.)/g, "$1"));
        if (!/[a-z]/i.test(message) || ENGLISH_ON_PURPOSE.has(message)) continue;
        if (!known.has(message)) missing.add(`${message}  (${path.relative(SRC, file)})`);
      }
    }
  }
  expect([...missing]).toEqual([]);
});
