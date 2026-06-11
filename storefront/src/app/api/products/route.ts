import { NextRequest, NextResponse } from 'next/server'
import { getProductsAccumulated } from '@/lib/shopify/products'

export async function GET(request: NextRequest) {
  const handlesParam = request.nextUrl.searchParams.get('handles')
  
  try {
    const data = await getProductsAccumulated({ first: 250, pages: 1 })
    let products = data.edges.map((e) => e.node)

    if (handlesParam) {
      const handles = handlesParam.split(',').map((h) => h.trim())
      products = products.filter((p) => handles.includes(p.handle))
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('[API Products] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch products', products: [] }, { status: 500 })
  }
}
