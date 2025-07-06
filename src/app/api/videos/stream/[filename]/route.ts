import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = await params;
    const videoPath = path.join(process.cwd(), 'public', 'videos', filename);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return new NextResponse('Video not found', { status: 404 });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = fs.createReadStream(videoPath, { start, end });
      
      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
      });

      return new NextResponse(file as any, {
        status: 206,
        headers,
      });
    } else {
      // Handle regular requests
      const file = fs.createReadStream(videoPath);
      
      const headers = new Headers({
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
      });

      return new NextResponse(file as any, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error('Video streaming error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
