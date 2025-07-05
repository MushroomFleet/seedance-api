'use client';

import React, { useState } from 'react';
import { VideoGenerationForm } from '@/components/VideoGenerationForm';
import { GalleryModal } from '@/components/GalleryModal';
import { FALVideoGenerator } from '@/lib/fal-client';
import { VideoGenerationRequest } from '@/types/video';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generator = new FALVideoGenerator();

  const handleGenerate = async (request: VideoGenerationRequest) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    try {
      console.log('Starting video generation...');

      // Generate video
      const result = await generator.generateVideo(request, {
        onProgress: (progressValue) => {
          setProgress(progressValue);
        }
      });

      console.log('Video generated successfully:', result.metadata.title);
      setProgress(100);

      // Save video to local storage
      const saveResponse = await fetch('/api/videos/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: result.video.url,
          metadata: result.metadata
        })
      });

      if (saveResponse.ok) {
        setSuccess('Video generated and saved successfully!');
        console.log('Video saved to local storage');
      } else {
        const saveError = await saveResponse.json();
        throw new Error(`Failed to save video: ${saveError.error}`);
      }
    } catch (error: any) {
      console.error('Generation failed:', error);
      setError(error.message || 'Failed to generate video');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setProgress(0);
        setSuccess(null);
        setError(null);
      }, 5000);
    }
  };

  const handleRefresh = () => {
    // Trigger any refresh logic if needed
    console.log('Gallery refreshed');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Seedance Video Generator
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Generate high-quality videos from text using ByteDance's Seedance AI
          </p>
          
          {/* Quick Stats */}
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>$0.18 per 5s video</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 002 2z" />
              </svg>
              <span>720p HD Quality</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Fast Generation</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>View Gallery</span>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Video Generation Form */}
        <VideoGenerationForm
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          progress={progress}
        />

        {/* Info Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">How it works</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
                  <span>Describe the video you want to generate</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
                  <span>Adjust settings like resolution, duration, and motion</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
                  <span>Click Generate and wait for your video to be created</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">4</span>
                  <span>View, download, or manage your videos in the gallery</span>
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tips for better results</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Be specific and descriptive in your prompts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Use the prompt optimizer for enhanced results</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Adjust motion intensity based on your content</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Videos are automatically saved to ./output/ folder</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onRefresh={handleRefresh}
      />
    </main>
  );
}
