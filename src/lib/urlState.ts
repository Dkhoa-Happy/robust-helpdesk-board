import type { BoardFilters, SortDirection, SortField, Status } from "../types";
import { daysAgo } from "./dates";

export function getDefaultFilters(): BoardFilters {
  return {
    from: daysAgo(30),
    to: daysAgo(0),
    siteId: "all",
    status: "all",
    sortField: "created_at",
    sortDirection: "desc",
    page: 1,
    pageSize: 20,
  };
}

export function parseUrlFilters(search: string): {
  filters: BoardFilters;
  selectedRequestId: number | null;
} {
  const params = new URLSearchParams(search);
  const defaults = getDefaultFilters();

  const from = params.get("from") || defaults.from;
  const to = params.get("to") || defaults.to;

  const rawSite = params.get("site");
  const siteId =
    rawSite && rawSite !== "all" && !isNaN(Number(rawSite))
      ? Number(rawSite)
      : "all";

  const rawStatus = params.get("status");
  const validStatuses: Status[] = [
    "pending",
    "processing",
    "complete",
    "canceled",
  ];
  const status: Status | "all" =
    rawStatus && (validStatuses as string[]).includes(rawStatus)
      ? (rawStatus as Status)
      : "all";

  const rawSort = params.get("sort");
  const sortField: SortField = rawSort === "due_on" ? "due_on" : "created_at";

  const rawDir = params.get("dir");
  const sortDirection: SortDirection = rawDir === "asc" ? "asc" : "desc";

  const rawPage = params.get("page");
  const page = rawPage && !isNaN(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1;

  const rawPageSize = params.get("pageSize");
  const pageSize = rawPageSize && [10, 20, 50, 100].includes(Number(rawPageSize)) ? Number(rawPageSize) : 20;

  const rawReqId = params.get("request");
  const selectedRequestId =
    rawReqId && !isNaN(Number(rawReqId)) ? Number(rawReqId) : null;

  return {
    filters: {
      from,
      to,
      siteId,
      status,
      sortField,
      sortDirection,
      page,
      pageSize,
    },
    selectedRequestId,
  };
}

export function serializeFiltersToQuery(
  filters: BoardFilters,
  selectedRequestId: number | null = null,
): string {
  const params = new URLSearchParams();
  const defaults = getDefaultFilters();

  if (filters.from !== defaults.from) params.set("from", filters.from);
  if (filters.to !== defaults.to) params.set("to", filters.to);
  if (filters.siteId !== "all") params.set("site", String(filters.siteId));
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sortField !== defaults.sortField)
    params.set("sort", filters.sortField);
  if (filters.sortDirection !== defaults.sortDirection)
    params.set("dir", filters.sortDirection);
  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
  if (filters.pageSize && filters.pageSize !== 20)
    params.set("pageSize", String(filters.pageSize));
  if (selectedRequestId !== null)
    params.set("request", String(selectedRequestId));

  const str = params.toString();
  return str ? `?${str}` : "";
}
