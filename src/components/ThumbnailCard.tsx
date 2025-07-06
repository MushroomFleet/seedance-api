import React from 'react';
import { VideoMetadata } from '@/types/video';
import { useVideoThumbnail } from '@/hooks/useVideoThumbnail';

interface ThumbnailCardProps {
  video: VideoMetadata;
  isSelected: boolean;
  onClick: () => void;
}

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  video,
  isSelected,
  onClick
}) => {
  const { thumbnail, loading, error, retryCount, errorMessage } = useVideoThumbnail(video.file_path);

  return (
    <div
      className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
      }`}
      onClick={onClick}
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {error || (!loading && !thumbnail) ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.914.914M15 5v5M9 9v10a1 1 0 001 1h4a1 1 0 001-1V9" />
            </svg>
            {error && (
              <>
                <p className="text-xs text-red-500 mt-2">Thumbnail failed</p>
                {retryCount && retryCount > 0 && (
                  <p className="text-xs text-gray-400">Tried {retryCount} time{retryCount > 1 ? 's' : ''}</p>
                )}
                {errorMessage && (
                  <p className="text-xs text-gray-400 mt-1 max-w-full truncate" title={errorMessage}>
                    {errorMessage.length > 30 ? errorMessage.substring(0, 30) + '...' : errorMessage}
                  </p>
                )}
              </>
            )}
          </div>
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={`Thumbnail for ${video.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
        
        {/* Play button overlay */}
        {thumbnail && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}
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
  );
};
