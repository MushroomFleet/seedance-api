'use client';

import React, { useState } from 'react';
import { VideoGenerationRequest } from '@/types/video';

interface VideoGenerationFormProps {
  onGenerate: (params: VideoGenerationRequest) => void;
  isGenerating: boolean;
  progress: number;
}

export const VideoGenerationForm: React.FC<VideoGenerationFormProps> = ({
  onGenerate,
  isGenerating,
  progress
}) => {
  const [parameters, setParameters] = useState<VideoGenerationRequest>({
    prompt: '',
    duration: 5,
    resolution: '720p',
    aspect_ratio: '16:9',
    motion_intensity: 0.5,
    prompt_optimizer: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parameters.prompt.trim() && !isGenerating) {
      onGenerate(parameters);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Generate Video from Text</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your video
          </label>
          <textarea
            value={parameters.prompt}
            onChange={(e) => setParameters({...parameters, prompt: e.target.value})}
            placeholder="A serene lake surrounded by mountains at sunset..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={500}
            disabled={isGenerating}
          />
          <div className="text-sm text-gray-500 mt-1">
            {parameters.prompt.length}/500 characters
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration: {parameters.duration}s
          </label>
          <input
            type="range"
            min="5"
            max="10"
            step="5"
            value={parameters.duration}
            onChange={(e) => setParameters({...parameters, duration: Number(e.target.value) as 5 | 10})}
            className="w-full"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>5s ($0.18)</span>
            <span>10s ($0.36)</span>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
          <div className="grid grid-cols-2 gap-2">
            {(['480p', '720p'] as const).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setParameters({...parameters, resolution: res})}
                disabled={isGenerating}
                className={`p-3 rounded-lg border transition-colors ${
                  parameters.resolution === res
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400 disabled:opacity-50'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-2">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setParameters({...parameters, aspect_ratio: ratio})}
                disabled={isGenerating}
                className={`p-3 rounded-lg border transition-colors ${
                  parameters.aspect_ratio === ratio
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400 disabled:opacity-50'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Motion Intensity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motion Intensity: {parameters.motion_intensity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={parameters.motion_intensity}
            onChange={(e) => setParameters({...parameters, motion_intensity: Number(e.target.value)})}
            className="w-full"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtle</span>
            <span>Dynamic</span>
          </div>
        </div>

        {/* Prompt Optimizer */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={parameters.prompt_optimizer}
              onChange={(e) => setParameters({...parameters, prompt_optimizer: e.target.checked})}
              disabled={isGenerating}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enhance prompt automatically</span>
          </label>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Generating video...</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !parameters.prompt.trim()}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
            isGenerating || !parameters.prompt.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="spinner w-5 h-5"></div>
              <span>Generating Video...</span>
            </div>
          ) : (
            'Generate Video'
          )}
        </button>
      </form>
    </div>
  );
};
