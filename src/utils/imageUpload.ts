interface FreeImageHostResponse {
  status_code: number;
  success?: {
    message: string;
    code: number;
  };
  image?: {
    url: string;
    display_url: string;
    thumb: {
      url: string;
    };
    medium: {
      url: string;
    };
  };
  status_txt: string;
}

// Resize image to passport size (3.5cm x 4.5cm at 300 DPI ≈ 413x531 pixels)
const resizeImageToPassportSize = (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Passport size dimensions
      const targetWidth = 413;
      const targetHeight = 531;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Calculate scaling to maintain aspect ratio and fill the canvas
      const scaleX = targetWidth / img.width;
      const scaleY = targetHeight / img.height;
      const scale = Math.max(scaleX, scaleY);
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center the image
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;
      
      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Draw the image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg', 0.85);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export const uploadImageToFreeHost = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    onProgress?.(10);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }
    
    onProgress?.(20);
    
    // Resize image to passport size
    const resizedBlob = await resizeImageToPassportSize(file);
    onProgress?.(40);
    
    // Convert to base64
    const base64Promise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const base64String = e.target.result.toString().split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(resizedBlob);
    });
    
    const base64String = await base64Promise;
    onProgress?.(60);
    
    // Upload to freeimage.host API
    const formData = new FormData();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
    formData.append('action', 'upload');
    formData.append('source', base64String);
    formData.append('format', 'json');
    
    onProgress?.(80);
    
    const response = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: FreeImageHostResponse = await response.json();
    onProgress?.(100);
    
    if (data.status_code === 200 && data.image?.url) {
      // Return the medium size URL for better display quality
      return data.image.medium?.url || data.image.display_url || data.image.url;
    } else {
      throw new Error(data.status_txt || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image');
  }
};

// Fallback to plugin method if API fails
export const triggerFreeImageHostPlugin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check if the plugin is loaded
    if (typeof (window as any).PUP === 'undefined') {
      reject(new Error('FreeImage.host plugin not loaded'));
      return;
    }
    
    try {
      // Trigger the plugin
      (window as any).PUP.activate({
        onSuccess: (data: any) => {
          if (data && data.url) {
            resolve(data.url);
          } else {
            reject(new Error('No URL returned from plugin'));
          }
        },
        onError: (error: any) => {
          reject(new Error(error?.message || 'Plugin upload failed'));
        }
      });
    } catch (error) {
      reject(new Error('Failed to activate upload plugin'));
    }
  });
};

// Main upload function with fallback
export const uploadImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Try API first
    return await uploadImageToFreeHost(file, onProgress);
  } catch (apiError) {
    console.warn('API upload failed, trying plugin fallback:', apiError);
    
    try {
      // Fallback to plugin
      return await triggerFreeImageHostPlugin();
    } catch (pluginError) {
      console.error('Plugin upload also failed:', pluginError);
      throw new Error('Both API and plugin upload methods failed. Please try again.');
    }
  }
};