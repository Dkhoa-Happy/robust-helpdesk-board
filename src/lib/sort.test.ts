import { describe, expect, it } from "vitest";
import { sortRequests } from "./sort";
import type { HelpdeskRequest } from "../types";

const makeItem = (id: number, created_at: string, due_on: string | null): HelpdeskRequest => ({
  id,
  ref: `WO-${id}`,
  title: `Item ${id}`,
  location: "Lobby",
  site_id: 11,
  status: "pending",
  priority: "Medium",
  created_at,
  updated_at: created_at,
  due_on,
  assignee: null,
  deleted_at: null,
  merged_into_id: null,
});

describe("sortRequests", () => {
  const r1 = makeItem(1, "2026-10-01T10:00:00Z", "2026-10-05");
  const r2 = makeItem(2, "2026-10-03T10:00:00Z", "2026-10-02");
  const r3 = makeItem(3, "2026-10-02T10:00:00Z", null);

  it("sorts by created_at ascending", () => {
    const sorted = sortRequests([r2, r1, r3], "created_at", "asc");
    expect(sorted.map((r) => r.id)).toEqual([1, 3, 2]);
  });

  it("sorts by created_at descending", () => {
    const sorted = sortRequests([r1, r2, r3], "created_at", "desc");
    expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it("sorts by due_on ascending with nulls at the end", () => {
    const sorted = sortRequests([r1, r2, r3], "due_on", "asc");
    expect(sorted.map((r) => r.id)).toEqual([2, 1, 3]);
  });

  it("sorts by due_on descending with nulls at the end", () => {
    const sorted = sortRequests([r1, r2, r3], "due_on", "desc");
    expect(sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});
