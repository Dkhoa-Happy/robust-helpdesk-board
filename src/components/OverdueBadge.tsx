import React from "react";

export const OverdueBadge: React.FC = () => {
  return (
    <span
      className="overdue-badge"
      title="Overdue: due date has passed in the site's local time"
      aria-label="Overdue"
    >
      <span className="overdue-icon" aria-hidden="true">⚠️</span> Overdue
    </span>
  );
};
