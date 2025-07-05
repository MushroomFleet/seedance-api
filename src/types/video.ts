export interface VideoGenerationRequest {
  prompt: string;
  image_url?: string;
  duration: 5 | 10;
  resolution: '480p' | '720p';
  aspect_ratio: '16:9' | '9:16' | '1:1';
  motion_intensity: number; // 0.0 to 1.0
  seed?: number;
  prompt_optimizer: boolean;
}

export interface VideoGenerationResult {
  video: {
    url: string;
    content_type: 'video/mp4';
    file_name: string;
    file_size: number;
    duration: number;
    fps: 24;
    resolution: { width: number; height: number };
  };
  seed: number;
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  generation_params: VideoGenerationRequest;
  file_path: string;
  thumbnail_url: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface GenerationOptions {
  onProgress?: (progress: number) => void;
}

export interface QueueUpdate {
  status: string;
  queue_position?: number;
  logs?: Array<{ message: string; timestamp: string }>;
}
