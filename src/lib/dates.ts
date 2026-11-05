// Date and rule helpers. The API wants DD/MM/YYYY; the rules talk about each site's local date.

import type { HelpdeskRequest, RequestEvent } from "../types";

/** "2026-10-06" -> "06/10/2026" (the format the API's created_from/created_to expect). */
export function toApiDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Not a YYYY-MM-DD date: ${isoDate}`);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** The YYYY-MM-DD date of an instant in a given IANA timezone. */
export function localDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today's date, as YYYY-MM-DD, minus `days` days (UTC arithmetic on the calendar date). */
export function daysAgo(days: number, today = new Date()): string {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days));
  return date.toISOString().slice(0, 10);
}

/**
 * Format an ISO UTC string or Date or Unix timestamp (seconds) into site-local date and time, naming the zone.
 * Example: "06 Nov 2026, 09:15:07 SGT (Asia/Singapore)"
 */
export function formatSiteDateTime(
  instant: Date | string | number | null | undefined,
  timeZone: string
): string {
  if (instant == null) return "—";

  let date: Date;
  if (typeof instant === "number") {
    // Unix timestamp in seconds
    date = new Date(instant * 1000);
  } else if (typeof instant === "string") {
    // Check if it's "DD/MM/YYYY HH:MM" (due_at format on an event)
    const ddmmyyyyMatch = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(instant);
    if (ddmmyyyyMatch) {
      const [, day, month, year, hours, minutes] = ddmmyyyyMatch;
      // It is already site-local wall-clock time
      return `${day}/${month}/${year} ${hours}:${minutes} (${timeZone})`;
    }
    date = new Date(instant);
  } else {
    date = instant;
  }

  if (isNaN(date.getTime())) return String(instant);

  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(date);
    return `${formatted} (${timeZone})`;
  } catch {
    return `${date.toISOString()} (${timeZone})`;
  }
}

/**
 * Format a site-local date (e.g. due_on: "YYYY-MM-DD") naming the zone.
 */
export function formatSiteDueDate(dueOn: string | null | undefined, timeZone: string): string {
  if (!dueOn) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueOn);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year} (${timeZone})`;
  }
  return `${dueOn} (${timeZone})`;
}

/**
 * Rule 1 helper: Check if request counts for the given date range.
 * - created_at, converted to site's local date, is between from and to inclusive
 * - skip requests with status "canceled", deleted_at set, or merged_into_id set
 */
export function requestCounts(
  req: HelpdeskRequest,
  from: string,
  to: string,
  siteTimezone: string
): boolean {
  if (req.status === "canceled") return false;
  if (req.deleted_at !== null) return false;
  if (req.merged_into_id !== null) return false;

  const createdDate = localDate(new Date(req.created_at), siteTimezone);
  return createdDate >= from && createdDate <= to;
}

/**
 * Rule 2: Overdue.
 * Status is pending or processing, and due_on (a site-local date) is before today's date in site's timezone.
 * due_on: null is never overdue.
 */
export function isRequestOverdue(
  req: HelpdeskRequest,
  siteTimezone: string,
  today = new Date()
): boolean {
  if (req.status !== "pending" && req.status !== "processing") return false;
  if (!req.due_on) return false;
  const todayInSite = localDate(today, siteTimezone);
  return req.due_on < todayInSite;
}

/**
 * Rule 5: Undone events.
 * An event with reverts_id undoes the event it points at. Hide both from the timeline by default.
 */
export function filterEvents(
  events: RequestEvent[],
  showUndone: boolean
): {
  visibleEvents: RequestEvent[];
  revertedIds: Set<number>;
  revertingIds: Set<number>;
} {
  const revertedIds = new Set<number>();
  const revertingIds = new Set<number>();

  for (const ev of events) {
    if (ev.reverts_id != null) {
      revertedIds.add(ev.reverts_id);
      revertingIds.add(ev.id);
    }
  }

  if (showUndone) {
    return { visibleEvents: events, revertedIds, revertingIds };
  }

  const visibleEvents = events.filter(
    (ev) => !revertedIds.has(ev.id) && !revertingIds.has(ev.id)
  );

  return { visibleEvents, revertedIds, revertingIds };
}

/**
 * Rule 6: First response.
 * The earliest event (by `at`) with status `processing` and an `actor_id` (System events have actor_id: null).
 */
export function findFirstResponse(events: RequestEvent[]): RequestEvent | null {
  const candidateEvents = events.filter(
    (e) => e.status === "processing" && e.actor_id !== null
  );
  if (candidateEvents.length === 0) return null;

  return candidateEvents.reduce(
    (earliest, current) => (current.at < earliest.at ? current : earliest),
    candidateEvents[0]
  );
}
