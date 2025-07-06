'use client';

import React, { useEffect } from 'react';
import { useQueueStore, setupAutoRefresh, formatEstimatedTime, getQueuePosition } from '@/lib/queue-store';
import { QueuedRequest } from '@/types/queue';

interface QueueDisplayProps {
  className?: string;
}

export const QueueDisplay: React.FC<QueueDisplayProps> = ({ className = '' }) => {
  const {
    requests,
    stats,
    isLoading,
    error,
    isAutoRefreshEnabled,
    refreshQueue,
    removeFromQueue,
    setAutoRefresh,
    clearError,
  } = useQueueStore();

  // Setup auto-refresh on mount
  useEffect(() => {
    const cleanup = setupAutoRefresh();
    setAutoRefresh(true);
    refreshQueue(); // Initial load

    return cleanup;
  }, [setAutoRefresh, refreshQueue]);

  const handleRemoveRequest = async (id: string) => {
    if (confirm('Are you sure you want to remove this request from the queue?')) {
      await removeFromQueue(id);
    }
  };

  const getStatusIcon = (status: QueuedRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <div className="w-5 h-5 relative">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusText = (status: QueuedRequest['status']) => {
    switch (status) {
      case 'pending': return 'Waiting';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
    }
  };

  const formatDuration = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Generation Queue</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshQueue}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={isAutoRefreshEnabled}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Queue Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.processing}</div>
          <div className="text-sm text-blue-600">Processing</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
          <div className="text-sm text-red-600">Failed</div>
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No requests in queue</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className={`border rounded-lg p-4 transition-colors ${
                request.status === 'processing'
                  ? 'border-blue-200 bg-blue-50'
                  : request.status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : request.status === 'failed'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(request.status)}
                    <span className="font-medium text-gray-900">
                      {getStatusText(request.status)}
                    </span>
                    {request.status === 'pending' && (
                      <span className="text-sm text-gray-500">
                        (Position: {getQueuePosition(requests, request.id)})
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {request.request.prompt}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{request.request.duration}s</span>
                    <span>{request.request.resolution}</span>
                    <span>{formatDuration(request.timestamp)}</span>
                    {request.estimatedTime && request.status === 'pending' && (
                      <span>Est: {formatEstimatedTime(request.estimatedTime)}</span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {request.status === 'processing' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{request.progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${request.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {request.status === 'failed' && request.error && (
                    <p className="mt-2 text-sm text-red-600">{request.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleRemoveRequest(request.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove from queue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {request.status === 'completed' && request.result && (
                    <a
                      href={request.result.video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-green-500 hover:text-green-700 transition-colors"
                      title="View video"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
