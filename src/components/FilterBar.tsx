import React from "react";
import type { BoardFilters, Site, SortField, Status } from "../types";
import { daysAgo } from "../lib/dates";

interface FilterBarProps {
  filters: BoardFilters;
  sites: Site[];
  onChange: (updated: Partial<BoardFilters>) => void;
  onReset: () => void;
  counts: {
    total: number;
    pending: number;
    processing: number;
    complete: number;
    overdue: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  sites,
  onChange,
  onReset,
  counts,
}) => {
  const applyPreset = (days: number) => {
    onChange({
      from: daysAgo(days),
      to: daysAgo(0),
    });
  };

  const isDefaultRange =
    filters.from === daysAgo(30) && filters.to === daysAgo(0);

  return (
    <section className="filter-bar" aria-label="Request filters and sorting">
      {/* Date Range Group */}
      <div className="filter-group date-range-group">
        <div className="filter-group-header">
          <label className="filter-label" htmlFor="filter-from">
            Date Range
          </label>
          <div className="preset-buttons" role="group" aria-label="Date range presets">
            <button
              type="button"
              className={`preset-btn ${filters.from === daysAgo(7) && filters.to === daysAgo(0) ? "active" : ""}`}
              onClick={() => applyPreset(7)}
            >
              7d
            </button>
            <button
              type="button"
              className={`preset-btn ${isDefaultRange ? "active" : ""}`}
              onClick={() => applyPreset(30)}
            >
              30d
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.from === daysAgo(90) && filters.to === daysAgo(0) ? "active" : ""}`}
              onClick={() => applyPreset(90)}
            >
              90d
            </button>
          </div>
        </div>
        <div className="date-inputs">
          <div className="date-input-wrapper">
            <span className="date-sublabel">From</span>
            <input
              id="filter-from"
              type="date"
              className="input date-input"
              value={filters.from}
              onChange={(e) => onChange({ from: e.target.value })}
              aria-label="From date (YYYY-MM-DD)"
            />
          </div>
          <div className="date-input-wrapper">
            <span className="date-sublabel">To</span>
            <input
              id="filter-to"
              type="date"
              className="input date-input"
              value={filters.to}
              onChange={(e) => onChange({ to: e.target.value })}
              aria-label="To date (YYYY-MM-DD)"
            />
          </div>
        </div>
      </div>

      {/* Site Filter */}
      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-site">
          Site
        </label>
        <select
          id="filter-site"
          className="select"
          value={filters.siteId}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ siteId: val === "all" ? "all" : Number(val) });
          }}
        >
          <option value="all">All Sites (All Timezones)</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.timezone})
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="filter-group">
        <label className="filter-label" htmlFor="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          className="select"
          value={filters.status}
          onChange={(e) => {
            const val = e.target.value as Status | "all";
            onChange({ status: val });
          }}
        >
          <option value="all">All Active Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {/* Sort Options */}
      <div className="filter-group sort-group">
        <label className="filter-label" htmlFor="filter-sort">
          Sort by
        </label>
        <div className="sort-controls">
          <select
            id="filter-sort"
            className="select"
            value={filters.sortField}
            onChange={(e) => onChange({ sortField: e.target.value as SortField })}
          >
            <option value="created_at">Created Date</option>
            <option value="due_on">Due Date</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() =>
              onChange({
                sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
              })
            }
            title={
              filters.sortDirection === "asc"
                ? "Ascending (click for descending)"
                : "Descending (click for ascending)"
            }
            aria-label={`Sort direction: currently ${
              filters.sortDirection === "asc" ? "Ascending" : "Descending"
            }. Click to toggle.`}
          >
            {filters.sortDirection === "asc" ? "▲ Asc" : "▼ Desc"}
          </button>
        </div>
      </div>

      {/* Reset Button */}
      <div className="filter-group reset-group">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onReset}
          title="Reset all filters to default"
        >
          Reset Filters
        </button>
      </div>

      {/* Quick Summary Pill Badges */}
      <div className="filter-summary-row" aria-label="Requests breakdown">
        <span className="summary-pill summary-total">
          <strong>{counts.total}</strong> matching requests
        </span>
        {counts.overdue > 0 && (
          <span className="summary-pill summary-overdue" role="status">
            ⚠️ <strong>{counts.overdue}</strong> overdue
          </span>
        )}
        <span className="summary-pill summary-pending">
          Pending: <strong>{counts.pending}</strong>
        </span>
        <span className="summary-pill summary-processing">
          Processing: <strong>{counts.processing}</strong>
        </span>
        <span className="summary-pill summary-complete">
          Complete: <strong>{counts.complete}</strong>
        </span>
      </div>
    </section>
  );
};
