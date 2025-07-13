import { supabase } from '@/integrations/supabase/client';

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
    
    // Use Supabase Edge Function to proxy the upload
    const { data, error } = await supabase.functions.invoke('freeimage-upload', {
      body: {
        base64Image: base64String,
        fileName: file.name,
        fileType: file.type
      }
    });
    
    onProgress?.(80);
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    onProgress?.(100);
    
    if (data.success && data.imageUrl) {
      return data.imageUrl;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image');
  }
};

// Main upload function - now uses Supabase Edge Function to avoid CORS
export const uploadImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return await uploadImageToFreeHost(file, onProgress);
};