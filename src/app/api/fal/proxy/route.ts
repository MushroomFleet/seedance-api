import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

// Configure FAL with server-side API key
fal.config({
  credentials: process.env.FAL_KEY,
});

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

    console.log('Generating video with parameters:', {
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

    return NextResponse.json(result);
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
