import { describe, expect, it } from "vitest";
import {
  getDefaultFilters,
  parseUrlFilters,
  serializeFiltersToQuery,
} from "./urlState";

describe("urlState", () => {
  it("defaults to last 30 days and all filters", () => {
    const { filters, selectedRequestId } = parseUrlFilters("");
    const defaults = getDefaultFilters();
    expect(filters.from).toBe(defaults.from);
    expect(filters.to).toBe(defaults.to);
    expect(filters.siteId).toBe("all");
    expect(filters.status).toBe("all");
    expect(filters.sortField).toBe("created_at");
    expect(filters.sortDirection).toBe("desc");
    expect(selectedRequestId).toBeNull();
  });

  it("parses query parameters correctly", () => {
    const qs =
      "?from=2026-10-01&to=2026-10-15&site=12&status=pending&sort=due_on&dir=asc&request=65128";
    const { filters, selectedRequestId } = parseUrlFilters(qs);

    expect(filters.from).toBe("2026-10-01");
    expect(filters.to).toBe("2026-10-15");
    expect(filters.siteId).toBe(12);
    expect(filters.status).toBe("pending");
    expect(filters.sortField).toBe("due_on");
    expect(filters.sortDirection).toBe("asc");
    expect(selectedRequestId).toBe(65128);
  });

  it("serializes filters into query string and back", () => {
    const filters = {
      from: "2026-10-01",
      to: "2026-10-20",
      siteId: 11 as const,
      status: "processing" as const,
      sortField: "due_on" as const,
      sortDirection: "asc" as const,
    };
    const query = serializeFiltersToQuery(filters, 41210);
    const parsed = parseUrlFilters(query);

    expect(parsed.filters).toEqual(filters);
    expect(parsed.selectedRequestId).toBe(41210);
  });
});
