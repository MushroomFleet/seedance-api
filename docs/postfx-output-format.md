# PostFX Output Format Requirements

## Overview

This document outlines the required video output format standards for all PostFX processing scripts to ensure browser compatibility, proper thumbnail generation, and optimal streaming performance.

## Problem Background

### Original Issue
The initial cathode ray processor used OpenCV's `mp4v` codec, which caused:
- **Browser Compatibility Issues**: `mp4v` (MPEG-4 Part 2) has poor support in modern browsers
- **Thumbnail Generation Failures**: Video metadata issues prevented HTML5 video element from loading frames
- **Streaming Problems**: Missing `faststart` flag caused poor web streaming performance
- **Console Errors**: Empty error objects due to malformed video files

### Root Cause
- OpenCV's VideoWriter with `mp4v` creates videos with incomplete/malformed metadata
- Missing H.264 encoding for modern browser compatibility
- No optimization for web streaming (moov atom positioning)

## Required Implementation Standards

### 1. Multi-Codec Fallback Strategy

All PostFX scripts must implement codec fallback in this priority order:

```python
codecs_to_try = [
    ('H264', cv2.VideoWriter_fourcc(*'H264')),    # Best compatibility
    ('MJPG', cv2.VideoWriter_fourcc(*'MJPG')),    # Fallback option
    ('XVID', cv2.VideoWriter_fourcc(*'XVID')),    # Legacy support
    ('mp4v', cv2.VideoWriter_fourcc(*'mp4v'))     # Last resort
]
```

### 2. FFmpeg Post-Processing (Required)

After OpenCV processing, all videos must be re-encoded with FFmpeg using these parameters:

```bash
ffmpeg -y \
  -i input.mp4 \
  -c:v libx264 \              # H.264 video codec
  -preset medium \            # Encoding speed vs compression balance
  -crf 23 \                   # Constant Rate Factor (quality)
  -pix_fmt yuv420p \          # Browser-compatible pixel format
  -movflags +faststart \      # Move metadata to front for streaming
  -max_muxing_queue_size 1024 \ # Handle frame timing issues
  output.mp4
```

### 3. Video Validation

All scripts must validate output before completion:

```python
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
```

### 4. Progress Reporting Standards

Progress reporting must follow this pattern:

```python
# Processing phase: 0-80%
frame_progress = int((frame_count / total_frames) * 80)
print(f"PROGRESS:{frame_progress}", flush=True)

# Post-processing phase: 85-95%
print("PROGRESS:85", flush=True)
print("Post-processing video...", flush=True)
# ... FFmpeg processing ...
print("PROGRESS:95", flush=True)

# Validation phase: 100%
print("PROGRESS:100", flush=True)
print("COMPLETED", flush=True)
```

## Implementation Template

### Core Processing Function

```python
def process_video(self, input_path, output_path, params=None):
    # 1. Open and validate input
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise Exception(f"Failed to open input video: {input_path}")
    
    # 2. Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # 3. Create temporary output with codec fallback
    temp_output = output_path.replace('.mp4', '_temp.mp4')
    out = self._initialize_video_writer(temp_output, fps, width, height)
    
    # 4. Process frames with progress reporting
    frame_count = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Apply effects here
            processed_frame = self.apply_effects(frame, params, frame_count)
            out.write(processed_frame)
            
            # Report progress (0-80%)
            frame_count += 1
            progress = int((frame_count / total_frames) * 80)
            print(f"PROGRESS:{progress}", flush=True)
    finally:
        cap.release()
        out.release()
    
    # 5. Post-process with FFmpeg
    print("PROGRESS:85", flush=True)
    if not self.optimize_with_ffmpeg(temp_output, output_path):
        raise Exception("FFmpeg optimization failed")
    
    # 6. Validate output
    print("PROGRESS:95", flush=True)
    if not self.validate_video(output_path):
        raise Exception("Generated video failed validation")
    
    print("PROGRESS:100", flush=True)
    print("COMPLETED", flush=True)
```

### FFmpeg Integration

```python
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
```

## File Naming Conventions

### Input/Output Patterns
- **Temporary files**: `{original_name}_temp.mp4`
- **Final output**: `{original_name}_{effect_name}_{timestamp}.mp4`
- **Timestamp format**: `YYYY-MM-DDTHH-MM-SS-sssZ`

### Example
```
Input:  video_source.mp4
Temp:   video_source_cathode-ray_2025-01-07T12-30-45-123Z_temp.mp4
Output: video_source_cathode-ray_2025-01-07T12-30-45-123Z.mp4
```

## Error Handling Standards

### Required Error Cases
1. **Input validation failure**
2. **Codec initialization failure**
3. **Frame processing errors**
4. **FFmpeg execution failure**
5. **Output validation failure**

### Error Message Format
```python
try:
    # Processing code
except Exception as e:
    print(f"ERROR: {str(e)}", flush=True)
    sys.exit(1)
```

## Testing Requirements

### Browser Compatibility Test
All processed videos must:
1. Load successfully in Chrome, Firefox, Safari, Edge
2. Generate thumbnails via HTML5 video element
3. Stream without buffering delays
4. Support seeking operations

### Validation Checklist
- [ ] Video file opens in media players
- [ ] HTML5 video element can load metadata
- [ ] Thumbnail generation works in browser
- [ ] File size is reasonable (< 2x original)
- [ ] Audio track preserved (if present)
- [ ] Video duration matches original

## Future Effect Script Requirements

When creating new PostFX scripts (particle systems, color grading, etc.), ensure:

1. **Import required modules**: `cv2`, `subprocess`, `os`
2. **Implement codec fallback**: Use the standard codec priority list
3. **Add FFmpeg optimization**: Always post-process with web-compatible settings
4. **Include validation**: Verify output before completion
5. **Follow progress reporting**: Use standardized progress messages
6. **Handle errors gracefully**: Provide meaningful error messages

## Performance Guidelines

### Optimization Tips
- Process frames in batches when possible
- Use efficient numpy operations
- Minimize memory allocations in frame loops
- Report progress every 10-50 frames (not every frame)

### Resource Limits
- Maximum processing time: 5 minutes per video
- Memory usage: < 2GB during processing
- Temporary file cleanup: Always remove temp files

## Dependencies

### Required System Dependencies
```bash
# OpenCV with video support
pip install opencv-python

# FFmpeg (system installation required)
# Windows: Download from https://ffmpeg.org/
# Linux: apt-get install ffmpeg
# macOS: brew install ffmpeg
```

### Verification Script
```python
def verify_dependencies():
    """Verify all required dependencies are available"""
    try:
        import cv2
        import subprocess
        
        # Test FFmpeg availability
        subprocess.run(['ffmpeg', '-version'], 
                      capture_output=True, check=True)
        
        print("All dependencies verified")
        return True
    except Exception as e:
        print(f"Dependency check failed: {e}")
        return False
```

---

## Version History

- **v1.0** (2025-01-07): Initial documentation based on cathode ray processor fixes
- **v1.1** (Future): Updates for additional effect types

---

*This document should be updated whenever new PostFX processing requirements are discovered or when adding support for new effect types.*
