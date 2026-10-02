import imageCompression from "browser-image-compression";

export type ImageType = "profile" | "cover" | "post" | "disease";

interface OptimizationOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  initialQuality: number;
}

const PRESETS: Record<ImageType, OptimizationOptions> = {
  profile: {
    maxSizeMB: 0.05, // 50KB
    maxWidthOrHeight: 400,
    useWebWorker: true,
    initialQuality: 0.8,
  },
  cover: {
    maxSizeMB: 0.2, // 200KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.7,
  },
  post: {
    maxSizeMB: 0.4, // 400KB
    maxWidthOrHeight: 1080,
    useWebWorker: true,
    initialQuality: 0.8,
  },
  disease: {
    maxSizeMB: 0.5, // 500KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.9, // Higher quality for AI accuracy
  },
};

/**
 * Optimizes an image file based on the specified type.
 * @param file The original image file
 * @param type The type of image (profile, cover, post, disease)
 * @returns Optimized File object
 */
export async function optimizeImage(file: File, type: ImageType): Promise<File> {
  const options = PRESETS[type];
  
  try {
    console.log(`[Optimizer] Optimizing ${type} image. Original size: ${(file.size / 1024).toFixed(2)} KB`);
    const compressedFile = await imageCompression(file, { ...options, fileType: "image/jpeg" });
    console.log(`[Optimizer] Optimization complete. New size: ${(compressedFile.size / 1024).toFixed(2)} KB`);
    
    // Return the new file with the original name but potentially new extension/blob
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("[Optimizer] Error optimizing image:", error);
    return file; // Return original if optimization fails
  }
}

/**
 * Converts a File or Blob to Base64 string.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Returns only the base64 part of the data URL.
 */
export async function fileToRawBase64(file: File | Blob): Promise<string> {
  const dataUrl = await fileToBase64(file);
  return dataUrl.split(",")[1] || "";
}

