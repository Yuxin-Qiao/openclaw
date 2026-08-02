import { render } from "lit";
import { describe, expect, it } from "vitest";
import { i18n } from "../../i18n/index.ts";
import { renderRunsSection } from "./view-runs.ts";

type CronRunsSectionProps = Parameters<typeof renderRunsSection>[0];

function createRunsProps(overrides: Partial<CronRunsSectionProps> = {}): CronRunsSectionProps {
  return {
    basePath: "",
    agentId: "main",
    runs: [],
    runsHasMore: false,
    runsLoadingMore: false,
    runsStatuses: [],
    runsDeliveryStatuses: [],
    runsQuery: "",
    runsSortDir: "desc",
    onLoadMoreRuns: () => undefined,
    onRunsFiltersChange: () => undefined,
    ...overrides,
  };
}

function renderRuns(overrides: Partial<CronRunsSectionProps> = {}) {
  const container = document.createElement("div");
  render(renderRunsSection(createRunsProps(overrides)), container);
  return container;
}

function getFilterTrigger(container: Element, filter: "status" | "delivery") {
  const trigger = container.querySelector<HTMLButtonElement>(
    `[data-filter="${filter}"] .cron-filter-dropdown__trigger`,
  );
  expect(trigger).toBeInstanceOf(HTMLButtonElement);
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${filter} filter trigger`);
  }
  return trigger;
}

describe("cron run filter accessibility", () => {
  it("includes active selections in run filter accessible names", () => {
    const allRuns = renderRuns();
    expect(getFilterTrigger(allRuns, "status").getAttribute("aria-label")).toBe(
      "Status All statuses",
    );
    expect(getFilterTrigger(allRuns, "delivery").getAttribute("aria-label")).toBe(
      "Delivery All delivery",
    );

    const filteredRuns = renderRuns({
      runsStatuses: ["error", "ok", "skipped"],
      runsDeliveryStatuses: ["delivered", "not-delivered", "unknown"],
    });
    const statusTrigger = getFilterTrigger(filteredRuns, "status");
    const deliveryTrigger = getFilterTrigger(filteredRuns, "delivery");
    expect(statusTrigger.getAttribute("aria-label")).toBe("Status OK, Error, and Skipped");
    expect(deliveryTrigger.getAttribute("aria-label")).toBe(
      "Delivery Delivered, Not delivered, and Unknown",
    );
    expect(statusTrigger.textContent).toContain("OK +2");
    expect(deliveryTrigger.textContent).toContain("Delivered +2");
  });

  it("formats translated filter selections using the active app locale", async () => {
    const previousLocale = i18n.getLocale();
    try {
      await i18n.setLocale("de");
      const container = renderRuns({ runsStatuses: ["ok", "error", "skipped"] });
      expect(getFilterTrigger(container, "status").getAttribute("aria-label")).toBe(
        "Status OK, Fehler und Übersprungen",
      );
    } finally {
      await i18n.setLocale(previousLocale);
    }
  });

  it("creates selected run filter markup without a browser document", () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    expect(documentDescriptor).toBeDefined();
    if (!documentDescriptor) {
      throw new Error("Expected a restorable document descriptor");
    }

    try {
      Object.defineProperty(globalThis, "document", { configurable: true, value: undefined });
      expect(() => renderRunsSection(createRunsProps({ runsStatuses: ["error"] }))).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "document", documentDescriptor);
    }
  });
});
