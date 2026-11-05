// A thin client for the helpdesk API with automatic 429 rate limit retry and backoff.

import type { HelpdeskRequest, Page, RequestEvent, Site, Staff, StatusItem } from "./types";

const BASE = (import.meta.env.HELPDESK_URL ?? "").replace(/\/$/, "");
const TOKEN = import.meta.env.HELPDESK_TOKEN ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfterSeconds: number | null = null,
  ) {
    super(message);
  }
}

export function configured(): boolean {
  return Boolean(BASE && TOKEN);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function get<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  retries = 3
): Promise<T> {
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        if (attempt < retries) {
          // Wait according to Retry-After header with a small margin, then retry
          await sleep((retryAfter + 0.2) * 1000);
          continue;
        }
        throw new ApiError(429, "Helpdesk is currently rate-limited (too many requests).", retryAfter);
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const message = body.error ?? response.statusText;
        // If 5xx server error and we have retries left, wait and retry
        if (response.status >= 500 && attempt < retries) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
        throw new ApiError(response.status, message);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      // Network failure
      if (attempt < retries) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      throw new ApiError(0, err instanceof Error ? err.message : "Network error");
    }
  }

  throw new ApiError(0, "Request failed after retries");
}

export const listRequests = (params: {
  page?: number;
  per_page?: number;
  created_from?: string;
  created_to?: string;
  status?: string;
}) => get<Page<HelpdeskRequest>>("/v1/requests", params);

export const getRequest = (id: number) => get<HelpdeskRequest>(`/v1/requests/${id}`);

export const listEvents = (id: number, page = 1) =>
  get<Page<RequestEvent>>(`/v1/requests/${id}/events`, { page, per_page: 50 });

/**
 * Fetch all pages of events for a request to guarantee complete history and accurate first response.
 */
export async function listAllEvents(id: number): Promise<RequestEvent[]> {
  const allEvents: RequestEvent[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await listEvents(id, page);
    allEvents.push(...res.data);
    if (!res.has_more || res.data.length === 0) {
      hasMore = false;
    } else {
      page += 1;
      // Brief pause to prevent bursting the rate limit
      await sleep(100);
    }
  }

  return allEvents;
}

export const listSites = () => get<{ data: Site[] }>("/v1/sites");

export const listStaff = () => get<{ data: Staff[] }>("/v1/staff");

export const listStatuses = () => get<{ data: StatusItem[] }>("/v1/statuses");
