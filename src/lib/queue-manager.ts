import { QueuedRequest, QueueState, QueueStats } from '@/types/queue';
import { VideoGenerationRequest } from '@/types/video';
import { FALVideoGenerator } from './fal-client';
import { LocalVideoFileManager } from './file-manager';

class QueueManager {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private currentRequestId?: string;
  private generator = new FALVideoGenerator();
  private fileManager = new LocalVideoFileManager();

  // Add request to queue
  addToQueue(request: VideoGenerationRequest): { id: string; position: number; estimatedWaitTime: number } {
    const id = this.generateId();
    const queuedRequest: QueuedRequest = {
      id,
      status: 'pending',
      progress: 0,
      request,
      timestamp: Date.now(),
      estimatedTime: this.estimateProcessingTime(request),
    };

    this.queue.push(queuedRequest);
    const position = this.queue.filter(r => r.status === 'pending').length;
    const estimatedWaitTime = this.calculateEstimatedWaitTime(position);

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processNext();
    }

    return { id, position, estimatedWaitTime };
  }

  // Get current queue status
  getQueueStatus(): { queue: QueuedRequest[]; stats: QueueStats; isProcessing: boolean; currentRequestId?: string } {
    return {
      queue: [...this.queue],
      stats: this.getStats(),
      isProcessing: this.isProcessing,
      currentRequestId: this.currentRequestId,
    };
  }

  // Remove request from queue
  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(r => r.id === id);
    if (index === -1) return false;

    const request = this.queue[index];
    
    // Can only remove pending requests
    if (request.status === 'pending') {
      this.queue.splice(index, 1);
      return true;
    }
    
    return false;
  }

  // Get request by ID
  getRequest(id: string): QueuedRequest | undefined {
    return this.queue.find(r => r.id === id);
  }

  // Update request progress (for external progress updates)
  updateProgress(id: string, progress: number): void {
    const request = this.queue.find(r => r.id === id);
    if (request && request.status === 'processing') {
      request.progress = progress;
    }
  }

  // Process next request in queue
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;

    const nextRequest = this.queue.find(r => r.status === 'pending');
    if (!nextRequest) {
      this.isProcessing = false;
      this.currentRequestId = undefined;
      return;
    }

    this.isProcessing = true;
    this.currentRequestId = nextRequest.id;
    nextRequest.status = 'processing';
    nextRequest.startTime = Date.now();

    try {
      console.log(`Processing request ${nextRequest.id}:`, nextRequest.request.prompt.slice(0, 50) + '...');

      // Generate video with progress tracking
      const result = await this.generator.generateVideo(nextRequest.request, {
        onProgress: (progress) => {
          nextRequest.progress = progress;
        }
      });

      // Save video to local storage using file manager directly
      await this.fileManager.saveVideo(result.video.url, result.metadata);

      // Mark as completed
      nextRequest.status = 'completed';
      nextRequest.progress = 100;
      nextRequest.result = result;
      nextRequest.endTime = Date.now();

      console.log(`Request ${nextRequest.id} completed successfully`);

    } catch (error: any) {
      console.error(`Request ${nextRequest.id} failed:`, error);
      nextRequest.status = 'failed';
      nextRequest.error = error.message || 'Video generation failed';
      nextRequest.endTime = Date.now();
    }

    // Process next request
    this.isProcessing = false;
    this.currentRequestId = undefined;
    setTimeout(() => this.processNext(), 1000); // Small delay before processing next
  }

  // Generate unique ID
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Estimate processing time based on request parameters
  private estimateProcessingTime(request: VideoGenerationRequest): number {
    const baseDuration = parseInt(request.duration) || 5;
    const resolution = request.resolution === '720p' ? 1.5 : 1.0;
    
    // Base estimation: 30-60 seconds per second of video
    return Math.round((baseDuration * 45 * resolution) * 1000); // in milliseconds
  }

  // Calculate estimated wait time for position in queue
  private calculateEstimatedWaitTime(position: number): number {
    const averageProcessingTime = 60000; // 60 seconds average
    return (position - 1) * averageProcessingTime;
  }

  // Get queue statistics
  private getStats(): QueueStats {
    const total = this.queue.length;
    const pending = this.queue.filter(r => r.status === 'pending').length;
    const processing = this.queue.filter(r => r.status === 'processing').length;
    const completed = this.queue.filter(r => r.status === 'completed').length;
    const failed = this.queue.filter(r => r.status === 'failed').length;

    return { total, pending, processing, completed, failed };
  }

  // Clean up old completed/failed requests (optional cleanup)
  cleanupOldRequests(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.queue = this.queue.filter(r => {
      if ((r.status === 'completed' || r.status === 'failed') && r.timestamp < cutoff) {
        return false;
      }
      return true;
    });
  }
}

// Singleton instance
export const queueManager = new QueueManager();
