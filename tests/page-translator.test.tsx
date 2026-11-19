import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lookup, PageTranslator, tidy } from "@/lib/i18n/page-translator";

const dictionary = new Map([
  [tidy("Your feedback is ready."), "आपका फ़ीडबैक तैयार है।"],
  [tidy("We couldn't load this."), "यह नहीं खुला।"],
  [tidy("Close"), "बंद करें"],
]);
const flush = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

it("shows Hindi for known text and restores English when switched back", async () => {
  const view = render(
    <main>
      <PageTranslator language="hi" dictionary={dictionary} />
      <p>Your feedback is ready.</p>
    </main>
  );
  await flush();
  expect(screen.getByText("आपका फ़ीडबैक तैयार है।")).toBeInTheDocument();
  view.rerender(
    <main>
      <PageTranslator language="en" dictionary={dictionary} />
      <p>Your feedback is ready.</p>
    </main>
  );
  await flush();
  expect(screen.getByText("Your feedback is ready.")).toBeInTheDocument();
});

it("matches either kind of apostrophe and translates labels", async () => {
  render(
    <main>
      <PageTranslator language="hi" dictionary={dictionary} />
      <p>We couldn’t load this.</p>
      <button type="button" aria-label="Close">
        x
      </button>
    </main>
  );
  await flush();
  expect(screen.getByText("यह नहीं खुला।")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "बंद करें" })).toBeInTheDocument();
});

it("leaves a learner's own words and typed text alone", async () => {
  render(
    <main>
      <PageTranslator language="hi" dictionary={dictionary} />
      <p>I think Close is the wrong word here.</p>
      <p data-no-translate="">Close</p>
      <textarea defaultValue="Close" aria-label="answer" />
    </main>
  );
  await flush();
  expect(screen.getByText("I think Close is the wrong word here.")).toBeInTheDocument();
  expect(screen.getByText("Close", { selector: "p" })).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toHaveValue("Close");
});

it("translates text that appears after the page has loaded", async () => {
  render(
    <main>
      <PageTranslator language="hi" dictionary={dictionary} />
      <p id="later" />
    </main>
  );
  await flush();
  const later = document.getElementById("later") as HTMLElement;
  later.textContent = "Close";
  await flush();
  expect(later.textContent).toBe("बंद करें");
});

describe("lookup", () => {
  const dictionary = new Map([
    ["{n} questions · about {n} minutes", "{n} सवाल · लगभग {n} मिनट"],
    ["easy", "आसान"],
    ["Finished", "पूरा हुआ"],
  ]);
  it("fills numbers into a template entry, in order", () => {
    expect(lookup(dictionary, "5 questions · about 15 minutes")).toBe("5 सवाल · लगभग 15 मिनट");
  });
  it("translates each part of a dotted line and keeps unknown parts", () => {
    expect(lookup(dictionary, "Tue, 20 Oct · easy · Finished")).toBe(
      "मंगल, 20 अक्टू॰ · आसान · पूरा हुआ"
    );
    expect(lookup(dictionary, "Asha Rao · easy")).toBe("Asha Rao · आसान");
  });
  it("leaves text it does not know alone", () => {
    expect(lookup(dictionary, "Asha Rao")).toBeUndefined();
    expect(lookup(dictionary, "7 apples")).toBeUndefined();
  });
});
