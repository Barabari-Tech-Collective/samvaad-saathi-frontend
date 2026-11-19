import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

// src/styles/brand-tokens.css is the same file in this app and the staff dashboard.
// This hash is identical in both repositories' tests. Change the file in one repo and
// this fails until the same file, and the same new hash, land in the other.
const SHARED_HASH = "1bba7abbbe8ac34e1f59fe7071fefa3d9b95bd2f11571692133ef604f72fa79d";
const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8");

it("the brand token file is the shared one, unchanged", () => {
  const hash = createHash("sha256").update(read("src/styles/brand-tokens.css")).digest("hex");
  expect(hash).toBe(SHARED_HASH);
});

it("no other stylesheet defines a brand colour, so nothing can override the shared value", () => {
  for (const file of [
    "src/app/globals.css",
    "src/styles/studio-tokens.css",
    "src/styles/student-studio.css",
  ])
    expect(read(file).match(/--color-brand-[a-z-]+\s*:/g) ?? []).toEqual([]);
  expect(read("src/app/globals.css")).toContain('@import "../styles/brand-tokens.css";');
});
