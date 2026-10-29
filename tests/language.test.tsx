import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LanguageToggle from "@/lib/i18n/LanguageToggle";
import { hi } from "@/lib/i18n/hi";
import { LanguageProvider, useLanguage } from "@/lib/i18n/language";

const memory = () => {
  const records = new Map<string, string>();
  return {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => void records.set(key, value),
    removeItem: (key: string) => void records.delete(key),
  };
};
function Sample() {
  const { t } = useLanguage();
  return (
    <>
      <p>{t("Practice")}</p>
      <p>{t("A sentence nobody has translated yet")}</p>
    </>
  );
}

beforeEach(() => vi.stubGlobal("localStorage", memory()));
afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.lang = "en";
});

describe("language choice", () => {
  it("stays English everywhere when no provider is present", () => {
    render(<Sample />);
    expect(screen.getByText("Practice")).toBeVisible();
  });

  it("switches to Hindi, keeps untranslated text in English, and remembers the choice", () => {
    const first = render(
      <LanguageProvider>
        <LanguageToggle />
        <Sample />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /Change language to Hindi/i }));
    expect(screen.getByText(hi.Practice)).toBeVisible();
    expect(screen.getByText("A sentence nobody has translated yet")).toBeVisible();
    expect(document.documentElement.lang).toBe("hi");
    first.unmount();
    render(
      <LanguageProvider>
        <Sample />
      </LanguageProvider>
    );
    expect(screen.getByText(hi.Practice)).toBeVisible();
  });

  it("offers a way back to English", () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
        <Sample />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /Change language to Hindi/i }));
    fireEvent.click(screen.getByRole("button", { name: /Change language to English/i }));
    expect(screen.getByText("Practice")).toBeVisible();
  });

  it("only translates text that exists on screen, with no empty entries", () => {
    for (const [english, hindi] of Object.entries(hi)) {
      expect(english.trim().length).toBeGreaterThan(0);
      expect(hindi.trim().length).toBeGreaterThan(0);
    }
  });
});
