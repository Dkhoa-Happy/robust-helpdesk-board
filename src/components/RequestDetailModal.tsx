import React, { useEffect, useRef, useState } from "react";
import { Calendar, Timer, X } from "lucide-react";
import type { HelpdeskRequest, RequestEvent, Site } from "../types";
import { listAllEvents } from "../api";
import {
  filterEvents,
  findFirstResponse,
  formatSiteDateTime,
  formatSiteDueDate,
  isRequestOverdue,
} from "../lib/dates";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { OverdueBadge } from "./OverdueBadge";

interface RequestDetailModalProps {
  request: HelpdeskRequest;
  site: Site | undefined;
  staffMap: Map<number, string>;
  onClose: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  site,
  staffMap,
  onClose,
}) => {
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [showUndone, setShowUndone] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const siteTimezone = site?.timezone ?? "UTC";
  const overdue = isRequestOverdue(request, siteTimezone);

  // Rule 3: Look people up by id in /v1/staff
  const currentAssigneeName = request.assignee?.id
    ? (staffMap.get(request.assignee.id) ?? `Staff #${request.assignee.id}`)
    : "Unassigned";

  // Fetch full event history on mount
  useEffect(() => {
    let active = true;
    setLoadingEvents(true);
    setEventsError(null);

    listAllEvents(request.id)
      .then((data) => {
        if (active) {
          // Sort events newest first or chronological?
          // Events endpoint returns newest first. Let's keep newest first or chronological
          // Sorted newest first with clear ordering.
          setEvents(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setEventsError(
            err instanceof Error ? err.message : "Failed to load events",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });

    return () => {
      active = false;
    };
  }, [request.id]);

  // Focus trap & Escape key
  useEffect(() => {
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Rule 6: First response
  const firstResponse = findFirstResponse(events);
  const firstResponseStaffName = firstResponse?.actor_id
    ? (staffMap.get(firstResponse.actor_id) ??
      `Staff #${firstResponse.actor_id}`)
    : null;

  // Rule 5: Undone events filtering
  const { visibleEvents, revertedIds, revertingIds } = filterEvents(
    events,
    showUndone,
  );
  const undoneCount = revertedIds.size;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-request-title"
        ref={modalRef}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-area">
            <div className="modal-ref-row">
              <span className="ref-badge large">{request.ref}</span>
              <span className="site-tz-tag">{siteTimezone}</span>
              {overdue && <OverdueBadge />}
            </div>
            <h2 id="modal-request-title" className="modal-title">
              {request.title}
            </h2>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close request details modal"
            ref={closeBtnRef}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {/* Rule 6: First Response Banner */}
          <div
            className="first-response-card"
            role="region"
            aria-label="First response summary"
          >
            <div className="first-response-header">
              <Timer size={18} className="first-response-icon" aria-hidden="true" />
              <h3 className="first-response-title">First Response</h3>
            </div>
            {loadingEvents ? (
              <p className="muted">Checking response history…</p>
            ) : firstResponse && firstResponseStaffName ? (
              <div className="first-response-details">
                <p>
                  First responded by <strong>{firstResponseStaffName}</strong>{" "}
                  on{" "}
                  <strong>
                    {formatSiteDateTime(firstResponse.at, siteTimezone)}
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <p className="text-secondary">
                No staff response recorded yet (request has not entered
                processing with an assigned actor).
              </p>
            )}
          </div>

          {/* Request Overview Grid */}
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Site</span>
              <span className="detail-value">
                {site?.name ?? `Site ${request.site_id}`}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{request.location || "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <StatusBadge status={request.status} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Priority</span>
              <span className="detail-value">
                <PriorityBadge priority={request.priority} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Current Assignee</span>
              <span className="detail-value staff-name">
                {currentAssigneeName}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Due Date</span>
              <span className="detail-value">
                {formatSiteDueDate(request.due_on, siteTimezone)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created At</span>
              <span className="detail-value">
                {formatSiteDateTime(request.created_at, siteTimezone)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Updated At</span>
              <span className="detail-value">
                {formatSiteDateTime(request.updated_at, siteTimezone)}
              </span>
            </div>
          </div>

          {/* Event History / Timeline */}
          <div
            className="timeline-section"
            role="region"
            aria-label="Event history timeline"
          >
            <div className="timeline-header">
              <div className="timeline-title-row">
                <h3 className="timeline-title">
                  History of Events ({events.length})
                </h3>
                <span className="site-tz-note">
                  All event times displayed in site local time ({siteTimezone})
                </span>
              </div>

              {/* Rule 5: Undone events toggle */}
              {undoneCount > 0 && (
                <div className="undone-toggle-wrapper">
                  <label className="checkbox-label" htmlFor="toggle-undone">
                    <input
                      id="toggle-undone"
                      type="checkbox"
                      checked={showUndone}
                      onChange={(e) => setShowUndone(e.target.checked)}
                    />
                    <span>
                      Show undone events ({undoneCount} hidden by default)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {loadingEvents && (
              <div className="timeline-loading">
                <div className="spinner-small" aria-hidden="true" />
                <span>Loading full history of events…</span>
              </div>
            )}

            {eventsError && (
              <div className="alert alert-error" role="alert">
                <p>Could not load event history: {eventsError}</p>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    setLoadingEvents(true);
                    listAllEvents(request.id)
                      .then(setEvents)
                      .catch((e) => setEventsError(String(e)))
                      .finally(() => setLoadingEvents(false));
                  }}
                >
                  Retry Loading Events
                </button>
              </div>
            )}

            {!loadingEvents && visibleEvents.length === 0 && (
              <p className="timeline-empty">
                No events found for this request.
              </p>
            )}

            {!loadingEvents && visibleEvents.length > 0 && (
              <ol className="timeline-list">
                {visibleEvents.map((ev) => {
                  const isReverted = revertedIds.has(ev.id);
                  const isReverting = revertingIds.has(ev.id);
                  const isUndone = isReverted || isReverting;

                  // Rule 3: Look people up by id in /v1/staff (actor_id).
                  // Automatic events have actor_id: null and actor_name: "System".
                  const actorDisplay =
                    ev.actor_id !== null
                      ? (staffMap.get(ev.actor_id) ?? `Staff #${ev.actor_id}`)
                      : "System";

                  return (
                    <li
                      key={ev.id}
                      className={`timeline-item ${isUndone ? "timeline-item-undone" : ""}`}
                    >
                      <div className="timeline-marker" aria-hidden="true" />
                      <div className="timeline-content">
                        <div className="timeline-item-header">
                          <div className="timeline-actor-row">
                            <span className="timeline-actor">
                              {actorDisplay}
                            </span>
                            <StatusBadge status={ev.status} />
                            {isReverted && (
                              <span className="badge-undone">Undone</span>
                            )}
                            {isReverting && (
                              <span className="badge-revert">
                                Reverts #{ev.reverts_id}
                              </span>
                            )}
                          </div>
                          {/* Rule 4: Unix seconds formatted in site's timezone */}
                          <time className="timeline-time">
                            {formatSiteDateTime(ev.at, siteTimezone)}
                          </time>
                        </div>

                        {ev.note && (
                          <div className="timeline-note">
                            <p>{ev.note}</p>
                          </div>
                        )}

                        {/* Rule 4: due_at on an event is site-local wall-clock time */}
                        {ev.due_at && (
                          <div className="timeline-due">
                            <Calendar size={14} className="due-icon" aria-hidden="true" />
                            <span>
                              Deadline set to:{" "}
                              <strong>
                                {formatSiteDateTime(ev.due_at, siteTimezone)}
                              </strong>
                            </span>
                          </div>
                        )}

                        <div className="timeline-footer">
                          <span className="timeline-event-id">
                            Event #{ev.id}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
