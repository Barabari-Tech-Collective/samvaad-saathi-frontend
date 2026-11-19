"use client";
import { useEffect } from "react";

/** Screens mix straight and curly apostrophes, so both must find the same entry. */
export const tidy = (text: string) =>
  text
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ");

const DAYS: Record<string, string> = {
  Mon: "सोम",
  Tue: "मंगल",
  Wed: "बुध",
  Thu: "गुरु",
  Fri: "शुक्र",
  Sat: "शनि",
  Sun: "रवि",
};
const MONTHS: Record<string, string> = {
  Jan: "जन॰",
  Feb: "फ़र॰",
  Mar: "मार्च",
  Apr: "अप्रैल",
  May: "मई",
  Jun: "जून",
  Jul: "जुल॰",
  Aug: "अग॰",
  Sep: "सित॰",
  Oct: "अक्टू॰",
  Nov: "नव॰",
  Dec: "दिस॰",
};
const DATE =
  /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\s\d{4})?$/;

function template(dictionary: Map<string, string>, text: string): string | undefined {
  const numbers = text.match(/\d[\d,.]*/g);
  if (!numbers) return undefined;
  const hindi = dictionary.get(text.replace(/\d[\d,.]*/g, "{n}"));
  if (!hindi) return undefined;
  let i = 0;
  return hindi.replace(/\{n\}/g, () => numbers[i++] ?? "");
}

function date(text: string): string | undefined {
  const m = DATE.exec(text);
  if (!m) return undefined;
  return `${m[1] ? `${DAYS[m[1]]}, ` : ""}${m[2]} ${MONTHS[m[3]]}${m[4] ?? ""}`;
}

/**
 * The Hindi for one piece of screen text. Exact entries first; then text with numbers
 * in it ("5 questions" finds "{n} questions"); then short dates; then lines joined with
 * " · ", each part on its own, so "Tue, 20 Oct · easy · Finished" is translated even
 * though no entry holds that whole line. Names and other unknown parts stay as written.
 */
export function lookup(dictionary: Map<string, string>, raw: string): string | undefined {
  const text = tidy(raw);
  const whole = dictionary.get(text) ?? template(dictionary, text) ?? date(text);
  if (whole) return whole;
  if (!text.includes(" · ")) return undefined;
  let changed = false;
  const parts = text.split(" · ").map((part) => {
    const hindi = dictionary.get(part) ?? template(dictionary, part) ?? date(part);
    if (hindi) changed = true;
    return hindi ?? part;
  });
  return changed ? parts.join(" · ") : undefined;
}

const ATTRIBUTES = ["aria-label", "placeholder", "title"];
const SKIP = "script,style,textarea,code,pre,[contenteditable],[data-no-translate]";

/**
 * Shows Hindi for any English string in the dictionary, wherever it is on screen.
 * Only known text changes (see lookup), so questions, transcripts, names and AI feedback
 * stay as written.
 */
export function PageTranslator({
  language,
  dictionary,
}: {
  language: "en" | "hi";
  dictionary: Map<string, string>;
}) {
  useEffect(() => {
    if (language !== "hi") return;
    const texts = new Map<Text, string>();
    const attrs = new Map<Element, Record<string, string>>();
    const text = (node: Text) => {
      const value = node.data;
      if (!value.trim() || node.parentElement?.closest(SKIP)) return;
      const hindi = lookup(dictionary, value);
      if (!hindi) return;
      texts.set(node, value);
      node.data = value.replace(value.trim(), hindi);
    };
    const element = (el: Element) => {
      if (el.closest(SKIP)) return;
      for (const name of ATTRIBUTES) {
        const value = el.getAttribute(name);
        const hindi = value && lookup(dictionary, value);
        if (!value || !hindi) continue;
        attrs.set(el, { ...attrs.get(el), [name]: value });
        el.setAttribute(name, hindi);
      }
    };
    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return text(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      element(root as Element);
      (root as Element)
        .querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(","))
        .forEach(element);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) text(walker.currentNode as Text);
    };
    walk(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") text(record.target as Text);
        else if (record.type === "attributes") element(record.target as Element);
        else record.addedNodes.forEach(walk);
      }
      // Our own writes need no second look.
      observer.takeRecords();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    });
    return () => {
      observer.disconnect();
      texts.forEach((value, node) => {
        if (node.isConnected) node.data = value;
      });
      attrs.forEach((saved, el) =>
        Object.entries(saved).forEach(([name, value]) => el.setAttribute(name, value))
      );
    };
  }, [language, dictionary]);
  return null;
}
