'use client';

import React, { useState, useEffect } from 'react';
import { VideoMetadata } from '@/types/video';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [stats, setStats] = useState({ totalVideos: 0, totalSize: 0 });

  useEffect(() => {
    if (isOpen) {
      loadVideos();
    }
  }, [isOpen]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/videos/save');
      const data = await response.json();
      
      if (response.ok) {
        setVideos(data.videos || []);
        setStats(data.stats || { totalVideos: 0, totalSize: 0 });
      } else {
        console.error('Failed to load videos:', data.error);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/save?id=${videoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setVideos(videos.filter(v => v.id !== videoId));
        setSelectedVideo(null);
        onRefresh();
      } else {
        const data = await response.json();
        alert(`Failed to delete video: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const downloadVideo = (video: VideoMetadata) => {
    const link = document.createElement('a');
    link.href = video.file_path;
    link.download = `${video.title}.mp4`;
    link.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Video Gallery</h2>
            <p className="text-sm text-gray-600">
              {stats.totalVideos} videos • {formatFileSize(stats.totalSize)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadVideos}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-96">
          {/* Video Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="spinner w-8 h-8"></div>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">No videos generated yet</p>
                <p className="text-sm">Start generating videos to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedVideo?.id === video.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                    }`}
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.914.914M15 5v5M9 9v10a1 1 0 001 1h4a1 1 0 001-1V9" />
                      </svg>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-800 truncate">{video.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {video.generation_params.resolution} • {video.generation_params.duration}s
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(video.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Details */}
          {selectedVideo && (
            <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
              <div className="space-y-4">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full h-full"
                    src={selectedVideo.file_path}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Video Info */}
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{selectedVideo.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{selectedVideo.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Resolution:</span>
                      <span className="font-medium">{selectedVideo.generation_params.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium">{selectedVideo.generation_params.duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Aspect Ratio:</span>
                      <span className="font-medium">{selectedVideo.generation_params.aspect_ratio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Motion:</span>
                      <span className="font-medium">{selectedVideo.generation_params.motion_intensity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium">{new Date(selectedVideo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => downloadVideo(selectedVideo)}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Download Video
                  </button>
                  <button
                    onClick={() => deleteVideo(selectedVideo.id)}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete Video
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
