'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from 'lucide-react';

interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const typeConfig = {
  info: {
    icon: Info,
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/20',
    text: 'text-primary-400',
    iconBg: 'bg-primary-500/20',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/20',
    text: 'text-warning-400',
    iconBg: 'bg-warning-500/20',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-danger-500/10',
    border: 'border-danger-500/20',
    text: 'text-danger-400',
    iconBg: 'bg-danger-500/20',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-success-500/10',
    border: 'border-success-500/20',
    text: 'text-success-400',
    iconBg: 'bg-success-500/20',
  },
};

export default function AlertBanner({ type = 'info', title, message, dismissible, onDismiss }: AlertBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${config.iconBg} p-1.5 rounded-lg shrink-0`}>
          <Icon className={`h-4 w-4 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.text}`}>{title}</p>
          {message && (
            <p className="text-sm text-gray-400 mt-0.5">{message}</p>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
