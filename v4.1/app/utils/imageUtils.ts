import { v4 as uuidv4 } from 'uuid';

// Validate image file type only
function isValidImageType(filename: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
  const ext = filename.toLowerCase().split('.').pop() || '';
  return validExtensions.includes(`.${ext}`);
}

// Get file extension from original filename
function getFileExtension(filename: string): string {
  return `.${filename.toLowerCase().split('.').pop() || ''}`;
}

// Generate unique filename with original extension
function generateUniqueFilename(originalFilename: string): string {
  const ext = getFileExtension(originalFilename);
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}${ext}`;
}

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('📁 Processing image:', file.name);
    console.log('📊 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    // Check if it's a valid image
    if (!isValidImageType(file.name)) {
      throw new Error(`Unsupported file type: ${file.name}. Supported image types: jpg, jpeg, png, gif, svg, webp`);
    }

    // Check image file size limit (10MB)
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxImageSize) {
      throw new Error(`Image file too large. Maximum size: 10MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name);
    
    // Store the base64 data in localStorage with the unique filename as key
    localStorage.setItem(`image_${uniqueFilename}`, base64);

    // Return the unique filename that can be used to retrieve the image
    const publicUrl = `/images/uploads/${uniqueFilename}`;
    
    console.log('✅ Image processed successfully:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error("❌ Error processing image:", error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

export const formatIpfsUrl = async (url: string, gateway = "/images/uploads") => {
  try {
    console.log('🔗 Formatting image URL:', url);

    if (!url || url.startsWith("File selected:")) {
      console.log('⚠️ Invalid or empty URL');
      return "";
    }

    // If it's already a local URL, return as-is
    if (url.startsWith('/images/uploads/') || url.startsWith('http')) {
      console.log('✅ URL already formatted:', url);
      return url;
    }

    // Extract filename from URL
    const filename = url.split('/').pop() || url;
    
    // Check if we have this image in localStorage
    const base64Data = localStorage.getItem(`image_${filename}`);
    if (base64Data) {
      return base64Data;
    }

    console.log('⚠️ Image not found in storage, returning original URL');
    return url;

  } catch (error) {
    console.error('❌ Error formatting image URL:', error);
    return url; // Return original URL if formatting fails
  }
};

// Helper function to get image info
export function getImageInfo(filename: string) {
  const base64Data = localStorage.getItem(`image_${filename}`);
  
  if (!base64Data) {
    return null;
  }

  // Calculate size from base64 string
  const size = Math.round((base64Data.length * 3) / 4);
  
  return {
    filename,
    size,
    created: new Date(),
    modified: new Date(),
    isValidImage: isValidImageType(filename),
    publicUrl: base64Data,
    dataUrl: base64Data
  };
}

// Helper function to list all uploaded images
export function listUploadedImages() {
  const images = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('image_')) {
      const filename = key.replace('image_', '');
      const info = getImageInfo(filename);
      if (info) {
        images.push(info);
      }
    }
  }
  
  return images;
}

// Helper function to delete an uploaded image
export function deleteUploadedImage(filename: string): boolean {
  try {
    localStorage.removeItem(`image_${filename}`);
    console.log('🗑️ Image deleted successfully:', filename);
    return true;
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return false;
  }
}

// Helper function to clean up old images (optional, for maintenance)
export function cleanupOldImages(maxAgeInDays: number = 30) {
  const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('image_')) {
      const filename = key.replace('image_', '');
      const timestamp = parseInt(filename.split('-')[0]);
      
      if (timestamp < cutoffTime) {
        localStorage.removeItem(key);
        deletedCount++;
        console.log('🗑️ Deleted old image:', filename);
      }
    }
  }

  console.log(`🧹 Image cleanup completed. Deleted ${deletedCount} old images.`);
  return deletedCount;
}