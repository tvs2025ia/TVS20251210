import React, { useState, useEffect } from 'react';
import { LocalImageService } from '../services/localImageService';

interface LocalImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
  onError?: () => void;
}

/**
 * Component for displaying images stored locally in public/img
 * Handles both blob URLs and base64 data URLs
 */
export function LocalImage({ src, alt, className, fallback, onError }: LocalImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageSrc('');
      return;
    }

    // Get the proper URL for local images
    const resolvedUrl = LocalImageService.getImageUrl(src);
    setImageSrc(resolvedUrl);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  const handleLoad = () => {
    setHasError(false);
  };

  // Show fallback if no src, error occurred, or src is empty
  if (!src || hasError || !imageSrc) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className || ''}`}>
        {fallback ? (
          <img src={fallback} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400 text-center p-4">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}

/**
 * Hook for managing image state and local storage
 */
export function useLocalImage(imagePath?: string) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setImageUrl('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resolvedUrl = LocalImageService.getImageUrl(imagePath);
      setImageUrl(resolvedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading image');
    } finally {
      setIsLoading(false);
    }
  }, [imagePath]);

  return { imageUrl, isLoading, error };
}

/**
 * Component for uploading and previewing images
 */
interface ImageUploadPreviewProps {
  onImageSelect: (file: File) => void;
  currentImage?: string;
  productId?: string;
  className?: string;
}

export function ImageUploadPreview({ 
  onImageSelect, 
  currentImage, 
  productId, 
  className = "w-32 h-32" 
}: ImageUploadPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (currentImage) {
      const resolvedUrl = LocalImageService.getImageUrl(currentImage);
      setPreviewUrl(resolvedUrl);
    }
  }, [currentImage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
      
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      // Cleanup old blob URL when component unmounts
      return () => URL.revokeObjectURL(preview);
    }
  };

  return (
    <div className="space-y-3">
      {/* Image preview */}
      <div className={`border-2 border-dashed border-gray-300 rounded-lg overflow-hidden ${className}`}>
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Seleccionar imagen</span>
            </div>
          </div>
        )}
      </div>
      
      {/* File input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      {productId && (
        <p className="text-xs text-gray-500">
          Las imágenes se guardan en public/img/
        </p>
      )}
    </div>
  );
}
