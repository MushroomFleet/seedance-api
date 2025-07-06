import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { LocalVideoFileManager } from '@/lib/file-manager';
import { randomUUID } from 'crypto';

// Configure FAL with server-side API key
fal.config({
  credentials: process.env.FAL_KEY,
});

const fileManager = new LocalVideoFileManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, model } = body;

    // Validate request
    if (!input || !model) {
      return NextResponse.json(
        { error: 'Missing required parameters: input and model' },
        { status: 400 }
      );
    }

    // Validate required input fields
    if (!input.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate unique video ID for this request
    const videoId = randomUUID();

    console.log('Generating video with parameters:', {
      videoId,
      model,
      prompt: input.prompt.slice(0, 50) + '...',
      duration: input.duration,
      resolution: input.resolution,
    });

    // Generate video using FAL
    const result = await fal.subscribe(model, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update.status);
      },
    });

    console.log('Video generation completed:', result.data.video.file_name);

    // Save complete API response to log file (includes base64 data)
    await fileManager.saveApiResponseLog(videoId, result);

    // Return clean response without heavy base64 data
    const cleanResult = {
      ...result,
      data: {
        ...result.data,
        video: {
          ...result.data.video,
          // Keep essential video info but remove base64 content if present
          url: result.data.video.url,
          content_type: result.data.video.content_type,
          file_name: result.data.video.file_name,
          file_size: result.data.video.file_size,
          duration: result.data.video.duration,
          fps: result.data.video.fps,
          resolution: result.data.video.resolution,
        }
      },
      // Add reference to log file
      videoId,
      logReference: `${videoId}_api-response.json`
    };

    return NextResponse.json(cleanResult);
  } catch (error: any) {
    console.error('FAL API Error:', error);
    
    // Return appropriate error response
    const status = error.status || 500;
    const message = error.message || 'Video generation failed';
    
    return NextResponse.json(
      { 
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
