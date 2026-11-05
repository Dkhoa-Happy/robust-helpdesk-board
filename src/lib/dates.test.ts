import { describe, expect, it } from "vitest";
import {
  daysAgo,
  filterEvents,
  findFirstResponse,
  formatSiteDateTime,
  formatSiteDueDate,
  isRequestOverdue,
  localDate,
  requestCounts,
  toApiDate,
} from "./dates";
import type { HelpdeskRequest, RequestEvent } from "../types";

describe("toApiDate", () => {
  it("turns an ISO date into the API's DD/MM/YYYY", () => {
    expect(toApiDate("2026-10-06")).toBe("06/10/2026");
    expect(toApiDate("2026-01-02")).toBe("02/01/2026");
  });

  it("refuses anything else", () => {
    expect(() => toApiDate("06/10/2026")).toThrow();
    expect(() => toApiDate("2026-10")).toThrow();
  });
});

describe("localDate", () => {
  it("is the next day in Sydney when it is still evening in UTC", () => {
    const eveningUtc = new Date("2026-10-06T20:00:00Z");
    expect(localDate(eveningUtc, "Australia/Sydney")).toBe("2026-10-07");
    expect(localDate(eveningUtc, "Asia/Singapore")).toBe("2026-10-07");
    expect(localDate(eveningUtc, "UTC")).toBe("2026-10-06");
  });

  it("handles Jakarta timezone (UTC+7)", () => {
    const morningUtc = new Date("2026-10-06T00:30:00Z");
    expect(localDate(morningUtc, "Asia/Jakarta")).toBe("2026-10-06");
  });
});

describe("daysAgo", () => {
  it("counts back across a month boundary", () => {
    const oct1 = new Date("2026-10-01T12:00:00Z");
    expect(daysAgo(1, oct1)).toBe("2026-09-30");
    expect(daysAgo(30, oct1)).toBe("2026-09-01");
  });
});

describe("formatSiteDateTime and formatSiteDueDate", () => {
  it("formats ISO UTC string into local time with timezone name", () => {
    const formatted = formatSiteDateTime("2026-10-06T02:15:07Z", "Asia/Singapore");
    expect(formatted).toContain("06 Oct 2026");
    expect(formatted).toContain("10:15:07");
    expect(formatted).toContain("(Asia/Singapore)");
  });

  it("formats Unix timestamp into local time with timezone name", () => {
    // 1791874530 = 2026-10-12T06:55:30Z
    const formatted = formatSiteDateTime(1791874530, "Australia/Sydney");
    expect(formatted).toContain("(Australia/Sydney)");
  });

  it("formats due_at string from event (wall-clock time)", () => {
    const formatted = formatSiteDateTime("07/10/2026 10:00", "Asia/Jakarta");
    expect(formatted).toBe("07/10/2026 10:00 (Asia/Jakarta)");
  });

  it("formats due_on date with timezone name", () => {
    expect(formatSiteDueDate("2026-11-05", "Asia/Singapore")).toBe("05/11/2026 (Asia/Singapore)");
    expect(formatSiteDueDate(null, "Asia/Singapore")).toBe("—");
  });
});

describe("requestCounts (Rule 1)", () => {
  const baseRequest: HelpdeskRequest = {
    id: 1,
    ref: "WO-1",
    title: "Test",
    location: "Lobby",
    site_id: 11,
    status: "pending",
    priority: "High",
    created_at: "2026-10-06T18:00:00Z", // In Singapore (UTC+8) -> 2026-10-07 02:00
    updated_at: "2026-10-06T18:00:00Z",
    due_on: "2026-10-08",
    assignee: null,
    deleted_at: null,
    merged_into_id: null,
  };

  it("counts when converted site local date is within from and to inclusive", () => {
    expect(requestCounts(baseRequest, "2026-10-07", "2026-10-07", "Asia/Singapore")).toBe(true);
    expect(requestCounts(baseRequest, "2026-10-06", "2026-10-06", "Asia/Singapore")).toBe(false);
  });

  it("skips canceled requests", () => {
    const canceled = { ...baseRequest, status: "canceled" as const };
    expect(requestCounts(canceled, "2026-10-01", "2026-10-10", "Asia/Singapore")).toBe(false);
  });

  it("skips deleted requests", () => {
    const deleted = { ...baseRequest, deleted_at: "2026-10-07T00:00:00Z" };
    expect(requestCounts(deleted, "2026-10-01", "2026-10-10", "Asia/Singapore")).toBe(false);
  });

  it("skips merged requests", () => {
    const merged = { ...baseRequest, merged_into_id: 999 };
    expect(requestCounts(merged, "2026-10-01", "2026-10-10", "Asia/Singapore")).toBe(false);
  });
});

describe("isRequestOverdue (Rule 2)", () => {
  const simulatedToday = new Date("2026-11-05T00:00:00Z");

  const makeReq = (status: HelpdeskRequest["status"], due_on: string | null): HelpdeskRequest => ({
    id: 10,
    ref: "WO-10",
    title: "Test",
    location: "Lobby",
    site_id: 11,
    status,
    priority: "Low",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    due_on,
    assignee: null,
    deleted_at: null,
    merged_into_id: null,
  });

  it("is overdue when pending or processing and due_on is before today in site's timezone", () => {
    expect(isRequestOverdue(makeReq("pending", "2026-11-04"), "Asia/Singapore", simulatedToday)).toBe(true);
    expect(isRequestOverdue(makeReq("processing", "2026-11-04"), "Asia/Singapore", simulatedToday)).toBe(true);
  });

  it("is not overdue when due_on is today or later", () => {
    expect(isRequestOverdue(makeReq("pending", "2026-11-05"), "Asia/Singapore", simulatedToday)).toBe(false);
    expect(isRequestOverdue(makeReq("pending", "2026-11-06"), "Asia/Singapore", simulatedToday)).toBe(false);
  });

  it("is never overdue when due_on is null", () => {
    expect(isRequestOverdue(makeReq("pending", null), "Asia/Singapore", simulatedToday)).toBe(false);
  });

  it("is not overdue when completed", () => {
    expect(isRequestOverdue(makeReq("complete", "2026-11-01"), "Asia/Singapore", simulatedToday)).toBe(false);
  });
});

describe("filterEvents (Rule 5)", () => {
  const events: RequestEvent[] = [
    { id: 1, status: "pending", at: 100, actor_id: null, actor_name: "System", assignee_name: null, due_at: null, note: null, reverts_id: null },
    { id: 2, status: "processing", at: 200, actor_id: 304, actor_name: "Ben", assignee_name: null, due_at: null, note: "Wrong note", reverts_id: null },
    { id: 3, status: "processing", at: 300, actor_id: 304, actor_name: "Ben", assignee_name: null, due_at: null, note: "Revert note", reverts_id: 2 },
    { id: 4, status: "complete", at: 400, actor_id: 304, actor_name: "Ben", assignee_name: null, due_at: null, note: "Done", reverts_id: null },
  ];

  it("hides both reverted and reverting events by default", () => {
    const { visibleEvents, revertedIds, revertingIds } = filterEvents(events, false);
    expect(visibleEvents.map((e) => e.id)).toEqual([1, 4]);
    expect(revertedIds.has(2)).toBe(true);
    expect(revertingIds.has(3)).toBe(true);
  });

  it("shows all events when showUndone is true", () => {
    const { visibleEvents } = filterEvents(events, true);
    expect(visibleEvents.map((e) => e.id)).toEqual([1, 2, 3, 4]);
  });
});

describe("findFirstResponse (Rule 6)", () => {
  it("finds the earliest event with status processing and an actor_id", () => {
    const events: RequestEvent[] = [
      { id: 1, status: "pending", at: 100, actor_id: null, actor_name: "System", assignee_name: null, due_at: null, note: null, reverts_id: null },
      { id: 2, status: "processing", at: 200, actor_id: null, actor_name: "System", assignee_name: null, due_at: null, note: null, reverts_id: null },
      { id: 3, status: "processing", at: 300, actor_id: 304, actor_name: "Ben", assignee_name: null, due_at: null, note: null, reverts_id: null },
      { id: 4, status: "processing", at: 250, actor_id: 305, actor_name: "Alice", assignee_name: null, due_at: null, note: null, reverts_id: null },
    ];

    const first = findFirstResponse(events);
    expect(first).not.toBeNull();
    expect(first?.id).toBe(4);
    expect(first?.actor_id).toBe(305);
  });

  it("returns null if no response with actor_id exists", () => {
    const events: RequestEvent[] = [
      { id: 1, status: "pending", at: 100, actor_id: null, actor_name: "System", assignee_name: null, due_at: null, note: null, reverts_id: null },
    ];
    expect(findFirstResponse(events)).toBeNull();
  });
});
