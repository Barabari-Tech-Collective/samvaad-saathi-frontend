"use client";
import { useEffect } from "react";

/** Screens mix straight and curly apostrophes, so both must find the same entry. */
export const tidy = (text: string) => text.trim().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");

const ATTRIBUTES = ["aria-label", "placeholder", "title"];
const SKIP = "script,style,textarea,code,pre,[contenteditable],[data-no-translate]";

/**
 * Shows Hindi for any English string in the dictionary, wherever it is on screen.
 * Only exact matches change, so questions, transcripts, names and AI feedback stay as written.
 */
export function PageTranslator({ language, dictionary }: { language: "en" | "hi"; dictionary: Map<string, string> }) {
  useEffect(() => {
    if (language !== "hi") return;
    const texts = new Map<Text, string>();
    const attrs = new Map<Element, Record<string, string>>();
    const text = (node: Text) => {
      const value = node.data;
      if (!value.trim() || node.parentElement?.closest(SKIP)) return;
      const hindi = dictionary.get(tidy(value));
      if (!hindi) return;
      texts.set(node, value);
      node.data = value.replace(value.trim(), hindi);
    };
    const element = (el: Element) => {
      if (el.closest(SKIP)) return;
      for (const name of ATTRIBUTES) {
        const value = el.getAttribute(name);
        const hindi = value && dictionary.get(tidy(value));
        if (!value || !hindi) continue;
        attrs.set(el, { ...attrs.get(el), [name]: value });
        el.setAttribute(name, hindi);
      }
    };
    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return text(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      element(root as Element);
      (root as Element).querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(",")).forEach(element);
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
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
    return () => {
      observer.disconnect();
      texts.forEach((value, node) => {
        if (node.isConnected) node.data = value;
      });
      attrs.forEach((saved, el) => Object.entries(saved).forEach(([name, value]) => el.setAttribute(name, value)));
    };
  }, [language, dictionary]);
  return null;
}
