import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const asset = await prisma.asset.findUnique({ where: { id } })
    if (!asset) {
      return new Response('Not Found', { status: 404 })
    }
    const binary = Buffer.from(asset.dataBase64, 'base64')
    return new Response(binary, {
      status: 200,
      headers: {
        'Content-Type': asset.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch {
    return new Response('Server Error', { status: 500 })
  }
}


