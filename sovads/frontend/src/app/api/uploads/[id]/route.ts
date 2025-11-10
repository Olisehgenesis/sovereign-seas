import { NextRequest } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  console.warn(`Deprecated asset route called for id=${id}. Assets are now served via Cloudinary.`)
  return new Response('Legacy asset endpoint. Assets are now served via Cloudinary URLs.', {
    status: 410,
  })
}


