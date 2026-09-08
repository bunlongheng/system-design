import { describe, it, expect } from "vitest";
import { titleBase, MIN_BASE_LEN } from "../../lib/title-base.js";

describe("titleBase", () => {
  it("collapses the version suffixes that caused the v2/v2.1/v2.2 spam", () => {
    const base = titleBase("BC Integrations - Integry Decommission (SHAR-7027) v2");
    expect(titleBase("BC Integrations - Integry Decommission (SHAR-7027) v2.1")).toBe(base);
    expect(titleBase("BC Integrations - Integry Decommission (SHAR-7027) v2.2")).toBe(base);
    expect(titleBase("BC Integrations - Integry Decommission (SHAR-7027)")).toBe(base);
  });

  it("treats a genuinely different diagram as different", () => {
    expect(titleBase("BC Vendor Exit - Integrations + Billing (SHAR-7027) v3")).not.toBe(
      titleBase("BC Integrations - Integry Decommission (SHAR-7027) v2"),
    );
  });

  it("keeps a number that is part of the name, not a version", () => {
    // "500M Subscribers" must survive - only a TRAILING version is stripped.
    expect(titleBase("Email Newsletter - 500M Subscribers")).toBe("email newsletter 500m subscribers");
  });

  it("normalises punctuation and case so cosmetic edits still match", () => {
    expect(titleBase("Stock Bots -- FINAL: 5 Bots")).toBe(titleBase("stock bots final 5 bots"));
  });

  it("is empty or short for titles too generic to accuse", () => {
    expect(titleBase("v2").length).toBeLessThan(MIN_BASE_LEN);
    expect(titleBase("").length).toBeLessThan(MIN_BASE_LEN);
    expect(titleBase(null).length).toBeLessThan(MIN_BASE_LEN);
  });
});
