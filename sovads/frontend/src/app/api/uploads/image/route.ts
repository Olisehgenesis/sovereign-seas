import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const { base64, filename, type } = await request.json()
      if (!base64 || !type) {
        return NextResponse.json({ error: 'base64 and type required' }, { status: 400 })
      }
      const asset = await prisma.asset.create({
        data: {
          dataBase64: base64,
          contentType: type,
          filename: filename || null,
        }
      })
      return NextResponse.json({ url: `/api/uploads/${asset.id}` }, { status: 201 })
    }

    // Fallback: multipart/form-data
    const form = await request.formData()
    const file = form.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'image file is required' }, { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const asset = await prisma.asset.create({
      data: {
        dataBase64: base64,
        contentType: file.type || 'application/octet-stream',
        filename: file.name,
      }
    })
    return NextResponse.json({ url: `/api/uploads/${asset.id}` }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}


