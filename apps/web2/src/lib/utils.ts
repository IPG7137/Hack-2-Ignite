import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return isoString;
  }
}

export function calculateSLARemaining(deadlineIso: string): {
  hoursRemaining: number;
  label: string;
  isOverdue: boolean;
  status: 'on_track' | 'warning' | 'breached';
} {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

  if (hoursRemaining < 0) {
    return {
      hoursRemaining,
      label: `${Math.abs(hoursRemaining)}h overdue`,
      isOverdue: true,
      status: 'breached',
    };
  }

  if (hoursRemaining <= 6) {
    return {
      hoursRemaining,
      label: `${hoursRemaining}h left`,
      isOverdue: false,
      status: 'warning',
    };
  }

  return {
    hoursRemaining,
    label: `${hoursRemaining}h remaining`,
    isOverdue: false,
    status: 'on_track',
  };
}
