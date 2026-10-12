/**
 * The difficulty picker must stay in step with what the server will accept.
 *
 * Background: the picker was a hardcoded list of all four levels, always
 * rendered, defaulting to medium. If a facilitator published questions only at
 * easy and a student picked medium - or simply left the default - the backend
 * silently generated AI questions instead of refusing, so the student was
 * assessed against that facilitator's role on questions the facilitator had
 * never seen. The server now refuses that and publishes `availableDifficulties`.
 *
 * The three-case distinction in `offeredDifficulties` is the subtle part, and
 * getting it wrong has already caused a bug once: a first version of this change
 * applied the restriction to every job profile, which would have blocked every
 * non-tech interview on a published role with no curated questions, because
 * that flow legitimately falls back to a blueprint. Those cases are pinned here
 * rather than left to inspection.
 */

import { describe, expect, it } from "vitest";

import {
  DIFFICULTY_LEVEL,
  correctedDifficulty,
  isDifficultyOffered,
  isNonTechCategory,
  offeredDifficulties,
  unavailableDifficultyMessage,
} from "@/lib/interview-difficulty";

describe("offeredDifficulties", () => {
  it("restricts a curated tech role to what the facilitator published", () => {
    expect(
      offeredDifficulties({ isTechFlow: true, profileAvailableDifficulties: ["easy"] })
    ).toEqual(["easy"]);
  });

  it("leaves free practice unrestricted", () => {
    // No job profile behind the role, so no availability field arrives.
    expect(
      offeredDifficulties({ isTechFlow: true, profileAvailableDifficulties: undefined })
    ).toBeUndefined();
  });

  it("leaves the non-tech flow unrestricted even when a role has no levels", () => {
    // The regression this file exists for. Non-tech has no level picker and
    // falls back to a blueprint, so restricting it blocks the role entirely.
    expect(
      offeredDifficulties({ isTechFlow: false, profileAvailableDifficulties: [] })
    ).toBeUndefined();
  });

  it("leaves the non-tech flow unrestricted when a role does have levels", () => {
    expect(
      offeredDifficulties({ isTechFlow: false, profileAvailableDifficulties: ["hard"] })
    ).toBeUndefined();
  });

  it("passes through an empty list for a curated role with nothing ready", () => {
    // Distinct from undefined: the picker shows "no levels ready" for this.
    expect(offeredDifficulties({ isTechFlow: true, profileAvailableDifficulties: [] })).toEqual([]);
  });
});

describe("isNonTechCategory", () => {
  it.each(["HR & Non-Technical", "Communication", "hr", "NON-TECHNICAL"])(
    "routes %s to the non-tech flow",
    (category) => {
      expect(isNonTechCategory(category)).toBe(true);
    }
  );

  it.each(["Backend Developer", "Data Science", "Full Stack Developer"])(
    "keeps %s on the tech flow",
    (category) => {
      expect(isNonTechCategory(category)).toBe(false);
    }
  );

  it("treats a missing category as tech rather than throwing", () => {
    expect(isNonTechCategory(undefined)).toBe(false);
  });
});

describe("isDifficultyOffered", () => {
  it("offers everything when unrestricted", () => {
    for (const option of DIFFICULTY_LEVEL) {
      expect(isDifficultyOffered(option.key, undefined)).toBe(true);
    }
  });

  it("offers only the published levels when restricted", () => {
    expect(isDifficultyOffered("easy", ["easy"])).toBe(true);
    expect(isDifficultyOffered("medium", ["easy"])).toBe(false);
  });

  it("offers nothing for a role with no levels ready", () => {
    for (const option of DIFFICULTY_LEVEL) {
      expect(isDifficultyOffered(option.key, [])).toBe(false);
    }
  });
});

describe("correctedDifficulty", () => {
  it("replaces the medium default when only easy is published", () => {
    // Without this, every student on an easy-only role submits medium and meets
    // a server refusal instead of starting an interview.
    expect(correctedDifficulty("medium", ["easy"])).toBe("easy");
  });

  it("keeps a choice that is still published", () => {
    expect(correctedDifficulty("hard", ["easy", "hard"])).toBe("hard");
  });

  it("picks the easiest available, as the server orders them", () => {
    expect(correctedDifficulty("expert", ["medium", "hard"])).toBe("medium");
  });

  it("leaves the choice alone when unrestricted", () => {
    expect(correctedDifficulty("medium", undefined)).toBe("medium");
  });

  it("selects nothing for a role with no levels ready", () => {
    expect(correctedDifficulty("medium", [])).toBe("");
  });

  it("is stable, so the correcting effect cannot loop", () => {
    // Applied twice must equal applied once, or the useEffect that calls this
    // would set state on every render.
    const once = correctedDifficulty("medium", ["easy", "hard"]);
    expect(correctedDifficulty(once, ["easy", "hard"])).toBe(once);
  });
});

describe("unavailableDifficultyMessage", () => {
  it("stays silent when the level can be started", () => {
    expect(unavailableDifficultyMessage("easy", ["easy"])).toBeNull();
    expect(unavailableDifficultyMessage("medium", undefined)).toBeNull();
  });

  it("names the level asked for and what can be started instead", () => {
    const message = unavailableDifficultyMessage("medium", ["easy", "hard"]);

    expect(message).toContain("medium");
    expect(message).toContain("easy");
    expect(message).toContain("hard");
  });

  it("tells the student the facilitator must act when nothing is ready", () => {
    const message = unavailableDifficultyMessage("medium", []);

    expect(message).toContain("facilitator");
    // Must not imply another level would work, because none would.
    expect(message).not.toContain("Available now");
  });
});
