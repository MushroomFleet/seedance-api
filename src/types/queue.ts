import { VideoGenerationRequest } from './video';

export interface QueuedRequest {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  request: VideoGenerationRequest;
  timestamp: number;
  result?: {
    video: { url: string; file_name: string };
    metadata: any;
  };
  error?: string;
  estimatedTime?: number;
  startTime?: number;
  endTime?: number;
}

export interface QueueState {
  requests: QueuedRequest[];
  isProcessing: boolean;
  currentRequestId?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface AddToQueueRequest {
  request: VideoGenerationRequest;
}

export interface AddToQueueResponse {
  id: string;
  position: number;
  estimatedWaitTime: number;
}

export interface QueueStatusResponse {
  queue: QueuedRequest[];
  stats: QueueStats;
  isProcessing: boolean;
  currentRequestId?: string;
}
