'use client';

import React, { useState, useRef } from 'react';
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
    duration: "5",
    resolution: "720p",
    camera_fixed: false
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processedImageData, setProcessedImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Keep original aspect ratio, resize to max 1280x720 for 720p
        const maxWidth = parameters.resolution === "720p" ? 1280 : 854;
        const maxHeight = parameters.resolution === "720p" ? 720 : 480;
        
        let { width, height } = img;
        
        // Scale down if needed while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;

        // Draw the image
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        resolve(base64);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      // Process image
      const processedData = await processImage(file);
      setProcessedImageData(processedData);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parameters.prompt.trim() && processedImageData && !isGenerating) {
      onGenerate({
        ...parameters,
        image_url: processedImageData
      });
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessedImageData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Generate Video from Image + Text</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image <span className="text-red-500">*</span>
          </label>
          
          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={isGenerating}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-600">Click to upload an image</span>
                <span className="text-sm text-gray-400">PNG, JPG, WEBP up to 10MB</span>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Selected"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={removeImage}
                disabled={isGenerating}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">{selectedImage?.name}</span>
                <span className="ml-2 text-gray-400">
                  ({((selectedImage?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your video <span className="text-red-500">*</span>
          </label>
          <textarea
            value={parameters.prompt}
            onChange={(e) => setParameters({...parameters, prompt: e.target.value})}
            placeholder="A little dog is running in the sunshine. The camera follows the dog as it plays in a garden."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white placeholder-gray-500"
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
          <div className="grid grid-cols-2 gap-2">
            {(['5', '10'] as const).map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setParameters({...parameters, duration})}
                disabled={isGenerating}
                className={`p-3 rounded-lg border transition-colors ${
                  parameters.duration === duration
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400 disabled:opacity-50'
                }`}
              >
                {duration}s {duration === '5' ? '($0.18)' : '($0.36)'}
              </button>
            ))}
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

        {/* Camera Fixed */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={parameters.camera_fixed}
              onChange={(e) => setParameters({...parameters, camera_fixed: e.target.checked})}
              disabled={isGenerating}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Fix camera position (less motion)</span>
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
          disabled={isGenerating || !parameters.prompt.trim() || !processedImageData}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
            isGenerating || !parameters.prompt.trim() || !processedImageData
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
            !processedImageData ? 'Upload Image First' :
            !parameters.prompt.trim() ? 'Add Description' :
            'Generate Video'
          )}
        </button>
      </form>
    </div>
  );
};
