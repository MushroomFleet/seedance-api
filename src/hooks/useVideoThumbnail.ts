import { useState, useEffect, useCallback } from 'react';

interface ThumbnailState {
  thumbnail: string | null;
  loading: boolean;
  error: boolean;
  retryCount?: number;
  errorMessage?: string;
}

// Cache for storing generated thumbnails
const thumbnailCache = new Map<string, string>();

// Cache for storing failed URLs to prevent repeated attempts
const failedUrlsCache = new Map<string, { count: number; lastAttempt: number }>();

export const useVideoThumbnail = (videoUrl: string): ThumbnailState => {
  const [state, setState] = useState<ThumbnailState>({
    thumbnail: null,
    loading: true,
    error: false
  });

  const generateThumbnail = useCallback(async (url: string): Promise<string> => {
    // Validate URL before attempting to load
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid video URL provided');
    }

    // Check if URL looks like a valid video URL
    try {
      const urlObj = new URL(url, window.location.origin);
      if (!urlObj.pathname.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
        console.warn('URL does not appear to be a video file:', url);
      }
    } catch (e) {
      throw new Error('Malformed video URL');
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Thumbnail generation timeout'));
      }, 10000); // 10 second timeout

      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.src = '';
        try {
          video.load();
        } catch (e) {
          // Ignore cleanup errors
        }
      };

      const onLoadedMetadata = () => {
        console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
        if (video.videoWidth && video.videoHeight) {
          // Set canvas dimensions to match video aspect ratio
          const aspectRatio = video.videoWidth / video.videoHeight;
          const thumbnailWidth = 320;
          const thumbnailHeight = thumbnailWidth / aspectRatio;
          
          canvas.width = thumbnailWidth;
          canvas.height = thumbnailHeight;

          // Seek to a small time offset to avoid black frames
          video.currentTime = Math.min(0.5, video.duration * 0.1);
        }
      };

      const onLoadedData = () => {
        console.log('Video data loaded, seeking for thumbnail');
        // Additional check in case loadedmetadata didn't fire
        if (!canvas.width && video.videoWidth && video.videoHeight) {
          const aspectRatio = video.videoWidth / video.videoHeight;
          const thumbnailWidth = 320;
          const thumbnailHeight = thumbnailWidth / aspectRatio;
          
          canvas.width = thumbnailWidth;
          canvas.height = thumbnailHeight;
        }
        
        if (video.currentTime === 0) {
          video.currentTime = Math.min(0.5, video.duration * 0.1);
        }
      };

      const onSeeked = () => {
        try {
          console.log('Video seeked, generating thumbnail');
          // Draw the video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to data URL
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(dataURL);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      const onError = (event: any) => {
        // Extract meaningful error information
        const errorInfo = {
          url: url,
          errorCode: video.error?.code || 'UNKNOWN',
          errorMessage: video.error?.message || 'Unknown error',
          networkState: video.networkState,
          readyState: video.readyState,
          eventType: event.type,
          timestamp: new Date().toISOString()
        };
        
        // Log detailed error information
        console.error('Video thumbnail generation failed:', errorInfo);
        
        // Determine error type for better user feedback
        let errorMessage = 'Failed to load video';
        switch (video.error?.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video format is not supported or corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video source is not supported';
            break;
          default:
            errorMessage = video.error?.message || 'Unknown video error';
        }
        
        cleanup();
        reject(new Error(errorMessage));
      };

      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // Ensure video can play without user interaction
      
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('loadeddata', onLoadedData);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);

      console.log('Starting video load for thumbnail:', url);
      // Start loading the video
      video.src = url;
    });
  }, []);

  useEffect(() => {
    if (!videoUrl) {
      setState({ thumbnail: null, loading: false, error: false });
      return;
    }

    // Check cache first
    const cachedThumbnail = thumbnailCache.get(videoUrl);
    if (cachedThumbnail) {
      setState({ thumbnail: cachedThumbnail, loading: false, error: false });
      return;
    }

    // Check if this URL has failed recently
    const failedInfo = failedUrlsCache.get(videoUrl);
    const now = Date.now();
    const RETRY_DELAY = 30000; // 30 seconds
    const MAX_RETRIES = 3;

    if (failedInfo && failedInfo.count >= MAX_RETRIES && (now - failedInfo.lastAttempt) < RETRY_DELAY) {
      setState({ 
        thumbnail: null, 
        loading: false, 
        error: true, 
        retryCount: failedInfo.count,
        errorMessage: 'Max retries exceeded. Please try again later.'
      });
      return;
    }

    setState({ thumbnail: null, loading: true, error: false, retryCount: failedInfo?.count || 0 });

    const attemptThumbnailGeneration = async (retryCount = 0) => {
      try {
        const thumbnailData = await generateThumbnail(videoUrl);
        // Clear failed cache on success
        failedUrlsCache.delete(videoUrl);
        // Cache the generated thumbnail
        thumbnailCache.set(videoUrl, thumbnailData);
        setState({ thumbnail: thumbnailData, loading: false, error: false, retryCount: 0 });
      } catch (error) {
        console.error(`Failed to generate thumbnail (attempt ${retryCount + 1}):`, error);
        
        // Update failed URLs cache
        const currentFailedInfo = failedUrlsCache.get(videoUrl) || { count: 0, lastAttempt: 0 };
        failedUrlsCache.set(videoUrl, {
          count: currentFailedInfo.count + 1,
          lastAttempt: now
        });

        // Retry logic for transient errors
        const shouldRetry = retryCount < 2 && (
          error instanceof Error && (
            error.message.includes('Network error') ||
            error.message.includes('timeout') ||
            error.message.includes('aborted')
          )
        );

        if (shouldRetry) {
          console.log(`Retrying thumbnail generation for ${videoUrl} in 2 seconds...`);
          setTimeout(() => {
            setState(prev => ({ ...prev, retryCount: retryCount + 1 }));
            attemptThumbnailGeneration(retryCount + 1);
          }, 2000); // 2 second delay between retries
        } else {
          setState({ 
            thumbnail: null, 
            loading: false, 
            error: true, 
            retryCount: retryCount + 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    };

    attemptThumbnailGeneration();
  }, [videoUrl, generateThumbnail]);

  return state;
};
