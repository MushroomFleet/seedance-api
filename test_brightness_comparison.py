import numpy as np
import cv2

# Our current YIQ implementation
def our_bgr2yiq(bgrimg):
    bgrimg_float = bgrimg.astype(np.float32)
    planar = np.transpose(bgrimg_float, (2, 0, 1))
    b, g, r = planar
    
    # Standard YIQ conversion matrix
    Y = 0.299 * r + 0.587 * g + 0.114 * b
    I = 0.596 * r - 0.274 * g - 0.322 * b
    Q = 0.211 * r - 0.523 * g + 0.312 * b
    
    return np.stack([Y, I, Q], axis=0)

def our_yiq2bgr(yiq):
    Y, I, Q = [ch.astype(np.float32) for ch in yiq]
    
    # Standard YIQ to RGB conversion matrix
    r = Y + 0.956 * I + 0.619 * Q
    g = Y - 0.272 * I - 0.647 * Q
    b = Y - 1.105 * I + 1.702 * Q
    
    rgb = np.stack([b, g, r], axis=2)
    return np.clip(rgb, 0, 255).astype(np.uint8)

# Original-style implementation (RGB input path)
def original_bgr2yiq(bgrimg):
    # Convert BGR to RGB first (like original does)
    rgbimg = cv2.cvtColor(bgrimg.astype(np.uint8), cv2.COLOR_BGR2RGB)
    rgbimg_float = rgbimg.astype(np.float32)
    planar = np.transpose(rgbimg_float, (2, 0, 1))
    r, g, b = planar  # Note: now it's RGB order
    
    # Standard YIQ conversion matrix (for RGB input)
    Y = 0.299 * r + 0.587 * g + 0.114 * b
    I = 0.596 * r - 0.274 * g - 0.322 * b
    Q = 0.211 * r - 0.523 * g + 0.312 * b
    
    return np.stack([Y, I, Q], axis=0)

def original_yiq2bgr(yiq):
    Y, I, Q = [ch.astype(np.float32) for ch in yiq]
    
    # Standard YIQ to RGB conversion matrix
    r = Y + 0.956 * I + 0.619 * Q
    g = Y - 0.272 * I - 0.647 * Q
    b = Y - 1.105 * I + 1.702 * Q
    
    # Stack as RGB, then convert to BGR
    rgb = np.stack([r, g, b], axis=2)
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return bgr

# Test with a sample image
print("=== YIQ Conversion Brightness Test ===")

# Create a test image (gray gradient)
test_img = np.zeros((100, 100, 3), dtype=np.uint8)
for i in range(100):
    test_img[:, i, :] = i * 2.55  # 0 to 255 gradient

print(f"Original test image brightness: {np.mean(test_img):.2f}")

# Test our current implementation
yiq_ours = our_bgr2yiq(test_img)
result_ours = our_yiq2bgr(yiq_ours)
print(f"Our implementation brightness: {np.mean(result_ours):.2f}")
print(f"Our brightness retention: {(np.mean(result_ours) / np.mean(test_img)) * 100:.1f}%")

# Test original-style implementation  
yiq_orig = original_bgr2yiq(test_img)
result_orig = original_yiq2bgr(yiq_orig)
print(f"Original-style brightness: {np.mean(result_orig):.2f}")
print(f"Original brightness retention: {(np.mean(result_orig) / np.mean(test_img)) * 100:.1f}%")

# Compare difference
diff = np.mean(result_orig) - np.mean(result_ours)
print(f"Brightness difference: {diff:.2f} (original - ours)")
