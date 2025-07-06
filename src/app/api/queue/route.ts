import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';
import { VideoGenerationRequest } from '@/types/video';

// GET /api/queue - Get current queue status
export async function GET() {
  try {
    const status = queueManager.getQueueStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

// POST /api/queue - Add request to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request: videoRequest } = body as { request: VideoGenerationRequest };

    // Validate request
    if (!videoRequest || !videoRequest.prompt) {
      return NextResponse.json(
        { error: 'Invalid request: prompt is required' },
        { status: 400 }
      );
    }

    if (!videoRequest.image_url) {
      return NextResponse.json(
        { error: 'Invalid request: image_url is required for Seedance video generation' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!videoRequest.duration || !videoRequest.resolution || typeof videoRequest.camera_fixed !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: duration, resolution, and camera_fixed are required' },
        { status: 400 }
      );
    }

    // Add to queue
    const result = queueManager.addToQueue(videoRequest);
    
    console.log(`Added request to queue: ${result.id} at position ${result.position}`);
    
    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Error adding to queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add request to queue' },
      { status: 500 }
    );
  }
}
