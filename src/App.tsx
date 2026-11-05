import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  configured,
  getRequest,
  listRequests,
  listSites,
  listStaff,
} from "./api";
import { daysAgo, isRequestOverdue, requestCounts, toApiDate } from "./lib/dates";
import { sortRequests } from "./lib/sort";
import {
  getDefaultFilters,
  parseUrlFilters,
  serializeFiltersToQuery,
} from "./lib/urlState";
import type { BoardFilters, HelpdeskRequest, Site, SortField, Staff } from "./types";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { RequestsTable } from "./components/RequestsTable";
import { RequestDetailModal } from "./components/RequestDetailModal";

export default function App() {
  // Read initial filters and selected request from URL query params
  const initialUrlState = useMemo(
    () => parseUrlFilters(window.location.search),
    []
  );

  const [filters, setFilters] = useState<BoardFilters>(initialUrlState.filters);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    initialUrlState.selectedRequestId
  );

  // Metadata
  const [sites, setSites] = useState<Site[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  // Requests state
  const [rawRequests, setRawRequests] = useState<HelpdeskRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<HelpdeskRequest | null>(null);

  // Status & Polling
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref to cancel/ignore stale fetch requests
  const fetchSessionRef = useRef<number>(0);

  // Create fast lookup maps
  const sitesMap = useMemo(() => {
    const map = new Map<number, Site>();
    for (const site of sites) map.set(site.id, site);
    return map;
  }, [sites]);

  const staffMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const person of staff) map.set(person.id, person.name);
    return map;
  }, [staff]);

  // Synchronize browser URL query parameters
  useEffect(() => {
    const queryString = serializeFiltersToQuery(filters, selectedRequestId);
    const newUrl = window.location.pathname + queryString;
    window.history.replaceState(null, "", newUrl);
  }, [filters, selectedRequestId]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlFilters(window.location.search);
      setFilters(parsed.filters);
      setSelectedRequestId(parsed.selectedRequestId);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch metadata (sites and staff)
  useEffect(() => {
    if (!configured()) return;

    Promise.all([listSites(), listStaff()])
      .then(([sitesRes, staffRes]) => {
        setSites(sitesRes.data);
        setStaff(staffRes.data);
      })
      .catch((e: unknown) => {
        const msg = e instanceof ApiError ? `${e.status}: ${e.message}` : String(e);
        setError(`Failed to load sites/staff metadata: ${msg}`);
      });
  }, []);

  // Load requests function
  const loadRequests = useCallback(
    async (isBackground = false) => {
      if (!configured()) return;

      const sessionId = ++fetchSessionRef.current;
      if (isBackground) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        // Expand query date by 1 day on each side to account for all site timezones
        const fromDateObj = new Date(filters.from + "T00:00:00Z");
        const toDateObj = new Date(filters.to + "T00:00:00Z");
        const queryFrom = daysAgo(1, fromDateObj);
        const queryTo = daysAgo(-1, toDateObj);

        // Omit canceled requests from API call directly when possible
        const apiStatusParam =
          filters.status === "all"
            ? JSON.stringify(["pending", "processing", "complete"])
            : JSON.stringify([filters.status]);

        // Load page 1
        const page1 = await listRequests({
          created_from: toApiDate(queryFrom),
          created_to: toApiDate(queryTo),
          status: apiStatusParam,
          per_page: 100,
          page: 1,
        });

        if (fetchSessionRef.current !== sessionId) return;

        let accumulated: HelpdeskRequest[] = [...page1.data];
        setRawRequests(accumulated);
        setLastUpdated(new Date());

        // Fetch remaining pages if any (limit to max 10 pages for safety, handling rate limits)
        const totalPages = Math.min(page1.total_pages ?? 1, 10);
        for (let p = 2; p <= totalPages; p++) {
          if (fetchSessionRef.current !== sessionId) return;

          const nextPage = await listRequests({
            created_from: toApiDate(queryFrom),
            created_to: toApiDate(queryTo),
            status: apiStatusParam,
            per_page: 100,
            page: p,
          });

          if (fetchSessionRef.current !== sessionId) return;

          accumulated = [...accumulated, ...nextPage.data];
          setRawRequests(accumulated);
        }
      } catch (err: unknown) {
        if (fetchSessionRef.current === sessionId) {
          const message =
            err instanceof ApiError
              ? `${err.status === 429 ? "Rate limited (helpdesk busy)" : err.status}: ${err.message}`
              : String(err);
          setError(message);
        }
      } finally {
        if (fetchSessionRef.current === sessionId) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [filters.from, filters.to, filters.status]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    loadRequests(false);
  }, [loadRequests]);

  // Level 3: Keep it live - 30s auto polling
  useEffect(() => {
    const interval = setInterval(() => {
      loadRequests(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadRequests]);

  // Sync selected request modal with selectedRequestId
  useEffect(() => {
    if (selectedRequestId === null) {
      setSelectedRequest(null);
      return;
    }

    // Check if request is already in loaded rawRequests
    const found = rawRequests.find((r) => r.id === selectedRequestId);
    if (found) {
      setSelectedRequest(found);
    } else if (configured()) {
      // If not yet in list (e.g. loaded via URL), fetch it directly
      getRequest(selectedRequestId)
        .then((req) => setSelectedRequest(req))
        .catch(() => {
          setSelectedRequestId(null);
        });
    }
  }, [selectedRequestId, rawRequests]);

  // Rule 1 & Filter processing:
  // Apply Rule 1, site filter, and status filter
  const filteredRequests = useMemo(() => {
    return rawRequests.filter((req) => {
      const site = sitesMap.get(req.site_id);
      const siteTz = site?.timezone ?? "UTC";

      // Rule 1: Which requests count
      if (!requestCounts(req, filters.from, filters.to, siteTz)) {
        return false;
      }

      // Filter by site
      if (filters.siteId !== "all" && req.site_id !== filters.siteId) {
        return false;
      }

      // Filter by status
      if (filters.status !== "all" && req.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [rawRequests, filters.from, filters.to, filters.siteId, filters.status, sitesMap]);

  // Compute breakdown counts
  const counts = useMemo(() => {
    let pending = 0;
    let processing = 0;
    let complete = 0;
    let overdue = 0;

    for (const req of filteredRequests) {
      if (req.status === "pending") pending++;
      else if (req.status === "processing") processing++;
      else if (req.status === "complete") complete++;

      const site = sitesMap.get(req.site_id);
      const siteTz = site?.timezone ?? "UTC";
      if (isRequestOverdue(req, siteTz)) {
        overdue++;
      }
    }

    return {
      total: filteredRequests.length,
      pending,
      processing,
      complete,
      overdue,
    };
  }, [filteredRequests, sitesMap]);

  // Apply sorting
  const sortedRequests = useMemo(() => {
    return sortRequests(filteredRequests, filters.sortField, filters.sortDirection);
  }, [filteredRequests, filters.sortField, filters.sortDirection]);

  // Filter change handlers
  const handleFilterChange = (updated: Partial<BoardFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters(getDefaultFilters());
  };

  const handleSortChange = (field: SortField) => {
    setFilters((prev) => {
      if (prev.sortField === field) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
        };
      }
      return {
        ...prev,
        sortField: field,
        sortDirection: "desc", // Default to descending when switching sort field
      };
    });
  };

  const handleSelectRequest = (req: HelpdeskRequest) => {
    setSelectedRequestId(req.id);
    setSelectedRequest(req);
  };

  const handleCloseModal = () => {
    setSelectedRequestId(null);
    setSelectedRequest(null);
  };

  if (!configured()) {
    return (
      <main className="container config-error-container">
        <div className="card config-card" role="alert">
          <h2>Configuration Required</h2>
          <p>
            Please set <code>HELPDESK_URL</code> and <code>HELPDESK_TOKEN</code> in your{" "}
            <code>.env</code> file, then restart the application.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-container">
      <Header
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        onRefresh={() => loadRequests(true)}
        error={error}
      />

      <main className="main-content" id="main-content">
        {/* Error Alert Banner */}
        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <div className="alert-message">
              <strong>Unable to load all data:</strong> {error}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => loadRequests(false)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter & Sort Controls */}
        <FilterBar
          filters={filters}
          sites={sites}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          counts={counts}
        />

        {/* Board Table */}
        <RequestsTable
          requests={sortedRequests}
          sitesMap={sitesMap}
          staffMap={staffMap}
          sortField={filters.sortField}
          sortDirection={filters.sortDirection}
          onSortChange={handleSortChange}
          onSelectRequest={handleSelectRequest}
          selectedRequestId={selectedRequestId}
          loading={loading}
        />
      </main>

      {/* Level 2: Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          site={sitesMap.get(selectedRequest.site_id)}
          staffMap={staffMap}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
