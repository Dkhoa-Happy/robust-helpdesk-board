# DECISIONS

## What I assumed

- **Default date range**: Defaults to the last 30 calendar days (from `daysAgo(30)` to `daysAgo(0)`) matching standard helpdesk operations.
- **Timezone-aware query buffering (Rule 1)**: Helpdesk sites span three distinct timezones (Singapore UTC+8, Sydney UTC+10/11, Jakarta UTC+7). Because the API's `created_from` and `created_to` parameters filter by UTC date, querying strictly by local calendar dates would drop requests created during local evening/morning boundary hours. We query the API with a $\pm 1$ day buffer and strictly filter each request client-side using `localDate(created_at, siteTimezone)`.
- **Rule 1 excluded requests**: In accordance with Rule 1, any request with status `canceled`, `deleted_at != null`, or `merged_into_id != null` is excluded from the board. When users filter by status, the available active options are `All`, `Pending`, `Processing`, and `Complete`.
- **Sorting null due dates**: When sorting by due date (`due_on`), requests without a due date (`due_on: null`) sort to the bottom in both ascending and descending order, allowing managers to prioritize actionable deadlines.
- **Event timeline order**: Events for a request are displayed newest-first with timestamps, actor names, and local timezone indicators.
- **Polling interval**: The helpdesk changes continuously. We poll every 30 seconds (well within the required 1-minute window) and provide an immediate manual "Refresh" button alongside a real-time relative "Updated Xs ago" indicator.
- **Pagination (shadcn/ui)**: To prevent endless scrolling and keep rendering fast and focused, we implemented pagination using shadcn/ui components (`Pagination`, `PaginationContent`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`). Page size defaults to 20 with options for 10, 20, 50, and 100. Both `page` and `pageSize` are synchronized in URL search params so shared links preserve the exact view.
- **DatePicker (shadcn/ui & Lucide React)**: Built a custom shadcn/ui-styled date picker popover (`DatePicker`) with calendar month navigation, accessible keyboard navigation, and `lucide-react` icons (`Calendar`, `ChevronLeft`, `ChevronRight`, `Building2`, `RefreshCw`, `Share2`, `AlertTriangle`, `MapPin`, `ClipboardList`).

## What I found in the API or data

- **Rate limiting (429) with `Retry-After`**: The practice API enforces rate limiting (roughly 5 requests per second window) and returns HTTP 429 with a `Retry-After` header. To prevent broken views, we implemented automatic retry logic with backoff in `src/api.ts` that respects `Retry-After` (plus a 200ms buffer) and retries up to 3 times.
- **`site_id` and `sort` parameters are ignored by `GET /v1/requests`**: Testing the API directly revealed that passing `site_id=12` or `sort=due_on` had no effect on the backend output—it always returned requests across all sites ordered by newest `created_at`. We handled this by performing site filtering and multi-field sorting client-side over the fetched dataset.
- **Status parameter format**: `GET /v1/requests` accepts a JSON-encoded array for `status` (e.g. `status=["pending","processing","complete"]`). Sending this allows us to exclude canceled requests at the API layer.
- **Undone events (`reverts_id`)**: Live data contains events with `reverts_id` pointing to earlier events. Rule 5 states that both the revert event and the event it points to must be hidden by default. We implemented a bipartite ID set filter and added an explicit toggle in the UI: "Show undone events (X hidden)".
- **Stale names in request and event objects (Rule 3)**: Request objects include `assignee.name` and event objects include `actor_name`, but the brief notes these can be stale. We strictly look up names by `id` from `/v1/staff`.
- **Mixed timestamp formats (Rule 4)**: `created_at` and `updated_at` are UTC ISO 8601 strings; `event.at` is Unix seconds; `event.due_at` is local wall-clock string (`DD/MM/YYYY HH:MM`). Each format is normalized and rendered in the site's IANA timezone naming the zone.

## How I used AI

- Used Antigravity AI (Gemini 3.8 Flash) for exploration, rapid test authoring, and UI implementation.
- Used AI to probe the practice API endpoints with sample queries to discover backend quirks (rate limiting thresholds, ignored query parameters, and date filtering semantics).
- Wrote full unit test suites for dates, overdue logic, URL synchronization, and sorting using Vitest before and after UI construction.
- Validated that all generated code passed TypeScript typechecking (`tsc --noEmit`) and Vite production builds with zero warnings.

## Trade-offs and what I would do next

- **Change feed (`/v1/changes`) vs periodic requests polling**: The change feed starts from `seq: 1` if no cursor is supplied. Catching up from `seq: 1` on page load requires dozens of requests and triggers 429 rate limits. We opted for range-based request fetching with 30s background polling. With more time, we would implement cursor persistence in `localStorage` to tail the change feed incrementally after an initial page load.
- **Virtualization for massive date ranges**: Over 30 days there are ~1,800 requests. While modern browsers handle ~1,800 DOM nodes smoothly, querying 1 year or more would benefit from virtualized scrolling (e.g., `@tanstack/react-virtual`).
- **Site business hours and holidays**: The API provides business hours and holiday schedules via `/v1/sites/{id}/holidays`. With more time, we could highlight when a due date falls on a closed business day or holiday.
- **End-to-end tests**: We wrote 28 unit tests covering all six brief rules. Adding Playwright end-to-end tests would further verify cross-browser keyboard interaction and screen reader live announcements.
