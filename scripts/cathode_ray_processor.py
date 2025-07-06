#!/usr/bin/env python3
import numpy as np
import cv2
import sys
import json
import os
from math import sin, cos, tan, log, exp, sqrt, pi

class CathodeRayVideoProcessor:
    def __init__(self):
        self.default_params = {
            "preset": "static",
            "custom_expression": "sin(t/10) * 0.1 + 0.2",
            "screen_curvature": 0.2,
            "scanline_intensity": 0.3,
            "glow_amount": 0.2,
            "color_bleeding": 0.15,
            "noise_amount": 0.05
        }

    def create_time_variation(self, preset, custom_expr, frame_idx, total_frames):
        t = frame_idx  # Time variable for expressions
        
        if preset == "static":
            return 1.0
        elif preset == "fluctuating":
            return 0.8 + 0.2 * sin(t / 5)
        elif preset == "degraded":
            return max(0.5, 1.0 - t / (total_frames * 2))
        elif preset == "custom":
            try:
                return eval(custom_expr, {"sin": sin, "cos": cos, "tan": tan, "log": log, 
                                        "exp": exp, "sqrt": sqrt, "pi": pi, "t": t})
            except:
                return 1.0

    def apply_screen_curvature(self, image, amount):
        if amount <= 0:
            return image
            
        rows, cols = image.shape[:2]
        
        # Create displacement maps
        X, Y = np.meshgrid(np.linspace(-1, 1, cols), np.linspace(-1, 1, rows))
        R = np.sqrt(X**2 + Y**2)
        displacement = (1 + amount * R**2)
        
        map_x = cols/2 + (X * cols/2) / displacement
        map_y = rows/2 + (Y * rows/2) / displacement
        
        return cv2.remap(image, map_x.astype(np.float32), map_y.astype(np.float32), 
                        cv2.INTER_LINEAR)

    def apply_scanlines(self, image, intensity, variation):
        if intensity <= 0:
            return image
            
        height = image.shape[0]
        scanline_pattern = np.ones((height, 1, 1))
        scanline_pattern[::2] = 1.0 - (intensity * variation)
        return (image * scanline_pattern).astype(np.uint8)

    def apply_glow(self, image, amount, variation):
        if amount <= 0:
            return image
            
        blur_size = int(31 * amount * variation)
        if blur_size % 2 == 0:
            blur_size += 1
        if blur_size < 3:
            blur_size = 3
            
        return cv2.GaussianBlur(image, (blur_size, blur_size), 0)

    def apply_color_bleeding(self, image, amount, variation):
        if amount <= 0:
            return image
            
        kernel_size = int(max(3, 15 * amount * variation))
        if kernel_size % 2 == 0:
            kernel_size += 1
            
        kernel = np.zeros((kernel_size, 1))
        kernel[:kernel_size//2 + 1, 0] = np.linspace(1, 0, kernel_size//2 + 1)
        kernel = kernel / kernel.sum()
        
        channels = cv2.split(image)
        result_channels = []
        
        for i, channel in enumerate(channels):
            shifted_kernel = np.roll(kernel, i - 1, axis=0)
            result_channels.append(cv2.filter2D(channel, -1, shifted_kernel))
            
        return cv2.merge(result_channels)

    def apply_noise(self, image, amount, variation):
        if amount <= 0:
            return image
            
        noise = np.random.normal(0, amount * variation * 255, image.shape)
        return np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)

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
        
        # Create output video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Calculate time-based variation
                variation = self.create_time_variation(
                    params["preset"], 
                    params["custom_expression"], 
                    frame_count, 
                    total_frames
                )
                
                # Apply effects in order
                processed_frame = frame.copy()
                
                # Screen curvature
                processed_frame = self.apply_screen_curvature(
                    processed_frame, 
                    params["screen_curvature"] * variation
                )
                
                # Glow effect
                processed_frame = self.apply_glow(
                    processed_frame, 
                    params["glow_amount"], 
                    variation
                )
                
                # Color bleeding
                processed_frame = self.apply_color_bleeding(
                    processed_frame, 
                    params["color_bleeding"], 
                    variation
                )
                
                # Noise
                processed_frame = self.apply_noise(
                    processed_frame, 
                    params["noise_amount"], 
                    variation
                )
                
                # Scanlines (applied last)
                processed_frame = self.apply_scanlines(
                    processed_frame, 
                    params["scanline_intensity"], 
                    variation
                )
                
                # Write frame
                out.write(processed_frame)
                
                # Report progress
                frame_count += 1
                progress = int((frame_count / total_frames) * 100)
                print(f"PROGRESS:{progress}", flush=True)
                
        finally:
            cap.release()
            out.release()
        
        print("COMPLETED", flush=True)


def main():
    if len(sys.argv) < 3:
        print("Usage: python cathode_ray_processor.py <input_video> <output_video> [params_json]")
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
    
    processor = CathodeRayVideoProcessor()
    
    try:
        print("STARTING", flush=True)
        processor.process_video(input_path, output_path, params)
    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
