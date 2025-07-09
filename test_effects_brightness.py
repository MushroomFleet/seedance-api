import numpy as np
import cv2
import sys
import os
sys.path.append('scripts')
from vhs_v2_processor import VHSv2VideoProcessor

# Test each effect individually to identify brightness loss
def test_individual_effects():
    processor = VHSv2VideoProcessor()
    
    # Create a test image (uniform gray)
    test_img = np.full((100, 100, 3), 128, dtype=np.uint8)  # Mid-gray
    print(f"Original test image brightness: {np.mean(test_img):.2f}")
    
    # Test parameters with minimal effects
    minimal_params = {
        "composite_preemphasis": 4.0,
        "vhs_out_sharpen": 1.0,  # Disabled
        "color_bleeding": 0.0,   # Disabled
        "video_noise": 0.0,      # Disabled
        "chroma_noise": 0.0,     # Disabled
        "chroma_phase_noise": 0.0, # Disabled
        "enable_ringing": False, # Disabled
        "ringing_power": 2,
        "tape_speed": "SP"
    }
    
    # Test each effect individually
    effects_to_test = [
        ("baseline", {}),
        ("ringing", {"enable_ringing": True}),
        ("video_noise", {"video_noise": 1000.0}),
        ("chroma_noise", {"chroma_noise": 5000.0}),
        ("chroma_phase_noise", {"chroma_phase_noise": 25.0}),
        ("color_bleeding", {"color_bleeding": 5.0}),
        ("sharpening", {"vhs_out_sharpen": 2.5}),
    ]
    
    print("\n=== Individual Effect Brightness Tests ===")
    
    for effect_name, effect_params in effects_to_test:
        test_params = minimal_params.copy()
        test_params.update(effect_params)
        
        try:
            result = processor.process_frame(test_img, test_params)
            brightness = np.mean(result)
            retention = (brightness / np.mean(test_img)) * 100
            print(f"{effect_name:15}: {brightness:6.2f} ({retention:5.1f}%)")
            
            if retention < 95:
                print(f"  ⚠️  Significant brightness loss in {effect_name}")
        except Exception as e:
            print(f"{effect_name:15}: ERROR - {e}")

if __name__ == "__main__":
    test_individual_effects()
