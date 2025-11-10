import { v2 as cloudinary } from 'cloudinary'

const isConfigured = Boolean(process.env.CLOUDINARY_URL)

if (isConfigured) {
  cloudinary.config({
    secure: true,
  })
} else {
  console.warn(
    '[Cloudinary] CLOUDINARY_URL is not set. Image uploads will fail until credentials are configured.'
  )
}

export const cloudinaryClient = cloudinary

type UploadOptions = {
  folder?: string
  filenameOverride?: string
}

export async function uploadImageToCloudinary(
  file: Buffer | string,
  mimeType?: string,
  options: UploadOptions = {}
) {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL before uploading.')
  }

  const folder = options.folder ?? process.env.CLOUDINARY_FOLDER ?? 'sovads'

  const uploadInput =
    typeof file === 'string' && file.startsWith('data:')
      ? file
      : typeof file === 'string'
      ? `data:${mimeType ?? 'application/octet-stream'};base64,${file}`
      : `data:${mimeType ?? 'application/octet-stream'};base64,${file.toString('base64')}`

  const result = await cloudinary.uploader.upload(uploadInput, {
    folder,
    use_filename: true,
    unique_filename: !options.filenameOverride,
    overwrite: false,
    public_id: options.filenameOverride,
    resource_type: 'auto',
  })

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width ?? null,
    height: result.height ?? null,
    format: result.format,
    resourceType: result.resource_type,
    bytes: result.bytes,
    duration: (result as { duration?: number }).duration ?? null,
  }
}

export async function deleteImageFromCloudinary(publicId: string, resourceType: 'image' | 'video' = 'image') {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL before deleting assets.')
  }

  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}

