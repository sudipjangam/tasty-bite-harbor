
import { useState, useCallback } from 'react';

interface UseImageOptimizationProps {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export function useImageOptimization({
  quality = 0.8,
  maxWidth = 1920,
  maxHeight = 1080
}: UseImageOptimizationProps = {}) {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeImage = useCallback(async (file: File): Promise<File> => {
    setIsOptimizing(true);
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              setIsOptimizing(false);
              resolve(optimizedFile);
            } else {
              setIsOptimizing(false);
              resolve(file);  // Return original if optimization fails
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, [quality, maxWidth, maxHeight]);

  return {
    optimizeImage,
    isOptimizing
  };
}
