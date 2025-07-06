import { VideoMetadata } from '@/types/video';
import path from 'path';
import fs from 'fs/promises';

export class LocalVideoFileManager {
  private outputDir = path.join(process.cwd(), 'public');
  private videosDir = path.join(this.outputDir, 'videos');
  private logsDir = path.join(this.outputDir, 'logs');
  private apiResponsesDir = path.join(this.logsDir, 'api-responses');
  private metadataFile = path.join(this.outputDir, 'metadata.json');

  async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.videosDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
      await fs.mkdir(this.apiResponsesDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async saveVideo(videoUrl: string, metadata: VideoMetadata): Promise<string> {
    await this.ensureDirectories();

    try {
      // Generate filename
      const filename = this.generateFilename(metadata);
      const filePath = path.join(this.videosDir, filename);

      // Download video from URL
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save video file
      await fs.writeFile(filePath, buffer);

      // Update metadata with streaming API path
      const updatedMetadata = {
        ...metadata,
        file_path: `/api/videos/stream/${filename}`,
      };

      // Save metadata
      await this.saveMetadata(updatedMetadata);

      return filePath;
    } catch (error: any) {
      console.error('Failed to save video:', error);
      throw new Error(`Failed to save video: ${error.message}`);
    }
  }

  private generateFilename(metadata: VideoMetadata): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const title = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const resolution = metadata.generation_params.resolution;
    const duration = metadata.generation_params.duration;
    
    return `${title}_${timestamp}_${resolution}_${duration}s.mp4`;
  }

  async saveMetadata(metadata: VideoMetadata): Promise<void> {
    try {
      let existingMetadata: VideoMetadata[] = [];
      
      try {
        const data = await fs.readFile(this.metadataFile, 'utf-8');
        existingMetadata = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
      }

      // Add new metadata (or update existing)
      const existingIndex = existingMetadata.findIndex(m => m.id === metadata.id);
      if (existingIndex >= 0) {
        existingMetadata[existingIndex] = metadata;
      } else {
        existingMetadata.unshift(metadata); // Add to beginning
      }

      await fs.writeFile(this.metadataFile, JSON.stringify(existingMetadata, null, 2));
    } catch (error: any) {
      console.error('Failed to save metadata:', error);
      throw new Error(`Failed to save metadata: ${error.message}`);
    }
  }

  async loadMetadata(): Promise<VideoMetadata[]> {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return empty array if file doesn't exist
      return [];
    }
  }

  async deleteVideo(videoId: string): Promise<void> {
    try {
      const metadata = await this.loadMetadata();
      const videoMetadata = metadata.find(m => m.id === videoId);
      
      if (!videoMetadata) {
        throw new Error('Video not found');
      }

      // Delete video file - extract filename from API path and convert to file system path
      const filename = videoMetadata.file_path.split('/').pop() || '';
      const videoPath = path.join(this.videosDir, filename);
      try {
        await fs.unlink(videoPath);
      } catch (error) {
        console.warn('Video file not found for deletion:', videoPath);
      }

      // Delete associated API response log
      await this.deleteApiResponseLog(videoId);

      // Remove from metadata
      const updatedMetadata = metadata.filter(m => m.id !== videoId);
      await fs.writeFile(this.metadataFile, JSON.stringify(updatedMetadata, null, 2));
    } catch (error: any) {
      console.error('Failed to delete video:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  async saveApiResponseLog(videoId: string, apiResponse: any): Promise<string> {
    await this.ensureDirectories();

    try {
      const logFilename = this.generateLogFilename(videoId);
      const logFilePath = path.join(this.apiResponsesDir, logFilename);

      // Save complete API response with metadata
      const logData = {
        videoId,
        timestamp: new Date().toISOString(),
        apiResponse
      };

      await fs.writeFile(logFilePath, JSON.stringify(logData, null, 2));
      console.log('API response logged:', logFilename);

      return logFilename;
    } catch (error: any) {
      console.error('Failed to save API response log:', error);
      throw new Error(`Failed to save API response log: ${error.message}`);
    }
  }

  async loadApiResponseLog(videoId: string): Promise<any> {
    try {
      // Find log file by pattern since we don't store exact filename
      const files = await fs.readdir(this.apiResponsesDir);
      const logFile = files.find(file => file.startsWith(`${videoId}_`) && file.endsWith('_api-response.json'));
      
      if (!logFile) {
        console.warn(`API response log not found for video ID: ${videoId}`);
        return null;
      }

      const logFilePath = path.join(this.apiResponsesDir, logFile);
      const data = await fs.readFile(logFilePath, 'utf-8');
      const logData = JSON.parse(data);
      
      return logData.apiResponse;
    } catch (error) {
      console.warn(`Failed to load API response log for video ID: ${videoId}`, error);
      return null;
    }
  }

  private generateLogFilename(videoId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${videoId}_${timestamp}_api-response.json`;
  }

  async deleteApiResponseLog(videoId: string): Promise<void> {
    try {
      // Find and delete log file by pattern since we don't store exact filename
      const files = await fs.readdir(this.apiResponsesDir);
      const logFile = files.find(file => file.startsWith(`${videoId}_`) && file.endsWith('_api-response.json'));
      
      if (logFile) {
        const logFilePath = path.join(this.apiResponsesDir, logFile);
        await fs.unlink(logFilePath);
        console.log('API response log deleted:', logFile);
      }
    } catch (error) {
      console.warn('Failed to delete API response log:', error);
    }
  }

  async getVideoStats(): Promise<{ totalVideos: number; totalSize: number }> {
    try {
      const metadata = await this.loadMetadata();
      let totalSize = 0;

      for (const video of metadata) {
        try {
          // Extract filename from API path and get file stats
          const filename = video.file_path.split('/').pop() || '';
          const videoPath = path.join(this.videosDir, filename);
          const stats = await fs.stat(videoPath);
          totalSize += stats.size;
        } catch (error) {
          // File might not exist
        }
      }

      return {
        totalVideos: metadata.length,
        totalSize
      };
    } catch (error) {
      return { totalVideos: 0, totalSize: 0 };
    }
  }
}
