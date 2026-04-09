import { supabase } from '@/integrations/supabase/client';

export interface UploadImageOptions {
  resize?: boolean;
  onProgress?: (progress: number) => void;
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

export const uploadImage = async (
  file: File,
  options?: UploadImageOptions | ((progress: number) => void)
): Promise<string> => {
  try {
    const resize = typeof options === 'object' ? (options.resize ?? true) : true;
    const onProgress = typeof options === 'function' ? options : options?.onProgress;

    onProgress?.(10);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }
    
    onProgress?.(30);
    
    let fileToUpload: File | Blob = file;
    if (resize) {
      fileToUpload = await resizeImageToPassportSize(file);
    }
    
    onProgress?.(60);
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const fileName = `${uuid}.${fileExt}`;
    
    // Upload to Supabase Storage images bucket
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileToUpload instanceof File ? fileToUpload.type : 'image/jpeg'
      });
    
    onProgress?.(90);
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);
      
    onProgress?.(100);
    
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image');
  }
};