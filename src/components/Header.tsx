import React, { useEffect, useState } from "react";
import { Building2, Check, RefreshCw, Share2 } from "lucide-react";

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
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Update relative time every second
  useEffect(() => {
    if (!lastUpdated) return;

    const updateRelative = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setSecondsAgo(Math.max(0, diff));
    };

    updateRelative();
    const timer = setInterval(updateRelative, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

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
    : null;

  const timeDisplay = isRefreshing
    ? "Refreshing live data…"
    : lastUpdated
    ? `Updated ${secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`} (${formattedTime})`
    : "Never updated";

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-title-row">
          <div className="logo-badge" aria-hidden="true">
            <Building2 size={24} className="logo-icon" />
          </div>
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
          <span className="live-text">{timeDisplay}</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh requests now"
        >
          <RefreshCw
            size={14}
            className={`refresh-icon ${isRefreshing ? "spinning" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </button>

        <button
          type="button"
          className={`btn ${copied ? "btn-success" : "btn-secondary"} btn-sm`}
          onClick={handleCopyLink}
          aria-label="Copy shareable link with current filters, range, and sort"
        >
          {copied ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Share2 size={14} aria-hidden="true" />
          )}
          {copied ? "Link Copied!" : "Share Link"}
        </button>
      </div>
    </header>
  );
};
