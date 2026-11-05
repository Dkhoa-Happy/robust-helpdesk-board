import React from "react";
import { AlertTriangle } from "lucide-react";

export const OverdueBadge: React.FC = () => {
  return (
    <span
      className="overdue-badge"
      title="Overdue: due date has passed in the site's local time"
      aria-label="Overdue"
    >
      <AlertTriangle size={12} className="overdue-icon" aria-hidden="true" />
      Overdue
    </span>
  );
};
