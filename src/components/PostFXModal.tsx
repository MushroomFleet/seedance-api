'use client';

import React, { useState } from 'react';
import { VideoMetadata } from '@/types/video';
import { EffectsConfigModal } from './EffectsConfigModal';

interface PostFXModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideo: VideoMetadata | null;
  onVideoProcessed: () => void;
}

export const PostFXModal: React.FC<PostFXModalProps> = ({
  isOpen,
  onClose,
  selectedVideo,
  onVideoProcessed
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<'cathode-ray' | 'halation-bloom' | 'vhs-v1' | 'vhs-v2' | 'gsl-v1' | 'trails-v2'>('cathode-ray');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [effectParameters, setEffectParameters] = useState<any>(null);

  const startProcessing = async () => {
    if (!selectedVideo) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      // Start processing
      const response = await fetch('/api/postfx/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceVideoId: selectedVideo.id,
          effect: selectedEffect,
          parameters: effectParameters
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start processing');
      }

      // Simulate progress updates (in a real implementation, you'd poll the status endpoint)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            // Simulate completion
            setTimeout(() => {
              setProgress(100);
              setSuccess(true);
              setIsProcessing(false);
              onVideoProcessed();
            }, 1000);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setProgress(0);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen || !selectedVideo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">PostFX Queue</h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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

          {/* Effect Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Choose Effect</h3>
              {(selectedEffect === 'vhs-v1' || selectedEffect === 'vhs-v2' || selectedEffect === 'halation-bloom' || selectedEffect === 'cathode-ray' || selectedEffect === 'gsl-v1' || selectedEffect === 'trails-v2') && !isProcessing && (
                <button
                  onClick={() => setShowConfigModal(true)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                    selectedEffect === 'vhs-v1' 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : selectedEffect === 'vhs-v2'
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : selectedEffect === 'halation-bloom'
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : selectedEffect === 'gsl-v1'
                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                      : selectedEffect === 'trails-v2'
                      ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Configure</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              {/* Cathode Ray Effect */}
              <div 
                onClick={() => !isProcessing && setSelectedEffect('cathode-ray')}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedEffect === 'cathode-ray' 
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300 ring-2 ring-purple-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedEffect === 'cathode-ray' ? 'bg-purple-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">Cathode Ray Effect</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Adds retro CRT monitor effects including screen curvature, scanlines, glow, and color bleeding
                    </p>
                  </div>
                  {selectedEffect === 'cathode-ray' && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Halation & Bloom Effect */}
              <div 
                onClick={() => !isProcessing && setSelectedEffect('halation-bloom')}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedEffect === 'halation-bloom' 
                    ? 'bg-gradient-to-r from-orange-100 to-pink-100 border-orange-300 ring-2 ring-orange-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedEffect === 'halation-bloom' ? 'bg-orange-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">Halation & Bloom Effect</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Adds cinematic lighting effects with luminous glows, color bleeding, and chromatic aberration
                    </p>
                  </div>
                  {selectedEffect === 'halation-bloom' && (
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* VHS v1 Effect */}
              <div 
                onClick={() => !isProcessing && setSelectedEffect('vhs-v1')}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedEffect === 'vhs-v1' 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 ring-2 ring-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedEffect === 'vhs-v1' ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">VHS v1 Effect</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Authentic VHS tape effects with tracking issues, noise, wave distortions, and analog artifacts
                    </p>
                  </div>
                  {selectedEffect === 'vhs-v1' && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* VHS v2 Effect */}
              <div 
                onClick={() => !isProcessing && setSelectedEffect('vhs-v2')}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedEffect === 'vhs-v2' 
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-300 ring-2 ring-amber-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedEffect === 'vhs-v2' ? 'bg-amber-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">VHS v2 Effect</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Advanced VHS simulation with YIQ processing, signal ringing, chroma noise, and authentic tape speed effects
                    </p>
                  </div>
                  {selectedEffect === 'vhs-v2' && (
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* GSL Filter v1 Effect */}
              <div 
                onClick={() => !isProcessing && setSelectedEffect('gsl-v1')}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedEffect === 'gsl-v1' 
                    ? 'bg-gradient-to-r from-teal-100 to-cyan-100 border-teal-300 ring-2 ring-teal-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedEffect === 'gsl-v1' ? 'bg-teal-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">GSL Filter v1</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Advanced shader-based effects including edge detection, pixelation, and wave distortions
                    </p>
                  </div>
                  {selectedEffect === 'gsl-v1' && (
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Trails v2 Effect */}
              <div 
                onClick={() => !isProcessing && setSelectedEffect('trails-v2')}
                className={`rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedEffect === 'trails-v2' 
                    ? 'bg-gradient-to-r from-pink-100 to-rose-100 border-pink-300 ring-2 ring-pink-200' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedEffect === 'trails-v2' ? 'bg-pink-500' : 'bg-gray-400'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">Trails v2 Effect</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Enhanced motion trails with per-channel processing, color bleeding, and exponential decay
                    </p>
                  </div>
                  {selectedEffect === 'trails-v2' && (
                    <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Processing</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Applying {
                      selectedEffect === 'cathode-ray' ? 'cathode ray' : 
                      selectedEffect === 'halation-bloom' ? 'halation & bloom' : 
                      selectedEffect === 'vhs-v1' ? 'VHS v1' :
                      selectedEffect === 'vhs-v2' ? 'VHS v2' :
                      selectedEffect === 'gsl-v1' ? 'GSL filter v1' :
                      selectedEffect === 'trails-v2' ? 'trails v2' :
                      'unknown'
                    } effect...
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedEffect === 'cathode-ray' ? 'bg-purple-500' : 
                      selectedEffect === 'halation-bloom' ? 'bg-orange-500' : 
                      selectedEffect === 'vhs-v2' ? 'bg-amber-500' :
                      selectedEffect === 'gsl-v1' ? 'bg-teal-500' :
                      selectedEffect === 'trails-v2' ? 'bg-pink-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
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
                  <h4 className="font-medium text-green-800">Processing Complete!</h4>
                  <p className="text-sm text-green-600 mt-1">
                    Your video has been processed and saved to the gallery.
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
                  <h4 className="font-medium text-red-800">Processing Failed</h4>
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
              disabled={isProcessing}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Cancel'}
            </button>
            {!isProcessing && !success && (
              <button
                onClick={startProcessing}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Apply Effect
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

      {/* Effects Configuration Modal */}
      <EffectsConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        effect={selectedEffect}
        onSaveConfig={(config) => {
          setEffectParameters(config);
          setShowConfigModal(false);
        }}
        initialConfig={effectParameters}
      />
    </div>
  );
};
