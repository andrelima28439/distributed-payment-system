'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label?: string;
  pulse?: boolean;
}

const variantMap: Record<string, string> = {
  approved: 'badge-success',
  active: 'badge-success',
  matched: 'badge-success',
  completed: 'badge-success',
  success: 'badge-success',
  won: 'badge-success',
  resolved: 'badge-success',
  pending: 'badge-warning',
  investigating: 'badge-warning',
  retrying: 'badge-warning',
  under_review: 'badge-warning',
  generating: 'badge-warning',
  declined: 'badge-danger',
  failed: 'badge-danger',
  chargeback: 'badge-danger',
  errored: 'badge-danger',
  lost: 'badge-danger',
  accepted: 'badge-danger',
  mismatched: 'badge-danger',
  refunded: 'badge-info',
  open: 'badge-info',
  disputed: 'badge-info',
  received: 'badge-info',
};

function getVariant(status: string): string {
  return variantMap[status.toLowerCase()] || 'badge-neutral';
}

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status, variant, label, pulse }: StatusBadgeProps) {
  const variantClass = variant ? `badge-${variant}` : getVariant(status);

  return (
    <span className={`${variantClass} inline-flex items-center gap-1.5`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variant === 'success' || status === 'approved' || status === 'completed' ? 'bg-success-400' : variant === 'danger' || status === 'declined' || status === 'failed' ? 'bg-danger-400' : 'bg-warning-400'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${variant === 'success' || status === 'approved' || status === 'completed' ? 'bg-success-400' : variant === 'danger' || status === 'declined' || status === 'failed' ? 'bg-danger-400' : 'bg-warning-400'}`} />
        </span>
      )}
      {label || formatLabel(status)}
    </span>
  );
}
