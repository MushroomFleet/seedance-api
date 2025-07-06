import { NextRequest, NextResponse } from "next/server";
import { LocalVideoFileManager } from '@/lib/file-manager';

const fileManager = new LocalVideoFileManager();

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Load the API response log for this video
    const apiResponse = await fileManager.loadApiResponseLog(videoId);

    if (!apiResponse) {
      return NextResponse.json(
        { error: 'API response log not found for this video' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId,
      apiResponse
    });
  } catch (error: any) {
    console.error('Failed to load API response log:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to load API response log',
        details: error.message
      },
      { status: 500 }
    );
  }
}
