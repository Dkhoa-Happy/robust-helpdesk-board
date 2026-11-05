import React from "react";
import type { HelpdeskRequest, Site, SortDirection, SortField } from "../types";
import {
  formatSiteDateTime,
  formatSiteDueDate,
  isRequestOverdue,
} from "../lib/dates";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { OverdueBadge } from "./OverdueBadge";

interface RequestsTableProps {
  requests: HelpdeskRequest[];
  sitesMap: Map<number, Site>;
  staffMap: Map<number, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  onSelectRequest: (request: HelpdeskRequest) => void;
  selectedRequestId: number | null;
  loading: boolean;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  sitesMap,
  staffMap,
  sortField,
  sortDirection,
  onSortChange,
  onSelectRequest,
  selectedRequestId,
  loading,
}) => {
  const getSortAria = (field: SortField) => {
    if (sortField !== field) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return " ↕";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  if (loading && requests.length === 0) {
    return (
      <div className="table-loading-container" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading requests from helpdesk…</p>
      </div>
    );
  }

  if (!loading && requests.length === 0) {
    return (
      <div className="empty-state" role="region" aria-label="No requests found">
        <div className="empty-state-icon" aria-hidden="true">
          📋
        </div>
        <h3>No requests match your criteria</h3>
        <p>
          There are no active requests in this date range matching the selected
          filters. Try widening your date range or changing your site/status
          filters.
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="requests-table" aria-label="Helpdesk Requests">
        <caption className="sr-only">
          List of tenant helpdesk requests with site, priority, status,
          assignee, and due date.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="col-ref">
              Ref
            </th>
            <th scope="col" className="col-site">
              Site
            </th>
            <th scope="col" className="col-title">
              Title
            </th>
            <th scope="col" className="col-priority">
              Priority
            </th>
            <th scope="col" className="col-status">
              Status
            </th>
            <th scope="col" className="col-assignee">
              Assignee
            </th>
            <th
              scope="col"
              className="col-due sortable-header"
              aria-sort={getSortAria("due_on")}
            >
              <button
                type="button"
                className="sort-header-btn"
                onClick={() => onSortChange("due_on")}
                aria-label={`Sort by due date, currently sorted ${getSortAria("due_on")}`}
              >
                Due Date{getSortIcon("due_on")}
              </button>
            </th>
            <th
              scope="col"
              className="col-created sortable-header"
              aria-sort={getSortAria("created_at")}
            >
              <button
                type="button"
                className="sort-header-btn"
                onClick={() => onSortChange("created_at")}
                aria-label={`Sort by created date, currently sorted ${getSortAria("created_at")}`}
              >
                Created{getSortIcon("created_at")}
              </button>
            </th>
            <th scope="col" className="col-overdue text-center">
              Alerts
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => {
            const site = sitesMap.get(req.site_id);
            const siteTimezone = site?.timezone ?? "UTC";
            const overdue = isRequestOverdue(req, siteTimezone);
            const isSelected = selectedRequestId === req.id;

            // Rule 3: Look people up by id in /v1/staff. Never display req.assignee.name directly!
            const assigneeName = req.assignee?.id
              ? (staffMap.get(req.assignee.id) ?? `Staff #${req.assignee.id}`)
              : "Unassigned";

            return (
              <tr
                key={req.id}
                className={`table-row ${isSelected ? "selected-row" : ""} ${overdue ? "row-overdue" : ""}`}
                onClick={() => onSelectRequest(req)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectRequest(req);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Request ${req.ref}: ${req.title}. Click or press Enter to view details and history.`}
              >
                <td className="col-ref">
                  <span className="ref-badge">{req.ref}</span>
                </td>
                <td className="col-site">
                  <span
                    className="site-name"
                    title={site?.name ?? `Site ${req.site_id}`}
                  >
                    {site?.name ?? `Site ${req.site_id}`}
                  </span>
                  <span className="site-tz-tag">{siteTimezone}</span>
                </td>
                <td className="col-title">
                  <span className="request-title">{req.title}</span>
                  {req.location && (
                    <span className="request-location" title={req.location}>
                      📍 {req.location}
                    </span>
                  )}
                </td>
                <td className="col-priority">
                  <PriorityBadge priority={req.priority} />
                </td>
                <td className="col-status">
                  <StatusBadge status={req.status} />
                </td>
                <td className="col-assignee">
                  <span
                    className={req.assignee?.id ? "staff-name" : "unassigned"}
                  >
                    {assigneeName}
                  </span>
                </td>
                <td className="col-due">
                  <span className="due-date-text">
                    {formatSiteDueDate(req.due_on, siteTimezone)}
                  </span>
                </td>
                <td className="col-created">
                  <span className="created-date-text">
                    {formatSiteDateTime(req.created_at, siteTimezone)}
                  </span>
                </td>
                <td className="col-overdue text-center">
                  {overdue ? (
                    <OverdueBadge />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
