import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const { base64, filename, type } = await request.json()
      if (!base64 || !type) {
        return NextResponse.json({ error: 'base64 and type required' }, { status: 400 })
      }
      const upload = await uploadImageToCloudinary(base64, type, {
        filenameOverride: filename ?? undefined,
      })

      return NextResponse.json(
        {
          url: upload.secureUrl,
          publicId: upload.publicId,
          width: upload.width,
          height: upload.height,
          format: upload.format,
          mediaType: upload.resourceType === 'video' ? 'video' : 'image',
          bytes: upload.bytes,
          duration: upload.duration,
        },
        { status: 201 }
      )
    }

    // Fallback: multipart/form-data
    const form = await request.formData()
    const file = form.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'image file is required' }, { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const upload = await uploadImageToCloudinary(buffer, file.type || undefined, {
      filenameOverride: file.name ? `${file.name}-${randomUUID()}` : undefined,
    })

    return NextResponse.json(
      {
        url: upload.secureUrl,
        publicId: upload.publicId,
        width: upload.width,
        height: upload.height,
        format: upload.format,
        mediaType: upload.resourceType === 'video' ? 'video' : 'image',
        bytes: upload.bytes,
        duration: upload.duration,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}


