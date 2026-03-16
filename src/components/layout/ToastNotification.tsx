import React from 'react';
import { ToastMessage } from '../types';

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 ${
        toast.type === 'success' ? 'border-l-4 border-green-400' :
        toast.type === 'error' ? 'border-l-4 border-red-400' :
        'border-l-4 border-blue-400'
      }`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-5 h-5 text-green-400">✓</div>
              ) : toast.type === 'error' ? (
                <div className="w-5 h-5 text-red-400">✕</div>
              ) : (
                <div className="w-5 h-5 text-blue-400">ℹ</div>
              )}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {toast.message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={onClose}
              >
                <span className="text-sm">✕</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}