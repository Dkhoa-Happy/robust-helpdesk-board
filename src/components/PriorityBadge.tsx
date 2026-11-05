import React from "react";
import type { Priority } from "../types";

interface PriorityBadgeProps {
  priority: Priority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  if (!priority) {
    return <span className="priority-badge priority-none">—</span>;
  }

  const className = `priority-badge priority-${priority.toLowerCase()}`;

  return <span className={className}>{priority}</span>;
};
