/**
 * Client-side image compression utility using HTML5 Canvas.
 * Specifications:
 * - Output format: JPEG
 * - Max dimension width: 1200px (proportional scale)
 * - Compression quality: 0.75
 */

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.75
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale constraining max(width, height)
        const maxDim = Math.max(width, height);
        if (maxDim > maxWidth) {
          const ratio = maxWidth / maxDim;
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to get 2D canvas context'));
          return;
        }

        // Fill background with white in case of transparent PNG inputs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw and scale image
        ctx.drawImage(img, 0, 0, width, height);

        // Encode JPEG once via toBlob and read dataUrl from the resulting blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas blob generation failed'));
              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '.jpg',
              {
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            );

            const blobReader = new FileReader();
            blobReader.onloadend = () => {
              resolve({
                file: compressedFile,
                dataUrl: (blobReader.result as string) || '',
                originalSize: file.size,
                compressedSize: blob.size,
                width,
                height
              });
            };
            blobReader.onerror = () => {
              reject(new Error('Failed to read compressed blob as data URL'));
            };
            blobReader.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
