'use client';

import React, { useState, useEffect } from 'react';
import { VideoMetadata } from '@/types/video';
import { PostFXModal } from './PostFXModal';
import { ThumbnailCard } from './ThumbnailCard';

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
  const [isPostFXModalOpen, setIsPostFXModalOpen] = useState(false);

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
    // Extract filename from API path and create direct download link
    const filename = video.file_path.split('/').pop() || '';
    link.href = `/videos/${filename}`;
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
                  <ThumbnailCard
                    key={video.id}
                    video={video}
                    isSelected={selectedVideo?.id === video.id}
                    onClick={() => setSelectedVideo(video)}
                  />
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
                      <span className="font-medium text-gray-800">{selectedVideo.generation_params.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium text-gray-800">{selectedVideo.generation_params.duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Camera Fixed:</span>
                      <span className="font-medium text-gray-800">{selectedVideo.generation_params.camera_fixed ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium text-gray-800">{new Date(selectedVideo.created_at).toLocaleDateString()}</span>
                    </div>
                    {selectedVideo.effects_applied && selectedVideo.effects_applied.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Effects Applied:</span>
                        <span className="font-medium text-purple-600">{selectedVideo.effects_applied.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => setIsPostFXModalOpen(true)}
                    className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>PostFX Queue</span>
                  </button>
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

      {/* PostFX Modal */}
      <PostFXModal
        isOpen={isPostFXModalOpen}
        onClose={() => setIsPostFXModalOpen(false)}
        selectedVideo={selectedVideo}
        onVideoProcessed={() => {
          loadVideos();
          onRefresh();
        }}
      />
    </div>
  );
};
