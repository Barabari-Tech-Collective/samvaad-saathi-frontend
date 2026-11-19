import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

// Colours come from the tokens in src/app/globals.css (bg-brand-navy, text-brand-success...),
// so a brand change is one edit. A hex class like text-[#1f285b] skips that.
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return files(full);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [full] : [];
  });
}

it("has no hard-coded hex colour classes", () => {
  const found = files(path.resolve(__dirname, "../src")).flatMap((f) =>
    [...fs.readFileSync(f, "utf8").matchAll(/[a-z-]+-\[#[0-9a-fA-F]{3,8}\]/g)].map(
      (m) => `${path.basename(f)}: ${m[0]}`
    )
  );
  expect(found).toEqual([]);
});
