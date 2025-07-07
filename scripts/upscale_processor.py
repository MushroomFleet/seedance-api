import cv2
import numpy as np
import sys
import json
import subprocess
import os
import torch
import torch.nn.functional as F
from typing import Tuple, Optional

class VideoUpscaleProcessor:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def validate_video(self, video_path):
        """Validate that the video file is properly formatted and readable"""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return False
            
            # Try to read multiple frames to ensure integrity
            for _ in range(min(10, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))):
                ret, frame = cap.read()
                if not ret or frame is None:
                    cap.release()
                    return False
            
            cap.release()
            return True
        except Exception:
            return False

    def _initialize_video_writer(self, output_path, fps, width, height):
        """Initialize video writer with codec fallback"""
        codecs_to_try = [
            ('H264', cv2.VideoWriter_fourcc(*'H264')),    # Best compatibility
            ('MJPG', cv2.VideoWriter_fourcc(*'MJPG')),    # Fallback option
            ('XVID', cv2.VideoWriter_fourcc(*'XVID')),    # Legacy support
            ('mp4v', cv2.VideoWriter_fourcc(*'mp4v'))     # Last resort
        ]
        
        for codec_name, fourcc in codecs_to_try:
            try:
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                if out.isOpened():
                    print(f"Using codec: {codec_name}", flush=True)
                    return out
                out.release()
            except:
                continue
                
        raise Exception("Failed to initialize video writer with any codec")

    def optimize_with_ffmpeg(self, input_path, output_path):
        """Use FFmpeg to create a web-optimized MP4 file"""
        try:
            cmd = [
                'ffmpeg', '-y',
                '-i', input_path,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-max_muxing_queue_size', '1024',
                output_path
            ]
            
            process = subprocess.run(cmd, capture_output=True, text=True)
            
            if process.returncode != 0:
                raise Exception(f"FFmpeg failed: {process.stderr}")
            
            # Clean up temporary file
            try:
                os.remove(input_path)
            except:
                pass
                
            return True
        except FileNotFoundError:
            print("WARNING: FFmpeg not found, using OpenCV output", flush=True)
            # Fallback to renaming temp file
            os.rename(input_path, output_path)
            return False
        except Exception as e:
            print(f"WARNING: FFmpeg optimization failed: {e}", flush=True)
            return False

    def apply_edge_enhancement(self, frame: np.ndarray, strength: float) -> np.ndarray:
        """Applies edge enhancement using Sobel operator"""
        if strength == 0:
            return frame
            
        # Convert to grayscale for edge detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply Sobel operators
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        
        # Calculate edge magnitude
        edges = np.sqrt(sobel_x**2 + sobel_y**2)
        edges = np.clip(edges / edges.max() * strength * 255, 0, 255).astype(np.uint8)
        
        # Convert edges back to BGR and add to original
        edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        enhanced = cv2.addWeighted(frame, 1.0, edges_bgr, strength, 0)
        
        return np.clip(enhanced, 0, 255).astype(np.uint8)

    def apply_advanced_motion_compensation(self, frames: list, frame_idx: int, temporal_radius: int) -> np.ndarray:
        """Apply advanced motion compensation using temporal information"""
        if temporal_radius <= 1 or len(frames) < 3:
            return frames[frame_idx]
            
        start_idx = max(0, frame_idx - temporal_radius)
        end_idx = min(len(frames), frame_idx + temporal_radius + 1)
        
        # Get frames in temporal window
        temporal_frames = frames[start_idx:end_idx]
        
        # Simple temporal averaging with center weighting
        weights = np.array([1.0, 2.0, 1.0]) if len(temporal_frames) == 3 else np.ones(len(temporal_frames))
        weights = weights / weights.sum()
        
        compensated = np.zeros_like(frames[frame_idx], dtype=np.float32)
        for i, frame in enumerate(temporal_frames):
            compensated += frame.astype(np.float32) * weights[i]
            
        return np.clip(compensated, 0, 255).astype(np.uint8)

    def create_interlaced_frame(self, frame: np.ndarray, prev_frame: Optional[np.ndarray], 
                              next_frame: Optional[np.ndarray], params: dict) -> np.ndarray:
        """Create interlaced and upscaled frame"""
        
        # Apply motion compensation at original resolution if enabled
        if params['motion_compensation'] != 'none':
            if params['motion_compensation'] == 'advanced' and prev_frame is not None and next_frame is not None:
                # Simple temporal smoothing for advanced mode
                frame = cv2.addWeighted(
                    cv2.addWeighted(prev_frame, 0.25, frame, 0.5, 0),
                    1.0, next_frame, 0.25, 0
                ).astype(np.uint8)
            else:  # Basic motion compensation
                # Apply field-based blending
                h, w = frame.shape[:2]
                even_mask = np.zeros((h, w, 1), dtype=np.float32)
                odd_mask = np.zeros((h, w, 1), dtype=np.float32)
                
                if params['field_order'] == 'top_first':
                    even_mask[::2] = 1.0
                    odd_mask[1::2] = 1.0
                else:
                    even_mask[1::2] = 1.0
                    odd_mask[::2] = 1.0
                
                # Apply blending
                blend_factor = params['blend_factor']
                frame_f = frame.astype(np.float32)
                blended = frame_f * (1 - blend_factor) + (frame_f * even_mask + frame_f * odd_mask) * blend_factor
                frame = np.clip(blended, 0, 255).astype(np.uint8)
        
        # Upscale the frame
        target_height = int(params['input_height'] * params['scale_factor'])
        target_width = int(params['input_width'] * params['scale_factor'])
        
        if params['interpolation_mode'] == 'bilinear':
            interpolation = cv2.INTER_LINEAR
        elif params['interpolation_mode'] == 'bicubic':
            interpolation = cv2.INTER_CUBIC
        else:  # nearest
            interpolation = cv2.INTER_NEAREST
            
        upscaled = cv2.resize(frame, (target_width, target_height), interpolation=interpolation)
        
        # Apply interlacing effects at upscaled resolution
        h, w = upscaled.shape[:2]
        even_mask = np.zeros((h, w, 1), dtype=np.float32)
        odd_mask = np.zeros((h, w, 1), dtype=np.float32)
        
        if params['field_order'] == 'top_first':
            even_mask[::2] = 1.0
            odd_mask[1::2] = 1.0
        else:
            even_mask[1::2] = 1.0
            odd_mask[::2] = 1.0
        
        # Apply field strength
        field_strength = params['field_strength']
        even_mask *= field_strength
        odd_mask *= field_strength
        
        # Separate fields
        upscaled_f = upscaled.astype(np.float32)
        even_field = upscaled_f * even_mask
        odd_field = upscaled_f * odd_mask
        
        # Apply deinterlacing method
        if params['deinterlace_method'] == 'blend':
            interlaced = even_field + odd_field
        elif params['deinterlace_method'] == 'bob':
            interlaced = np.where(even_mask > 0, even_field, odd_field)
        else:  # weave
            interlaced = even_field + odd_field
        
        interlaced = np.clip(interlaced, 0, 255).astype(np.uint8)
        
        # Apply edge enhancement if enabled
        if params['edge_enhancement'] > 0:
            interlaced = self.apply_edge_enhancement(interlaced, params['edge_enhancement'])
        
        return interlaced

    def process_video(self, input_path, output_path, params):
        """Process video with interlaced upscaling"""
        # Validate input
        if not self.validate_video(input_path):
            raise Exception(f"Failed to open or validate input video: {input_path}")
        
        cap = cv2.VideoCapture(input_path)
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Input video: {width}x{height}, {fps} FPS, {total_frames} frames", flush=True)
        
        # Update params with actual input dimensions
        params['input_width'] = width
        params['input_height'] = height
        
        # Calculate target dimensions
        target_width = int(width * params['scale_factor'])
        target_height = int(height * params['scale_factor'])
        
        print(f"Target resolution: {target_width}x{target_height} (scale: {params['scale_factor']}x)", flush=True)
        
        # Create temporary output
        temp_output = output_path.replace('.mp4', '_temp.mp4')
        out = self._initialize_video_writer(temp_output, fps, target_width, target_height)
        
        # Load all frames for temporal processing if using advanced motion compensation
        frames = []
        if params['motion_compensation'] == 'advanced':
            print("Loading frames for temporal processing...", flush=True)
            for i in range(total_frames):
                ret, frame = cap.read()
                if ret:
                    frames.append(frame)
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Reset to beginning
        
        # Process frames
        frame_count = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Get adjacent frames for motion compensation
                prev_frame = frames[frame_count - 1] if frames and frame_count > 0 else None
                next_frame = frames[frame_count + 1] if frames and frame_count < len(frames) - 1 else None
                
                # Process frame
                processed_frame = self.create_interlaced_frame(frame, prev_frame, next_frame, params)
                out.write(processed_frame)
                
                # Report progress (0-80%)
                frame_count += 1
                progress = int((frame_count / total_frames) * 80)
                print(f"PROGRESS:{progress}", flush=True)
                
        finally:
            cap.release()
            out.release()
        
        print("PROGRESS:85", flush=True)
        print("Post-processing video...", flush=True)
        
        # Optimize with FFmpeg
        if not self.optimize_with_ffmpeg(temp_output, output_path):
            print("Using OpenCV output without FFmpeg optimization", flush=True)
        
        print("PROGRESS:95", flush=True)
        
        # Validate output
        if not self.validate_video(output_path):
            raise Exception("Generated video failed validation")
        
        print("PROGRESS:100", flush=True)
        print("COMPLETED", flush=True)

def main():
    if len(sys.argv) != 4:
        print("Usage: python upscale_processor.py <input_path> <output_path> <params_json>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    params_json = sys.argv[3]
    
    try:
        params = json.loads(params_json)
        
        processor = VideoUpscaleProcessor()
        processor.process_video(input_path, output_path, params)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
