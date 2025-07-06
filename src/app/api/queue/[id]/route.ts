import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';

// GET /api/queue/[id] - Get specific request status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const queuedRequest = queueManager.getRequest(id);
    
    if (!queuedRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(queuedRequest);
  } catch (error: any) {
    console.error('Error getting request:', error);
    return NextResponse.json(
      { error: 'Failed to get request' },
      { status: 500 }
    );
  }
}

// DELETE /api/queue/[id] - Remove request from queue
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const removed = queueManager.removeFromQueue(id);
    
    if (!removed) {
      return NextResponse.json(
        { error: 'Request not found or cannot be removed' },
        { status: 404 }
      );
    }
    
    console.log(`Removed request from queue: ${id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Request removed from queue'
    });
  } catch (error: any) {
    console.error('Error removing from queue:', error);
    return NextResponse.json(
      { error: 'Failed to remove request from queue' },
      { status: 500 }
    );
  }
}
