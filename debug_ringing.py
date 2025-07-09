import numpy as np
import cv2
import sys
sys.path.append('scripts')
from vhs_v2_processor import VHSv2VideoProcessor

def debug_ringing():
    processor = VHSv2VideoProcessor()
    
    # Create a simple test case
    test_img = np.full((50, 50, 3), 128, dtype=np.uint8)
    
    print("=== Debugging Ringing Effect ===")
    print(f"Original brightness: {np.mean(test_img):.2f}")
    
    # Test YIQ conversion alone
    yiq = processor.bgr2yiq(test_img.astype(np.float32))
    print(f"YIQ Y channel mean: {np.mean(yiq[0]):.2f}")
    
    # Test ringing application
    Y, I, Q = [ch.astype(np.float32) for ch in yiq]
    print(f"Before ringing - Y mean: {np.mean(Y):.2f}")
    
    # Check ring pattern
    print(f"Ring pattern shape: {processor.ring_pattern.shape}")
    print(f"Ring pattern range: {processor.ring_pattern.min():.3f} to {processor.ring_pattern.max():.3f}")
    print(f"Ring pattern mean: {np.mean(processor.ring_pattern):.3f}")
    
    # Test with ringing power 2
    power = 2
    mask = np.reshape(processor.ring_pattern ** power, (1, -1))
    mask = cv2.resize(mask, (Y.shape[1], 1))
    mask = np.repeat(mask, Y.shape[0], axis=0)
    
    print(f"Mask shape: {mask.shape}")
    print(f"Mask range: {mask.min():.3f} to {mask.max():.3f}")
    print(f"Mask mean: {np.mean(mask):.3f}")
    
    # Apply FFT
    dft = cv2.dft(Y, flags=cv2.DFT_COMPLEX_OUTPUT)
    dft_shift = np.fft.fftshift(dft)
    
    print(f"DFT shape: {dft_shift.shape}")
    print(f"DFT real mean before mask: {np.mean(dft_shift[:,:,0]):.3f}")
    
    # Apply mask
    dft_shift *= mask[:, :, np.newaxis]
    print(f"DFT real mean after mask: {np.mean(dft_shift[:,:,0]):.3f}")
    
    # Convert back
    img_back = cv2.idft(np.fft.ifftshift(dft_shift), flags=cv2.DFT_SCALE)
    Y_processed = img_back[:, :, 0]
    
    print(f"After ringing - Y mean: {np.mean(Y_processed):.2f}")
    print(f"Brightness retention: {(np.mean(Y_processed) / np.mean(Y)) * 100:.1f}%")

if __name__ == "__main__":
    debug_ringing()
