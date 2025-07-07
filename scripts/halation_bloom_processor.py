#!/usr/bin/env python3
import numpy as np
import cv2
import sys
import json
import os
import subprocess
from math import sin, cos, tan, log, exp, sqrt, pi

class HalationBloomVideoProcessor:
    def __init__(self):
        self.default_params = {
            "effect_mode": "Both",
            "intensity": 1.0,
            "threshold": 0.6,
            "radius": 15,
            "chromatic_aberration": 0.5,
            "temporal_variation": 0.2,
            "red_offset": 1.2
        }

    def create_temporal_variation(self, base_value, variation_amount, frame_index, total_frames):
        """Create smooth temporal variation using sine waves"""
        if total_frames <= 1:
            return base_value
        
        phase = (frame_index / total_frames) * 2 * pi
        variation = sin(phase) * variation_amount
        return base_value + variation

    def apply_halation(self, image, intensity, radius, threshold, red_offset):
        """Apply halation effect with color bleeding"""
        # Convert to float32 for processing
        img_float = image.astype(np.float32) / 255.0
        
        # Create luminance mask for bright areas
        luminance = cv2.cvtColor(img_float, cv2.COLOR_RGB2LAB)[:,:,0]
        bright_mask = np.clip(luminance - threshold, 0, 1)
        
        # Create separate color channel glows
        red_glow = cv2.GaussianBlur(img_float[:,:,0], (0,0), radius * red_offset)
        green_glow = cv2.GaussianBlur(img_float[:,:,1], (0,0), radius * 0.9)
        blue_glow = cv2.GaussianBlur(img_float[:,:,2], (0,0), radius * 0.8)
        
        # Combine channels with mask
        halation = np.stack([red_glow, green_glow, blue_glow], axis=-1)
        halation = halation * np.expand_dims(bright_mask, -1) * intensity
        
        # Blend with original image
        result = np.clip(img_float + halation, 0, 1)
        return (result * 255).astype(np.uint8)

    def apply_bloom(self, image, intensity, radius, threshold):
        """Apply uniform bloom effect"""
        # Convert to float32
        img_float = image.astype(np.float32) / 255.0
        
        # Create and blur bright areas
        bright_areas = np.where(img_float > threshold, img_float, 0)
        bloom = cv2.GaussianBlur(bright_areas, (0,0), radius)
        
        # Blend with original image
        result = np.clip(img_float + (bloom * intensity), 0, 1)
        return (result * 255).astype(np.uint8)

    def apply_chromatic_aberration(self, image, amount):
        """Apply chromatic aberration effect"""
        height, width = image.shape[:2]
        
        # Calculate displacement maps
        x_displacement = int(width * amount * 0.02)
        y_displacement = int(height * amount * 0.01)
        
        # Split channels and apply displacement
        b, g, r = cv2.split(image)
        
        # Shift red channel
        matrix_r = np.float32([[1, 0, x_displacement], [0, 1, y_displacement]])
        r = cv2.warpAffine(r, matrix_r, (width, height))
        
        # Shift blue channel opposite
        matrix_b = np.float32([[1, 0, -x_displacement], [0, 1, -y_displacement]])
        b = cv2.warpAffine(b, matrix_b, (width, height))
        
        return cv2.merge([b, g, r])

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
            
            return True
        except FileNotFoundError:
            print("WARNING: FFmpeg not found, using OpenCV output without optimization", flush=True)
            return False
        except Exception as e:
            print(f"WARNING: FFmpeg optimization failed: {e}", flush=True)
            return False

    def process_video(self, input_path, output_path, params=None):
        if params is None:
            params = self.default_params.copy()
        
        # Open input video
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise Exception(f"Failed to open input video: {input_path}")
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Processing video: {width}x{height}, {fps}fps, {total_frames} frames", flush=True)
        
        # Create temporary output path for OpenCV
        temp_output = output_path.replace('.mp4', '_temp.mp4')
        
        # Try different codecs for better compatibility
        codecs_to_try = [
            ('H264', cv2.VideoWriter_fourcc(*'H264')),
            ('MJPG', cv2.VideoWriter_fourcc(*'MJPG')),
            ('XVID', cv2.VideoWriter_fourcc(*'XVID')),
            ('mp4v', cv2.VideoWriter_fourcc(*'mp4v'))
        ]
        
        out = None
        successful_codec = None
        
        for codec_name, fourcc in codecs_to_try:
            try:
                out = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))
                if out.isOpened():
                    successful_codec = codec_name
                    print(f"Using codec: {codec_name}", flush=True)
                    break
                else:
                    out.release()
            except Exception:
                if out:
                    out.release()
                continue
        
        if not out or not out.isOpened():
            raise Exception("Failed to initialize video writer with any codec")
        
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Apply temporal variation to intensity
                frame_intensity = self.create_temporal_variation(
                    params["intensity"], 
                    params["temporal_variation"], 
                    frame_count, 
                    total_frames
                )
                
                # Apply effects based on mode
                processed_frame = frame.copy()
                
                if params["effect_mode"] in ["Halation", "Both"]:
                    processed_frame = self.apply_halation(
                        processed_frame, 
                        frame_intensity, 
                        params["radius"], 
                        params["threshold"], 
                        params["red_offset"]
                    )
                
                if params["effect_mode"] in ["Bloom", "Both"]:
                    processed_frame = self.apply_bloom(
                        processed_frame, 
                        frame_intensity * 0.5, 
                        params["radius"], 
                        params["threshold"]
                    )
                
                if params["chromatic_aberration"] > 0:
                    processed_frame = self.apply_chromatic_aberration(
                        processed_frame, 
                        params["chromatic_aberration"]
                    )
                
                # Write frame
                out.write(processed_frame)
                
                # Report progress (up to 80% for processing)
                frame_count += 1
                progress = int((frame_count / total_frames) * 80)
                print(f"PROGRESS:{progress}", flush=True)
                
        finally:
            cap.release()
            out.release()
        
        print("PROGRESS:85", flush=True)
        print("Post-processing video...", flush=True)
        
        # Try to optimize with FFmpeg
        if self.optimize_with_ffmpeg(temp_output, output_path):
            # Remove temporary file
            try:
                os.remove(temp_output)
            except:
                pass
            print("PROGRESS:95", flush=True)
        else:
            # Fall back to renaming the temp file
            try:
                os.rename(temp_output, output_path)
            except Exception as e:
                raise Exception(f"Failed to finalize output file: {e}")
            print("PROGRESS:95", flush=True)
        
        # Validate the final output
        if not self.validate_video(output_path):
            raise Exception("Generated video failed validation - file may be corrupted")
        
        print("PROGRESS:100", flush=True)
        print("COMPLETED", flush=True)


def main():
    if len(sys.argv) < 3:
        print("Usage: python halation_bloom_processor.py <input_video> <output_video> [params_json]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Parse parameters if provided
    params = None
    if len(sys.argv) > 3:
        try:
            params = json.loads(sys.argv[3])
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON parameters: {e}")
            sys.exit(1)
    
    # Validate input file
    if not os.path.exists(input_path):
        print(f"ERROR: Input file does not exist: {input_path}")
        sys.exit(1)
    
    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    processor = HalationBloomVideoProcessor()
    
    try:
        print("STARTING", flush=True)
        processor.process_video(input_path, output_path, params)
    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
