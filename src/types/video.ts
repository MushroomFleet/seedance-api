export interface VideoGenerationRequest {
  prompt: string;
  image_url: string; // Required for Seedance
  duration: "5" | "10";
  resolution: '480p' | '720p';
  camera_fixed: boolean;
  seed?: number; // Optional seed parameter
}

export interface VideoGenerationResult {
  video: {
    url: string;
    content_type: 'video/mp4';
    file_name: string;
    file_size: number;
    duration: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  seed: number;
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  generation_params: VideoGenerationRequest;
  file_path: string;
  thumbnail_url: string;
  status: 'processing' | 'completed' | 'failed';
  effects_applied?: string[];
  apiResponseLog?: string | null; // Reference to the API response log file
}

export interface PostFXJob {
  id: string;
  sourceVideoId: string;
  effect: 'cathode-ray' | 'halation-bloom' | 'vhs-v1' | 'vhs-v2' | 'upscale' | 'gsl-v1' | 'trails-v2';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  outputVideoId?: string;
  error?: string;
  created_at: string;
}

export interface CathodeRayParams {
  preset: 'static' | 'fluctuating' | 'degraded' | 'custom';
  custom_expression: string;
  screen_curvature: number;
  scanline_intensity: number;
  glow_amount: number;
  color_bleeding: number;
  noise_amount: number;
}

export interface HalationBloomParams {
  effect_mode: 'Halation' | 'Bloom' | 'Both';
  intensity: number;
  threshold: number;
  radius: number;
  chromatic_aberration: number;
  temporal_variation: number;
  red_offset: number;
}

export interface VHSv1Params {
  luma_compression_rate: number;
  luma_noise_sigma: number;
  luma_noise_mean: number;
  chroma_compression_rate: number;
  chroma_noise_intensity: number;
  vertical_blur: number;
  horizontal_blur: number;
  border_size: number;
  generations: number;
}

export interface VHSv2Params {
  composite_preemphasis: number;
  vhs_out_sharpen: number;
  color_bleeding: number;
  video_noise: number;
  chroma_noise: number;
  chroma_phase_noise: number;
  enable_ringing: boolean;
  ringing_power: number;
  tape_speed: 'SP' | 'LP' | 'EP';
}

export interface UpscaleParams {
  input_height: number;
  input_width: number;
  field_order: 'top_first' | 'bottom_first';
  scale_factor: number;
  blend_factor: number;
  motion_compensation: 'none' | 'basic' | 'advanced';
  interpolation_mode: 'bilinear' | 'bicubic' | 'nearest';
  deinterlace_method: 'blend' | 'bob' | 'weave';
  field_strength: number;
  temporal_radius: number;
  edge_enhancement: number;
}

export interface GSLv1Params {
  effect_preset: 'custom' | 'grayscale' | 'edge_detection' | 'gaussian_blur' | 'pixelate' | 'wave_distortion' | 'chromatic_aberration';
  intensity: number;
  blur_radius: number;
  edge_threshold: number;
  pixelate_factor: number;
  wave_amplitude: number;
  wave_frequency: number;
  chromatic_shift: number;
}

export interface TrailsV2Params {
  trail_strength: number;
  decay_rate: number;
  color_bleed: number;
  blur_amount: number;
  threshold: number;
}

export interface GenerationOptions {
  onProgress?: (progress: number) => void;
}

export interface QueueUpdate {
  status: string;
  queue_position?: number;
  logs?: Array<{ message: string; timestamp: string }>;
}
