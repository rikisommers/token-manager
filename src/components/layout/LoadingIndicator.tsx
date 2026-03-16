import React from 'react';
import { LoadingState } from '../types';

interface LoadingIndicatorProps {
  loadingState: LoadingState;
}

export function LoadingIndicator({ loadingState }: LoadingIndicatorProps) {
  if (!loadingState.isLoading) {
    return null;
  }

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 mx-4 min-w-[300px]">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Loading...</h3>
            {loadingState.message && (
              <p className="text-sm text-gray-600">{loadingState.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}