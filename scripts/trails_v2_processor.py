#!/usr/bin/env python3
"""
Video Trails v2 Effect Processor
Enhanced motion trails with per-channel processing, color bleeding, and exponential decay
"""

import sys
import os
import subprocess
import cv2
import numpy as np
import json

class TrailsV2Processor:
    def __init__(self):
        """Initialize the Trails v2 processor."""
        pass

    def detect_motion_v2(self, current, previous, threshold):
        """
        Detect motion using frame differencing with per-channel processing
        for more authentic color bleeding effects
        """
        # Convert to uint8 for CV2 operations
        curr_frame = (current * 255).astype(np.uint8)
        prev_frame = (previous * 255).astype(np.uint8)
        
        # Calculate difference for each channel separately
        diff_r = cv2.absdiff(curr_frame[..., 0], prev_frame[..., 0])
        diff_g = cv2.absdiff(curr_frame[..., 1], prev_frame[..., 1])
        diff_b = cv2.absdiff(curr_frame[..., 2], prev_frame[..., 2])
        
        # Apply threshold to each channel
        thresh = int(threshold * 255)
        mask_r = (diff_r > thresh).astype(np.float32)
        mask_g = (diff_g > thresh).astype(np.float32)
        mask_b = (diff_b > thresh).astype(np.float32)
        
        return np.stack([mask_r, mask_g, mask_b], axis=-1)

    def apply_gaussian_blur(self, image, strength):
        """Apply Gaussian blur with adjustable strength"""
        if strength <= 0:
            return image
            
        kernel_size = max(3, int(strength * 10) | 1)  # Ensure odd number
        sigma = strength * 2
        
        blurred = cv2.GaussianBlur(
            (image * 255).astype(np.uint8),
            (kernel_size, kernel_size),
            sigma
        )
        return blurred.astype(np.float32) / 255.0

    def apply_color_bleed(self, image, amount):
        """Apply color bleeding effect by slightly offsetting color channels"""
        if amount <= 0:
            return image
            
        offset = int(amount * 4)
        if offset == 0:
            return image
            
        height, width = image.shape[:2]
        result = np.zeros_like(image)
        
        # Offset red channel slightly right
        result[..., 0] = np.roll(image[..., 0], offset, axis=1)
        # Keep green channel centered
        result[..., 1] = image[..., 1]
        # Offset blue channel slightly left
        result[..., 2] = np.roll(image[..., 2], -offset, axis=1)
        
        # Handle edges
        result[:, :offset, 0] = image[:, :offset, 0]
        result[:, -offset:, 2] = image[:, -offset:, 2]
        
        return result

    def _initialize_video_writer(self, output_path, fps, width, height):
        """Initialize video writer with codec fallback strategy."""
        codecs_to_try = [
            ('H264', cv2.VideoWriter_fourcc(*'H264')),
            ('MJPG', cv2.VideoWriter_fourcc(*'MJPG')),
            ('XVID', cv2.VideoWriter_fourcc(*'XVID')),
            ('mp4v', cv2.VideoWriter_fourcc(*'mp4v'))
        ]

        for codec_name, fourcc in codecs_to_try:
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            if out.isOpened():
                print(f"Using {codec_name} codec for video encoding", flush=True)
                return out
            out.release()

        raise Exception("Failed to initialize video writer with any codec")

    def optimize_with_ffmpeg(self, input_path, output_path):
        """Use FFmpeg to create a web-optimized MP4 file."""
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

    def validate_video(self, video_path):
        """Validate that the video file is properly formatted and readable."""
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

    def process_video(self, input_path, output_path, params=None):
        """Process entire video with Trails v2 effects."""
        if params is None:
            params = {
                "trail_strength": 0.85,
                "decay_rate": 0.15,
                "color_bleed": 0.3,
                "blur_amount": 0.5,
                "threshold": 0.1
            }

        print(f"Processing video with Trails v2 effect", flush=True)

        # Open input video
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise Exception(f"Failed to open input video: {input_path}")

        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        print(f"Video properties: {width}x{height}, {fps} FPS, {total_frames} frames", flush=True)

        # Create temporary output file
        temp_output = output_path.replace('.mp4', '_temp.mp4')
        out = self._initialize_video_writer(temp_output, fps, width, height)

        # Initialize trail buffer
        trail_buffer = None
        previous_frame = None

        frame_count = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Convert BGR to RGB and normalize to 0-1
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

                # Apply initial gaussian blur if enabled
                if params.get("blur_amount", 0) > 0:
                    frame_rgb = self.apply_gaussian_blur(frame_rgb, params["blur_amount"])

                # For frames after the first one, process trails
                if frame_count > 0 and previous_frame is not None:
                    # Detect motion between frames
                    motion_mask = self.detect_motion_v2(
                        frame_rgb,
                        previous_frame,
                        params.get("threshold", 0.1)
                    )
                    
                    # Apply exponential decay to existing trails
                    trail_buffer *= np.exp(-params.get("decay_rate", 0.15))
                    
                    # Update trail buffer based on motion
                    trail_buffer = np.where(
                        motion_mask > 0,
                        # Where motion is detected, add new trails
                        frame_rgb + trail_buffer * params.get("trail_strength", 0.85),
                        # Where no motion, just keep decaying trails
                        trail_buffer
                    )
                    
                    # Apply color bleeding effect
                    if params.get("color_bleed", 0) > 0:
                        trail_buffer = self.apply_color_bleed(trail_buffer, params["color_bleed"])
                else:
                    # For first frame, initialize trail buffer
                    trail_buffer = frame_rgb.copy()

                # Ensure values stay in valid range
                trail_buffer = np.clip(trail_buffer, 0, 1)

                # Convert back to BGR for video writer
                processed_bgr = cv2.cvtColor((trail_buffer * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
                out.write(processed_bgr)

                # Store current frame for next iteration
                previous_frame = frame_rgb.copy()

                frame_count += 1
                
                # Report progress (0-80%)
                progress = int((frame_count / total_frames) * 80)
                print(f"PROGRESS:{progress}", flush=True)

                if frame_count % 30 == 0:  # Log every 30 frames
                    print(f"Processed {frame_count}/{total_frames} frames", flush=True)

        finally:
            cap.release()
            out.release()

        # Post-process with FFmpeg
        print("PROGRESS:85", flush=True)
        print("Post-processing video with FFmpeg...", flush=True)
        success = self.optimize_with_ffmpeg(temp_output, output_path)
        
        if success:
            print("FFmpeg optimization completed", flush=True)
        
        print("PROGRESS:95", flush=True)

        # Validate output
        if not self.validate_video(output_path):
            raise Exception("Generated video failed validation")

        print("PROGRESS:100", flush=True)
        print("COMPLETED", flush=True)

        return output_path

def main():
    if len(sys.argv) < 3:
        print("Usage: python trails_v2_processor.py <input_video> <output_video> [params_json]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Parse parameters if provided
    params = None
    if len(sys.argv) > 3:
        try:
            params = json.loads(sys.argv[3])
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON parameters: {e}", flush=True)
            sys.exit(1)
    
    # Validate input file
    if not os.path.exists(input_path):
        print(f"ERROR: Input file does not exist: {input_path}", flush=True)
        sys.exit(1)
    
    # Create output directory if needed
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    try:
        print("STARTING", flush=True)
        
        # Initialize processor
        processor = TrailsV2Processor()

        # Process video
        result_path = processor.process_video(input_path, output_path, params)
        
        print(f"Trails v2 processing completed: {result_path}", flush=True)

    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
