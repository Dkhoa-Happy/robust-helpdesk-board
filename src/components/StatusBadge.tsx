import React from "react";
import type { Status } from "../types";

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getLabelAndClass = () => {
    switch (status) {
      case "pending":
        return { label: "Pending", className: "badge-status-pending" };
      case "processing":
        return { label: "Processing", className: "badge-status-processing" };
      case "complete":
        return { label: "Complete", className: "badge-status-complete" };
      case "canceled":
        return { label: "Cancelled", className: "badge-status-canceled" };
      default:
        return { label: status, className: "badge-status-default" };
    }
  };

  const { label, className } = getLabelAndClass();

  return <span className={`status-badge ${className}`}>{label}</span>;
};
