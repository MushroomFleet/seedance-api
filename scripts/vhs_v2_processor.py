#!/usr/bin/env python3
import numpy as np
import cv2
import sys
import json
import os
import subprocess
from scipy.signal import lfilter
from enum import Enum
import math

class VHSSpeed(Enum):
    VHS_SP = (2400000.0, 320000.0, 9)
    VHS_LP = (1900000.0, 300000.0, 12)
    VHS_EP = (1400000.0, 280000.0, 14)
    
    def __init__(self, luma_cut, chroma_cut, chroma_delay):
        self.luma_cut = luma_cut
        self.chroma_cut = chroma_cut
        self.chroma_delay = chroma_delay

class VHSv2VideoProcessor:
    def __init__(self):
        self.default_params = {
            "composite_preemphasis": 4.0,
            "vhs_out_sharpen": 2.5,
            "color_bleeding": 5.0,
            "video_noise": 1000.0,
            "chroma_noise": 5000.0,
            "chroma_phase_noise": 25.0,
            "enable_ringing": True,
            "ringing_power": 2,
            "tape_speed": "SP"
        }
        
        # Generate ring pattern for ringing effects
        self.ring_pattern = self.generate_ring_pattern()
        self.ntsc_rate = 315000000.00 / 88 * 4

    def generate_ring_pattern(self, size=720):
        """Generate a ring pattern for signal ringing artifacts"""
        x = np.linspace(0, 2*np.pi, size)
        pattern = np.sin(x * 4) * np.exp(-x/4)
        pattern = (pattern - pattern.min()) / (pattern.max() - pattern.min())
        pattern += 0.3 * np.sin(x * 8) * np.exp(-x/2)
        pattern = (pattern - pattern.min()) / (pattern.max() - pattern.min())
        return pattern.astype(np.float32)

    def bgr2yiq(self, bgrimg):
        """Convert BGR image to YIQ color space"""
        bgrimg_float = bgrimg.astype(np.float32)
        planar = np.transpose(bgrimg_float, (2, 0, 1))
        b, g, r = planar
        
        # Standard YIQ conversion matrix
        Y = 0.299 * r + 0.587 * g + 0.114 * b
        I = 0.596 * r - 0.274 * g - 0.322 * b
        Q = 0.211 * r - 0.523 * g + 0.312 * b
        
        return np.stack([Y, I, Q], axis=0)

    def yiq2bgr(self, yiq):
        """Convert YIQ color space back to BGR"""
        Y, I, Q = [ch.astype(np.float32) for ch in yiq]
        
        # Standard YIQ to RGB conversion matrix
        r = Y + 0.956 * I + 0.619 * Q
        g = Y - 0.272 * I - 0.647 * Q
        b = Y - 1.105 * I + 1.702 * Q
        
        rgb = np.stack([b, g, r], axis=2)
        return np.clip(rgb, 0, 255).astype(np.uint8)

    def apply_vhs_noise(self, yiq, noise_amount):
        """Apply VHS video noise to luminance channel"""
        Y, I, Q = yiq
        if noise_amount > 0:
            noise = np.random.normal(0, noise_amount/100, Y.shape).astype(np.float32)
            kernel_size = 3
            noise = cv2.GaussianBlur(noise, (kernel_size, kernel_size), 0)
            Y = Y + noise
        return np.stack([Y, I, Q])

    def apply_chroma_noise(self, yiq, noise_amount, phase_noise):
        """Apply chroma noise and phase noise to color channels"""
        Y, I, Q = [ch.astype(np.float32) for ch in yiq]
        
        if noise_amount > 0:
            noise_i = np.random.normal(0, noise_amount/100, I.shape).astype(np.float32)
            noise_q = np.random.normal(0, noise_amount/100, Q.shape).astype(np.float32)
            kernel_size = 3
            noise_i = cv2.GaussianBlur(noise_i, (kernel_size, kernel_size), 0)
            noise_q = cv2.GaussianBlur(noise_q, (kernel_size, kernel_size), 0)
            I += noise_i
            Q += noise_q
        
        if phase_noise > 0:
            angle = np.random.normal(0, phase_noise/10, I.shape) * np.pi / 180
            i_new = I * np.cos(angle) - Q * np.sin(angle)
            q_new = I * np.sin(angle) + Q * np.cos(angle)
            I, Q = i_new, q_new
        
        return np.stack([Y, I, Q])

    def apply_color_bleeding(self, yiq, amount):
        """Apply color bleeding effects"""
        Y, I, Q = [ch.astype(np.float32) for ch in yiq]
        
        if amount > 0:
            kernel_size = int(amount * 2) + 1
            kernel = np.ones(kernel_size) / kernel_size
            
            # Apply lfilter row by row for 2D arrays
            for row_idx in range(I.shape[0]):
                I[row_idx, :] = lfilter(kernel, 1, I[row_idx, :])
                Q[row_idx, :] = lfilter(kernel, 1, Q[row_idx, :])
            
            if kernel_size > 1:
                I = cv2.GaussianBlur(I, (1, kernel_size), 0)
                Q = cv2.GaussianBlur(Q, (1, kernel_size), 0)
        
        return np.stack([Y, I, Q])

    def apply_tape_speed_effects(self, yiq, speed):
        """Apply tape speed degradation effects"""
        Y, I, Q = [ch.astype(np.float32) for ch in yiq]
        
        kernel_size = {
            VHSSpeed.VHS_SP: 3,
            VHSSpeed.VHS_LP: 5,
            VHSSpeed.VHS_EP: 7
        }[speed]
        
        if kernel_size > 1:
            Y = cv2.GaussianBlur(Y, (kernel_size, 1), 0)
            I = cv2.GaussianBlur(I, (kernel_size, 1), 0)
            Q = cv2.GaussianBlur(Q, (kernel_size, 1), 0)
        
        return np.stack([Y, I, Q])

    def apply_ringing(self, yiq, power):
        """Apply signal ringing artifacts using FFT with proper DC preservation"""
        Y, I, Q = [ch.astype(np.float32) for ch in yiq]
        rows, cols = Y.shape
        
        for idx, channel in enumerate([Y, I, Q]):
            # Store original DC component (mean value)
            original_dc = np.mean(channel)
            
            dft = cv2.dft(channel, flags=cv2.DFT_COMPLEX_OUTPUT)
            dft_shift = np.fft.fftshift(dft)
            
            # Create mask with proper frequency distribution
            # The mask should represent frequency response, not spatial ringing
            center_y, center_x = rows // 2, cols // 2
            
            # Create frequency-based mask instead of spatial pattern
            y_coords, x_coords = np.ogrid[:rows, :cols]
            freq_dist = np.sqrt((y_coords - center_y)**2 + (x_coords - center_x)**2)
            
            # Normalize frequency distance
            max_freq = np.sqrt(center_y**2 + center_x**2)
            if max_freq > 0:
                freq_norm = freq_dist / max_freq
            else:
                freq_norm = np.zeros_like(freq_dist)
            
            # Apply ring pattern based on frequency distance
            pattern_size = len(self.ring_pattern)
            pattern_indices = np.clip((freq_norm * (pattern_size - 1)).astype(int), 0, pattern_size - 1)
            mask = self.ring_pattern[pattern_indices] ** power
            
            # Ensure DC component (center) is preserved
            mask[center_y, center_x] = 1.0
            
            # Apply mask to frequency domain
            dft_shift[:, :, 0] *= mask
            dft_shift[:, :, 1] *= mask
            
            # Convert back to spatial domain
            img_back = cv2.idft(np.fft.ifftshift(dft_shift), flags=cv2.DFT_SCALE)
            processed_channel = img_back[:, :, 0]
            
            # Restore original DC component to preserve brightness
            current_dc = np.mean(processed_channel)
            if current_dc != 0:
                dc_correction = original_dc / current_dc
                processed_channel = processed_channel * dc_correction
            
            if idx == 0:
                Y = processed_channel
            elif idx == 1:
                I = processed_channel
            else:
                Q = processed_channel
        
        return np.stack([Y, I, Q])

    def process_frame(self, frame, params):
        """Process a single frame with VHS v2 effects - exact match to original"""
        frame = frame.astype(np.float32)
        yiq = self.bgr2yiq(frame)
        
        if params["enable_ringing"]:
            yiq = self.apply_ringing(yiq, params["ringing_power"])
        
        yiq = self.apply_vhs_noise(yiq, params["video_noise"])
        yiq = self.apply_chroma_noise(yiq, params["chroma_noise"], params["chroma_phase_noise"])
        yiq = self.apply_color_bleeding(yiq, params["color_bleeding"])
        
        tape_speed = getattr(VHSSpeed, f"VHS_{params['tape_speed']}")
        yiq = self.apply_tape_speed_effects(yiq, tape_speed)
        
        result = self.yiq2bgr(yiq)
        
        if params["vhs_out_sharpen"] > 1.0:
            result = result.astype(np.float32)
            kernel_size = (3, 3)
            sigma = 1.0
            alpha = params["vhs_out_sharpen"]
            beta = -(alpha - 1.0)
            
            blurred = cv2.GaussianBlur(result, kernel_size, sigma)
            result = cv2.addWeighted(result, alpha, blurred, beta, 0)
        
        return np.clip(result, 0, 255).astype(np.uint8)

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
        """Process entire video with VHS v2 effects"""
        if params is None:
            params = self.default_params.copy()
        
        # Validate parameters
        for key, default_value in self.default_params.items():
            if key not in params:
                params[key] = default_value
        
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
        print(f"VHS v2 parameters: {params}", flush=True)
        
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
                
                # Process frame with VHS v2 effects
                processed_frame = self.process_frame(frame, params)
                
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
        print("Usage: python vhs_v2_processor.py <input_video> <output_video> [params_json]")
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
    
    processor = VHSv2VideoProcessor()
    
    try:
        print("STARTING", flush=True)
        processor.process_video(input_path, output_path, params)
    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
