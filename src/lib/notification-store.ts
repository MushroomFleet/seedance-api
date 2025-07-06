import { create } from 'zustand';
import { ToastData } from '@/components/ToastNotification';

interface NotificationStore {
  // State
  toasts: ToastData[];
  
  // Actions
  addNotification: (notification: Omit<ToastData, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Convenience methods
  showSuccess: (title: string, message?: string, actions?: ToastData['actions']) => string;
  showError: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  toasts: [],

  // Add notification
  addNotification: (notification) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newToast: ToastData = {
      id,
      duration: 8000, // Default 8 seconds
      ...notification,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));

    return id;
  },

  // Remove notification
  removeNotification: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  // Clear all notifications
  clearAllNotifications: () => {
    set({ toasts: [] });
  },

  // Convenience methods
  showSuccess: (title, message, actions) => {
    return get().addNotification({
      type: 'success',
      title,
      message,
      actions,
      duration: 10000, // Success messages stay longer
    });
  },

  showError: (title, message) => {
    return get().addNotification({
      type: 'error',
      title,
      message,
      duration: 12000, // Errors stay longer
    });
  },

  showInfo: (title, message) => {
    return get().addNotification({
      type: 'info',
      title,
      message,
    });
  },

  showWarning: (title, message) => {
    return get().addNotification({
      type: 'warning',
      title,
      message,
      duration: 10000,
    });
  },
}));

// Helper functions for common notification patterns
export const notificationHelpers = {
  // Video generation success
  videoGenerationSuccess: (prompt: string, onViewGallery: () => void) => {
    const { showSuccess } = useNotificationStore.getState();
    const truncatedPrompt = prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt;
    
    return showSuccess(
      'Video Generated Successfully!',
      `"${truncatedPrompt}"`,
      [
        {
          label: 'View in Gallery',
          onClick: onViewGallery,
          variant: 'primary'
        },
        {
          label: 'Dismiss',
          onClick: () => {},
          variant: 'secondary'
        }
      ]
    );
  },

  // Video generation error
  videoGenerationError: (prompt: string, error?: string) => {
    const { showError } = useNotificationStore.getState();
    const truncatedPrompt = prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt;
    
    return showError(
      'Video Generation Failed',
      error || `Failed to generate video for "${truncatedPrompt}"`
    );
  },

  // Queue added success
  queueAddedSuccess: (prompt: string, position: number) => {
    const { showInfo } = useNotificationStore.getState();
    const truncatedPrompt = prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt;
    
    return showInfo(
      'Added to Queue',
      `"${truncatedPrompt}" - Position ${position}`
    );
  },

  // Multiple completions
  multipleCompletionsSuccess: (count: number, onViewGallery: () => void) => {
    const { showSuccess } = useNotificationStore.getState();
    
    return showSuccess(
      `${count} Videos Generated!`,
      `${count} video generation tasks completed successfully.`,
      [
        {
          label: 'View Gallery',
          onClick: onViewGallery,
          variant: 'primary'
        }
      ]
    );
  }
};
