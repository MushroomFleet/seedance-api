import { fal } from "@fal-ai/client";
import { VideoGenerationRequest, VideoGenerationResult, VideoMetadata, GenerationOptions, QueueUpdate } from '@/types/video';

export class FALVideoGenerator {
  private maxRetries = 3;
  private baseDelay = 1000;

  constructor() {
    fal.config({
      proxyUrl: "/api/fal/proxy",
    });
  }

  async generateVideo(
    input: VideoGenerationRequest,
    options: GenerationOptions = {}
  ): Promise<VideoGenerationResult> {
    let attempt = 0;
    
    while (attempt < this.maxRetries) {
      try {
        const result = await fal.subscribe("fal-ai/seedance/v1/lite/image-to-video", {
          input,
          logs: true,
          onQueueUpdate: (update: QueueUpdate) => {
            this.handleQueueUpdate(update, options.onProgress);
          },
        });

        return {
          ...result.data,
          metadata: {
            id: crypto.randomUUID(),
            title: input.prompt.slice(0, 50) + (input.prompt.length > 50 ? "..." : ""),
            description: input.prompt,
            tags: this.extractTags(input.prompt),
            created_at: new Date().toISOString(),
            generation_params: input,
            file_path: result.data.video.url,
            thumbnail_url: await this.generateThumbnailUrl(result.data.video.url),
            status: 'completed'
          }
        };
      } catch (error: any) {
        attempt++;
        
        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
          continue;
        }
        
        throw this.formatError(error, attempt);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private handleQueueUpdate(update: QueueUpdate, onProgress?: (progress: number) => void) {
    if (update.status === "IN_PROGRESS") {
      const progress = this.calculateProgress(update.logs || []);
      onProgress?.(progress);
      
      update.logs?.forEach((log) => {
        console.log(`[FAL] ${log.message}`);
      });
    }
  }

  private calculateProgress(logs: Array<{ message: string; timestamp: string }>): number {
    // Simple progress calculation based on log messages
    const totalSteps = 10;
    const completedSteps = logs.length;
    return Math.min((completedSteps / totalSteps) * 100, 95); // Cap at 95% until completion
  }

  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) || 
           error.message?.includes('timeout') ||
           error.message?.includes('network');
  }

  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  private async generateThumbnailUrl(videoUrl: string): Promise<string> {
    // For now, return a placeholder. In production, this would generate an actual thumbnail
    return `/api/thumbnails/generate?video=${encodeURIComponent(videoUrl)}`;
  }

  private extractTags(prompt: string): string[] {
    // Simple tag extraction logic
    const keywords = prompt.toLowerCase().match(/\b\w+\b/g) || [];
    return keywords.slice(0, 10);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatError(error: any, attempt: number): Error {
    const message = error.message || 'Video generation failed';
    return new Error(`${message} (attempt ${attempt}/${this.maxRetries})`);
  }
}
