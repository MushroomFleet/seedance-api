#!/usr/bin/env python3
"""
GSL Filter v1 Video Processor
Advanced shader-based effects including edge detection, pixelation, and wave distortions
Uses OpenGL shaders via moderngl for GPU-accelerated processing
"""

import sys
import os
import subprocess
import cv2
import numpy as np
import moderngl
from PIL import Image
import json

class GSLv1Processor:
    def __init__(self):
        """Initialize the GSL v1 processor with OpenGL context and shaders."""
        try:
            self.ctx = moderngl.create_standalone_context()
            self.setup_shaders()
        except Exception as e:
            raise Exception(f"Failed to initialize OpenGL context: {e}")

    def setup_shaders(self):
        """Set up OpenGL shaders for GSL effects."""
        # Basic vertex shader
        vertex_shader = '''
            #version 330
            in vec2 position;
            in vec2 texcoord;
            out vec2 uv;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
                uv = texcoord;
            }
        '''

        # Fragment shader with multiple effects
        fragment_shader = '''
            #version 330
            uniform sampler2D image;
            uniform int effect_type;
            uniform float intensity;
            uniform float blur_radius;
            uniform float edge_threshold;
            uniform int pixelate_factor;
            uniform float wave_amplitude;
            uniform float wave_frequency;
            uniform float chromatic_shift;
            uniform vec2 resolution;
            
            in vec2 uv;
            out vec4 fragColor;

            vec4 apply_grayscale() {
                vec4 color = texture(image, uv);
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                return mix(color, vec4(gray), intensity);
            }

            vec4 apply_edge_detection() {
                vec2 pixel = 1.0 / resolution;
                vec4 h = (
                    texture(image, uv + pixel * vec2(-1, 0)) * -1.0 +
                    texture(image, uv + pixel * vec2(1, 0)) * 1.0
                );
                vec4 v = (
                    texture(image, uv + pixel * vec2(0, -1)) * -1.0 +
                    texture(image, uv + pixel * vec2(0, 1)) * 1.0
                );
                float edge = length(h.rgb) + length(v.rgb);
                return vec4(vec3(edge > edge_threshold ? 1.0 : 0.0), 1.0);
            }

            vec4 apply_gaussian_blur() {
                vec4 color = vec4(0.0);
                vec2 pixel = 1.0 / resolution;
                float total_weight = 0.0;
                
                for(float x = -blur_radius; x <= blur_radius; x++) {
                    for(float y = -blur_radius; y <= blur_radius; y++) {
                        vec2 offset = vec2(x, y) * pixel;
                        float weight = exp(-(x*x + y*y) / (2.0 * blur_radius * blur_radius));
                        color += texture(image, uv + offset) * weight;
                        total_weight += weight;
                    }
                }
                
                return color / total_weight;
            }

            vec4 apply_pixelate() {
                vec2 pixel = vec2(pixelate_factor) / resolution;
                vec2 coord = floor(uv / pixel) * pixel;
                return texture(image, coord);
            }

            vec4 apply_wave_distortion() {
                vec2 offset = vec2(
                    sin(uv.y * wave_frequency) * wave_amplitude,
                    sin(uv.x * wave_frequency) * wave_amplitude
                );
                return texture(image, uv + offset);
            }

            vec4 apply_chromatic_aberration() {
                vec4 color;
                color.r = texture(image, uv + vec2(chromatic_shift, 0.0)).r;
                color.g = texture(image, uv).g;
                color.b = texture(image, uv - vec2(chromatic_shift, 0.0)).b;
                color.a = 1.0;
                return color;
            }

            void main() {
                switch(effect_type) {
                    case 0: fragColor = texture(image, uv); break;  // custom/bypass
                    case 1: fragColor = apply_grayscale(); break;
                    case 2: fragColor = apply_edge_detection(); break;
                    case 3: fragColor = apply_gaussian_blur(); break;
                    case 4: fragColor = apply_pixelate(); break;
                    case 5: fragColor = apply_wave_distortion(); break;
                    case 6: fragColor = apply_chromatic_aberration(); break;
                    default: fragColor = texture(image, uv);
                }
            }
        '''

        # Create shader program
        self.program = self.ctx.program(
            vertex_shader=vertex_shader,
            fragment_shader=fragment_shader
        )

        # Set up vertex data for a fullscreen quad
        vertices = np.array([
            # positions   texture coords
            -1.0, -1.0,   0.0, 0.0,
             1.0, -1.0,   1.0, 0.0,
             1.0,  1.0,   1.0, 1.0,
            -1.0,  1.0,   0.0, 1.0,
        ], dtype='f4')
        
        indices = np.array([0, 1, 2, 0, 2, 3], dtype='i4')
        
        self.vbo = self.ctx.buffer(vertices.tobytes())
        self.ibo = self.ctx.buffer(indices.tobytes())
        self.vao = self.ctx.vertex_array(
            self.program,
            [
                (self.vbo, '2f 2f', 'position', 'texcoord'),
            ],
            self.ibo
        )

    def process_frame(self, frame, effect_type, params):
        """Process a single frame using OpenGL shaders."""
        try:
            # Ensure frame is in RGBA format
            if frame.shape[2] == 3:
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2RGBA)
            
            height, width = frame.shape[:2]
            
            # Create texture from frame
            texture = self.ctx.texture((width, height), 4, frame.tobytes())
            texture.use(0)

            # Create framebuffer for output
            fbo = self.ctx.framebuffer(
                color_attachments=[self.ctx.texture((width, height), 4)]
            )
            fbo.use()

            # Set shader uniforms
            self.program['image'] = 0
            self.program['effect_type'] = effect_type
            self.program['resolution'] = (width, height)
            
            # Set effect parameters
            for param_name, value in params.items():
                if param_name in self.program:
                    self.program[param_name] = value

            # Render fullscreen quad
            self.ctx.viewport = (0, 0, width, height)
            self.vao.render()

            # Read result back from GPU
            data = fbo.read(components=4)
            result = np.frombuffer(data, dtype=np.uint8).reshape((height, width, 4))
            
            # Convert back to RGB if needed
            if result.shape[2] == 4:
                result = cv2.cvtColor(result, cv2.COLOR_RGBA2RGB)

            # Clean up GPU resources
            fbo.release()
            texture.release()

            return result

        except Exception as e:
            raise Exception(f"Frame processing failed: {e}")

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
        """Process entire video with GSL v1 effects."""
        if params is None:
            params = {
                "effect_preset": "custom",
                "intensity": 1.0,
                "blur_radius": 2.0,
                "edge_threshold": 0.1,
                "pixelate_factor": 4,
                "wave_amplitude": 0.1,
                "wave_frequency": 5.0,
                "chromatic_shift": 0.01
            }

        # Map effect preset to effect type
        effect_map = {
            "custom": 4,  # Default to pixelate for custom mode
            "grayscale": 1,
            "edge_detection": 2,
            "gaussian_blur": 3,
            "pixelate": 4,
            "wave_distortion": 5,
            "chromatic_aberration": 6
        }
        effect_type = effect_map.get(params.get("effect_preset", "custom"), 4)

        # Prepare shader parameters
        shader_params = {
            "intensity": params.get("intensity", 1.0),
            "blur_radius": params.get("blur_radius", 2.0),
            "edge_threshold": params.get("edge_threshold", 0.1),
            "pixelate_factor": params.get("pixelate_factor", 4),
            "wave_amplitude": params.get("wave_amplitude", 0.1),
            "wave_frequency": params.get("wave_frequency", 5.0),
            "chromatic_shift": params.get("chromatic_shift", 0.01)
        }

        print(f"Processing video with GSL v1 effect: {params.get('effect_preset', 'custom')}", flush=True)

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

        frame_count = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Process frame with OpenGL shaders
                processed_frame = self.process_frame(frame_rgb, effect_type, shader_params)

                # Convert back to BGR for video writer
                processed_bgr = cv2.cvtColor(processed_frame, cv2.COLOR_RGB2BGR)
                out.write(processed_bgr)

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

    def __del__(self):
        """Clean up OpenGL resources."""
        if hasattr(self, 'ctx'):
            try:
                self.ctx.release()
            except:
                pass

def main():
    if len(sys.argv) < 3:
        print("Usage: python gsl_v1_processor.py <input_video> <output_video> [params_json]")
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
        processor = GSLv1Processor()

        # Process video
        result_path = processor.process_video(input_path, output_path, params)
        
        print(f"GSL v1 processing completed: {result_path}", flush=True)

    except Exception as e:
        print(f"ERROR: {str(e)}", flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
