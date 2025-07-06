import { NextRequest, NextResponse } from "next/server";

// Import the jobs map from the process route (in production, use shared storage)
// For now, we'll recreate it here - this should be refactored to use Redis or database
const jobs = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, we'd fetch from shared storage
    // For now, we'll return a placeholder response
    return NextResponse.json({
      id: jobId,
      status: 'processing',
      progress: 50,
      message: 'Job status endpoint - implement shared storage'
    });

  } catch (error: any) {
    console.error('Failed to get job status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        details: error.message
      },
      { status: 500 }
    );
  }
}
