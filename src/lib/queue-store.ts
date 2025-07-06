import { create } from 'zustand';
import { QueuedRequest, QueueStats } from '@/types/queue';
import { VideoGenerationRequest } from '@/types/video';

interface QueueStore {
  // State
  requests: QueuedRequest[];
  stats: QueueStats;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addToQueue: (request: VideoGenerationRequest) => Promise<string>;
  removeFromQueue: (id: string) => Promise<boolean>;
  refreshQueue: () => Promise<void>;
  clearError: () => void;
  
  // Auto-refresh
  isAutoRefreshEnabled: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

const initialStats: QueueStats = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  // Initial state
  requests: [],
  stats: initialStats,
  isLoading: false,
  error: null,
  isAutoRefreshEnabled: false,

  // Add request to queue
  addToQueue: async (request: VideoGenerationRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to queue');
      }

      const result = await response.json();
      
      // Refresh queue to get updated state
      await get().refreshQueue();
      
      return result.id;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Remove request from queue
  removeFromQueue: async (id: string) => {
    try {
      const response = await fetch(`/api/queue/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove from queue');
      }

      // Refresh queue to get updated state
      await get().refreshQueue();
      
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  // Refresh queue status
  refreshQueue: async () => {
    try {
      const response = await fetch('/api/queue');
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue status');
      }

      const data = await response.json();
      
      set({
        requests: data.queue || [],
        stats: data.stats || initialStats,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Auto-refresh controls
  setAutoRefresh: (enabled: boolean) => set({ isAutoRefreshEnabled: enabled }),
}));

// Auto-refresh functionality
let refreshInterval: NodeJS.Timeout | null = null;

// Setup auto-refresh when store is used
export const setupAutoRefresh = () => {
  const store = useQueueStore.getState();
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(() => {
    const currentState = useQueueStore.getState();
    if (currentState.isAutoRefreshEnabled) {
      currentState.refreshQueue();
    }
  }, 2000); // Refresh every 2 seconds

  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };
};

// Helper functions
export const formatEstimatedTime = (milliseconds: number): string => {
  const seconds = Math.ceil(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const getQueuePosition = (requests: QueuedRequest[], requestId: string): number => {
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const index = pendingRequests.findIndex(r => r.id === requestId);
  return index === -1 ? -1 : index + 1;
};
