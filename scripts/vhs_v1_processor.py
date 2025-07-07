#!/usr/bin/env python3
import numpy as np
import cv2
import sys
import json
import os
import subprocess
import random
from math import sin, cos, tan, log, exp, sqrt, pi

class VHSv1VideoProcessor:
    def __init__(self):
        self.default_params = {
            "luma_compression_rate": 1.0,
            "luma_noise_sigma": 30.0,
            "luma_noise_mean": 0.0,
            "chroma_compression_rate": 1.0,
            "chroma_noise_intensity": 10.0,
            "vertical_blur": 1,
            "horizontal_blur": 1,
            "border_size": 1.7,
            "generations": 3
        }

    def add_noise(self, image, mean=0, sigma=30):
        height, width, channels = image.shape
        gaussian_noise = np.random.normal(mean, sigma, (height, width, channels))
        noisy_image = np.clip(image + gaussian_noise, 0, 255).astype(np.uint8)
        return noisy_image

    def add_chroma_noise(self, image, intensity=10):
        height, width = image.shape[:2]
        noise_red = np.random.randint(-intensity, intensity, (height, width), dtype=np.int16)
        noise_green = np.random.randint(-intensity, intensity, (height, width), dtype=np.int16)
        noise_blue = np.random.randint(-intensity, intensity, (height, width), dtype=np.int16)
        
        image = image.copy()
        image[:, :, 0] = np.clip(image[:, :, 0] + noise_blue, 0, 255)
        image[:, :, 1] = np.clip(image[:, :, 1] + noise_green, 0, 255)
        image[:, :, 2] = np.clip(image[:, :, 2] + noise_red, 0, 255)
        return np.uint8(image)

    def cut_black_line_border(self, image, border_size):
        h, w, _ = image.shape
        line_width = int(w * (border_size / 100))
        if line_width > 0:
            image[:, -1 * line_width:] = 0
        return image

    def compress_luma(self, image, compression_rate, noise_mean, noise_sigma, border_size):
        height, width = image.shape[:2]
        compressed = cv2.resize(image, 
                              (int(width / compression_rate), height),
                              interpolation=cv2.INTER_LANCZOS4)
        noisy = self.add_noise(compressed, noise_mean, noise_sigma)
        restored = cv2.resize(noisy, (width, height),
                            interpolation=cv2.INTER_LANCZOS4)
        return self.cut_black_line_border(restored, border_size)

    def compress_chroma(self, image, compression_rate, noise_intensity, border_size):
        height, width = image.shape[:2]
        compressed = cv2.resize(image,
                              (int(width / compression_rate), height),
                              interpolation=cv2.INTER_LANCZOS4)
        noisy = self.add_chroma_noise(compressed, noise_intensity)
        restored = cv2.resize(noisy, (width, height),
                            interpolation=cv2.INTER_LANCZOS4)
        return self.cut_black_line_border(restored, border_size)

    def apply_waves(self, img, intensity=1.0):
        rows, cols = img.shape[:2]
        i, j = np.indices((rows, cols))
        waves = np.random.uniform(0.000, 1.110) * intensity
        offset_x = (waves * np.sin(250 * 2 * np.pi * i / (2 * cols))).astype(int)
        offset_j = np.clip(j + offset_x, 0, cols - 1)
        return img[i, offset_j]

    def apply_switch_noise(self, img):
        rows, cols = img.shape[:2]
        i, j = np.indices((rows, cols))
        waves = np.random.uniform(1.900, 1.910)
        offset_x = (waves * np.sin(np.cos(250) * 2 * np.pi * i / (2 * cols))).astype(int)
        offset_j = np.clip(j + (offset_x * np.random.randint(20, 30)), 0, cols - 1)
        return img[i, offset_j]

    def sharpen_image(self, image, kernel_size=(5, 5), sigma=100, alpha=1.5, beta=-0.5):
        blurred = cv2.GaussianBlur(image, kernel_size, sigma)
        sharpened = cv2.addWeighted(image, alpha, blurred, beta, 0)
        return np.clip(sharpened, 0, 255).astype(np.uint8)

    def process_frame(self, image, params):
        # Convert to YCrCb color space
        image_ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        
        # Apply effects to luminance and chrominance separately
        luma_compressed = self.compress_luma(
            image_ycrcb, 
            params["luma_compression_rate"],
            params["luma_noise_mean"],
            params["luma_noise_sigma"],
            params["border_size"]
        )
        
        chroma_compressed = self.compress_chroma(
            image_ycrcb,
            params["chroma_compression_rate"],
            params["chroma_noise_intensity"],
            params["border_size"]
        )
        
        # Apply wave effects
        chroma_compressed = self.apply_waves(chroma_compressed)
        chroma_compressed = self.apply_waves(chroma_compressed)
        
        # Merge processed layers - handle dimension mismatch
        if len(chroma_compressed.shape) == 3 and chroma_compressed.shape[2] >= 3:
            chrominance_layer = chroma_compressed[:, :, 1:3]
        else:
            chrominance_layer = chroma_compressed[:, :, 1:]
        
        # Ensure proper channel merging
        luma_channel = luma_compressed[:, :, 0]
        merged_ycrcb = cv2.merge([luma_channel, chrominance_layer[:, :, 0], chrominance_layer[:, :, 1]])
        
        # Convert back to BGR
        result = cv2.cvtColor(merged_ycrcb, cv2.COLOR_YCrCb2BGR)
        
        # Apply final effects
        result = cv2.blur(result, (params["horizontal_blur"], params["vertical_blur"]))
        result = self.sharpen_image(result)
        
        return result

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
        
        # Ensure blur values are odd
        params["vertical_blur"] = params["vertical_blur"] if params["vertical_blur"] % 2 == 1 else params["vertical_blur"] + 1
        params["horizontal_blur"] = params["horizontal_blur"] if params["horizontal_blur"] % 2 == 1 else params["horizontal_blur"] + 1
        
        # Scale noise parameters by generations
        params["luma_noise_sigma"] = params["luma_noise_sigma"] * params["generations"]
        params["luma_noise_mean"] = params["luma_noise_mean"] * params["generations"]
        params["chroma_noise_intensity"] = params["chroma_noise_intensity"] * params["generations"]
        
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
                
                # Apply VHS effects
                processed_frame = frame.copy()
                
                # Apply switch noise first
                processed_frame = self.apply_switch_noise(processed_frame)
                
                # Process frame with VHS effects
                processed_frame = self.process_frame(processed_frame, params)
                
                # Apply additional wave effects
                processed_frame = self.apply_waves(processed_frame)
                processed_frame = self.apply_waves(processed_frame, 1.1)
                
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
        print("Usage: python vhs_v1_processor.py <input_video> <output_video> [params_json]")
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
    
    processor = VHSv1VideoProcessor()
    
    try:
        print("STARTING", flush=True)
        processor.process_video(input_path, output_path, params)
    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
