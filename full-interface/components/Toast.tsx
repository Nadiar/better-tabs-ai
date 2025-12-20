import React from 'react';
import { Toast, ToastType } from '@shared';

interface ToastWithId extends Toast {
  id: string | number;
}

interface ToastContainerProps {
  toasts: ToastWithId[];
}

// Toast Container - Displays multiple toast notifications
function ToastContainer({ toasts }: ToastContainerProps): JSX.Element | null {
  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type: ToastType): string => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{getIcon(toast.type)}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;