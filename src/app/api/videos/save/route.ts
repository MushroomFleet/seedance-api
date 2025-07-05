import { NextRequest, NextResponse } from "next/server";
import { LocalVideoFileManager } from '@/lib/file-manager';
import { VideoMetadata } from '@/types/video';

const fileManager = new LocalVideoFileManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, metadata }: { videoUrl: string; metadata: VideoMetadata } = body;

    // Validate request
    if (!videoUrl || !metadata) {
      return NextResponse.json(
        { error: 'Missing required parameters: videoUrl and metadata' },
        { status: 400 }
      );
    }

    console.log('Saving video to local storage:', metadata.title);

    // Save video to local storage
    const filePath = await fileManager.saveVideo(videoUrl, metadata);

    console.log('Video saved successfully:', filePath);

    return NextResponse.json({ 
      success: true, 
      filePath,
      message: 'Video saved successfully'
    });
  } catch (error: any) {
    console.error('Video save error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save video',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const metadata = await fileManager.loadMetadata();
    const stats = await fileManager.getVideoStats();

    return NextResponse.json({
      videos: metadata,
      stats
    });
  } catch (error: any) {
    console.error('Failed to load videos:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to load videos',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    await fileManager.deleteVideo(videoId);

    return NextResponse.json({ 
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error: any) {
    console.error('Video delete error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete video',
        details: error.message
      },
      { status: 500 }
    );
  }
}
