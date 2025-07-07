'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VideoMetadata, UpscaleParams } from '@/types/video';
import { UpscaleConfigModal } from './UpscaleConfigModal';

interface UpscaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideo: VideoMetadata | null;
  onVideoProcessed: () => void;
}

export const UpscaleModal: React.FC<UpscaleModalProps> = ({
  isOpen,
  onClose,
  selectedVideo,
  onVideoProcessed
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedScaleFactor, setSelectedScaleFactor] = useState<1.5 | 2.0>(1.5);
  const [jobQueued, setJobQueued] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [upscaleParameters, setUpscaleParameters] = useState<UpscaleParams | null>(null);
  
  // Use refs to store interval and timeout IDs for proper cleanup
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function for intervals and timeouts
  const cleanup = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Effect for cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setProgress(0);
      setError(null);
      setSuccess(false);
      setJobQueued(false);
      cleanup();
    }
    
    return cleanup; // Cleanup on unmount
  }, [isOpen]);

  const startProcessing = async () => {
    if (!selectedVideo) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(false);
    setJobQueued(false);

    try {
      // Start processing
      const response = await fetch('/api/postfx/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceVideoId: selectedVideo.id,
          effect: 'upscale',
          parameters: upscaleParameters || {
            scale_factor: selectedScaleFactor
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start processing');
      }

      // Job has been queued successfully
      setJobQueued(true);
      const jobId = result.jobId;

      // Poll for progress updates
      progressIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/postfx/status/${jobId}`);
          const statusResult = await statusResponse.json();
          
          if (statusResponse.ok && statusResult.job) {
            setProgress(statusResult.job.progress || 0);
            
            if (statusResult.job.status === 'completed') {
              cleanup();
              setProgress(100);
              setSuccess(true);
              setIsProcessing(false);
              onVideoProcessed();
            } else if (statusResult.job.status === 'failed') {
              cleanup();
              setError(statusResult.job.error || 'Processing failed');
              setIsProcessing(false);
            }
          }
        } catch (pollError) {
          console.error('Error polling job status:', pollError);
          // Don't stop polling on network errors, just log them
        }
      }, 1000);

      // Set a timeout to stop polling after a reasonable time
      timeoutRef.current = setTimeout(() => {
        cleanup();
        if (!success && !error) {
          setIsProcessing(false);
          setJobQueued(true); // Keep job queued status
          // Don't set error since job might still be processing in background
        }
      }, 300000); // 5 minutes timeout

    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
      setJobQueued(false);
    }
  };

  const handleClose = () => {
    // Allow closing even during processing (background processing)
    cleanup();
    onClose();
  };

  const getEstimatedResolution = () => {
    if (!selectedVideo) return '';
    
    const currentRes = selectedVideo.generation_params.resolution;
    if (currentRes === '720p') {
      return selectedScaleFactor === 1.5 ? '1080p' : '1440p';
    } else if (currentRes === '480p') {
      return selectedScaleFactor === 1.5 ? '720p' : '960p';
    }
    return `${selectedScaleFactor}x current resolution`;
  };

  if (!isOpen || !selectedVideo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Upscale Queue</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Source Video Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Source Video</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="w-32 aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{selectedVideo.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedVideo.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>{selectedVideo.generation_params.resolution}</span>
                    <span>{selectedVideo.generation_params.duration}s</span>
                    {selectedVideo.effects_applied && selectedVideo.effects_applied.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Effects: {selectedVideo.effects_applied.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scale Factor Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Choose Scale Factor</h3>
              {!isProcessing && (
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-3 py-1 text-sm rounded-lg transition-colors flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Advanced Configure</span>
                </button>
              )}
            </div>
            
            {/* Configuration Status */}
            {upscaleParameters && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">Custom Configuration Applied</span>
                </div>
                <div className="mt-2 text-xs text-blue-600 space-y-1">
                  <div>Scale: {upscaleParameters.scale_factor}x • Motion: {upscaleParameters.motion_compensation}</div>
                  <div>Interpolation: {upscaleParameters.interpolation_mode} • Method: {upscaleParameters.deinterlace_method}</div>
                  {upscaleParameters.edge_enhancement > 0 && (
                    <div>Edge Enhancement: {(upscaleParameters.edge_enhancement * 100).toFixed(0)}%</div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* 1.5x Scale */}
              <div 
                onClick={() => !isProcessing && setSelectedScaleFactor(1.5)}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedScaleFactor === 1.5
                    ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300 ring-2 ring-blue-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedScaleFactor === 1.5 ? 'bg-blue-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">1.5x Upscale (Recommended)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Balanced quality and performance. Output: ~{getEstimatedResolution()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Best for most videos with good quality improvement
                    </p>
                  </div>
                  {selectedScaleFactor === 1.5 && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* 2.0x Scale */}
              <div 
                onClick={() => !isProcessing && setSelectedScaleFactor(2.0)}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedScaleFactor === 2.0
                    ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300 ring-2 ring-purple-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedScaleFactor === 2.0 ? 'bg-purple-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">2.0x Upscale (Maximum)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Maximum quality enhancement. Output: ~{getEstimatedResolution()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Higher processing time, best for detailed content
                    </p>
                  </div>
                  {selectedScaleFactor === 2.0 && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Processing Info */}
          {!isProcessing && !success && !jobQueued && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">Interlaced Upscaling</h4>
                  <p className="text-sm text-blue-600 mt-1">
                    Uses advanced interlacing techniques for smooth upscaling with motion compensation and edge enhancement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Job Queued Message */}
          {jobQueued && !isProcessing && !success && !error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-yellow-800">Job Queued</h4>
                  <p className="text-sm text-yellow-600 mt-1">
                    Your upscaling job is running in the background. You can close this modal and check back later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Processing</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Applying {selectedScaleFactor}x interlaced upscaling...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {progress >= 85 && progress < 100 && (
                  <p className="text-sm text-gray-600">Optimizing for web playback...</p>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-green-800">Upscaling Complete!</h4>
                  <p className="text-sm text-green-600 mt-1">
                    Your video has been upscaled to {selectedScaleFactor}x resolution and saved to the gallery.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-red-800">Upscaling Failed</h4>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {isProcessing ? 'Continue in Background' : 'Close'}
            </button>
            {!isProcessing && !success && !jobQueued && (
              <button
                onClick={startProcessing}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
              >
                Apply Upscaling
              </button>
            )}
            {success && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upscale Configuration Modal */}
      <UpscaleConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaveConfig={(config) => {
          setUpscaleParameters(config);
          setSelectedScaleFactor(config.scale_factor as 1.5 | 2.0);
          setShowConfigModal(false);
        }}
        initialConfig={upscaleParameters || undefined}
      />
    </div>
  );
};
