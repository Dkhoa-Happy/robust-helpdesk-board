import React, { useState } from "react";

interface HeaderProps {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  error: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  isRefreshing,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is not available
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedTime = lastUpdated
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(lastUpdated)
    : "Never";

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-title-row">
          <span className="logo-icon" aria-hidden="true">🏢</span>
          <div>
            <h1 className="header-title">Helpdesk Board</h1>
            <p className="header-subtitle">
              Robusttechhouse Properties &bull; Singapore, Sydney &amp; Jakarta
            </p>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <div className="live-status-container" role="status" aria-live="polite">
          <span
            className={`live-dot ${isRefreshing ? "pulsing" : ""}`}
            aria-hidden="true"
          />
          <span className="live-text">
            {isRefreshing ? "Refreshing…" : `Last updated at ${formattedTime}`}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh requests now"
        >
          <span className={`refresh-icon ${isRefreshing ? "spinning" : ""}`} aria-hidden="true">
            🔄
          </span>
          Refresh
        </button>

        <button
          type="button"
          className={`btn ${copied ? "btn-success" : "btn-secondary"} btn-sm`}
          onClick={handleCopyLink}
          aria-label="Copy link to current board view"
        >
          <span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
          {copied ? "Link Copied!" : "Share Link"}
        </button>
      </div>
    </header>
  );
};
