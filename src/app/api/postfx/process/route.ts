import { NextRequest, NextResponse } from "next/server";
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { LocalVideoFileManager } from '@/lib/file-manager';
import { PostFXJob, VideoMetadata, CathodeRayParams } from '@/types/video';

const fileManager = new LocalVideoFileManager();

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, PostFXJob>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceVideoId, effect, parameters }: { 
      sourceVideoId: string; 
      effect: 'cathode-ray'; 
      parameters?: Partial<CathodeRayParams> 
    } = body;

    // Validate request
    if (!sourceVideoId || !effect) {
      return NextResponse.json(
        { error: 'Missing required parameters: sourceVideoId and effect' },
        { status: 400 }
      );
    }

    if (effect !== 'cathode-ray') {
      return NextResponse.json(
        { error: 'Unsupported effect. Currently only cathode-ray is supported.' },
        { status: 400 }
      );
    }

    // Load source video metadata
    const metadata = await fileManager.loadMetadata();
    const sourceVideo = metadata.find(v => v.id === sourceVideoId);
    
    if (!sourceVideo) {
      return NextResponse.json(
        { error: 'Source video not found' },
        { status: 404 }
      );
    }

    // Create job
    const jobId = crypto.randomUUID();
    const job: PostFXJob = {
      id: jobId,
      sourceVideoId,
      effect,
      status: 'queued',
      progress: 0,
      created_at: new Date().toISOString()
    };

    jobs.set(jobId, job);

    // Start processing asynchronously
    processVideoAsync(job, sourceVideo, parameters);

    return NextResponse.json({ 
      jobId,
      status: 'queued',
      message: 'Video processing started'
    });

  } catch (error: any) {
    console.error('PostFX processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start video processing',
        details: error.message
      },
      { status: 500 }
    );
  }
}

async function processVideoAsync(
  job: PostFXJob, 
  sourceVideo: VideoMetadata, 
  parameters?: Partial<CathodeRayParams>
) {
  try {
    // Update job status
    job.status = 'processing';
    job.progress = 0;

    // Default parameters for cathode ray effect
    const defaultParams: CathodeRayParams = {
      preset: 'static',
      custom_expression: 'sin(t/10) * 0.1 + 0.2',
      screen_curvature: 0.2,
      scanline_intensity: 0.3,
      glow_amount: 0.2,
      color_bleeding: 0.15,
      noise_amount: 0.05
    };

    const effectParams = { ...defaultParams, ...parameters };

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sourceFilename = sourceVideo.file_path.split('/').pop() || '';
    const baseName = path.basename(sourceFilename, '.mp4');
    const outputFilename = `${baseName}_cathode-ray_${timestamp}.mp4`;
    
    // File paths
    const inputPath = path.join(process.cwd(), 'public', 'videos', sourceFilename);
    const outputPath = path.join(process.cwd(), 'public', 'videos', outputFilename);
    const scriptPath = path.join(process.cwd(), 'scripts', 'cathode_ray_processor.py');

    // Prepare Python script arguments
    const paramsJson = JSON.stringify(effectParams);
    const args = [scriptPath, inputPath, outputPath, paramsJson];

    console.log('Starting video processing:', {
      jobId: job.id,
      inputPath,
      outputPath,
      params: effectParams
    });

    // Execute Python script
    const pythonProcess = spawn('python', args);

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log('Python output:', output);

      if (output.startsWith('PROGRESS:')) {
        const progress = parseInt(output.split(':')[1]);
        job.progress = progress;
      } else if (output === 'COMPLETED') {
        job.progress = 100;
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          // Create new video metadata
          const newVideoId = crypto.randomUUID();
          const effectsApplied = [...(sourceVideo.effects_applied || []), 'cathode-ray'];
          
          const newMetadata: VideoMetadata = {
            ...sourceVideo,
            id: newVideoId,
            title: `${sourceVideo.title} (Cathode Ray)`,
            description: `${sourceVideo.description} - Processed with cathode ray effect`,
            file_path: `/api/videos/stream/${outputFilename}`,
            effects_applied: effectsApplied,
            created_at: new Date().toISOString()
          };

          // Save metadata
          await fileManager.saveMetadata(newMetadata);

          // Update job
          job.status = 'completed';
          job.outputVideoId = newVideoId;
          job.progress = 100;

          console.log('Video processing completed:', {
            jobId: job.id,
            outputVideoId: newVideoId,
            outputPath
          });

        } catch (error) {
          console.error('Failed to save processed video metadata:', error);
          job.status = 'failed';
          job.error = 'Failed to save processed video metadata';
        }
      } else {
        console.error('Python script failed with code:', code);
        job.status = 'failed';
        job.error = `Video processing failed with exit code ${code}`;
        
        // Clean up output file if it exists
        try {
          await fs.unlink(outputPath);
        } catch (error) {
          // File might not exist
        }
      }
    });

  } catch (error: any) {
    console.error('Video processing error:', error);
    job.status = 'failed';
    job.error = error.message;
  }
}

export async function GET() {
  // Return list of all jobs
  const jobList = Array.from(jobs.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ jobs: jobList });
}
