import type { HelpdeskRequest, SortDirection, SortField } from "../types";

export function sortRequests(
  requests: HelpdeskRequest[],
  sortField: SortField,
  sortDirection: SortDirection
): HelpdeskRequest[] {
  return [...requests].sort((a, b) => {
    let cmp = 0;

    if (sortField === "created_at") {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      cmp = timeA - timeB;
    } else if (sortField === "due_on") {
      if (a.due_on === null && b.due_on === null) {
        cmp = 0;
      } else if (a.due_on === null) {
        // nulls always sort to the end
        return 1;
      } else if (b.due_on === null) {
        return -1;
      } else {
        cmp = a.due_on.localeCompare(b.due_on);
      }
    }

    // Secondary sort tiebreaker by id descending
    if (cmp === 0) {
      cmp = b.id - a.id;
    }

    return sortDirection === "asc" ? cmp : -cmp;
  });
}
