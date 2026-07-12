import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Products catalog pagination', () => {
  test('/produkty fetches the full Shopify catalog for client-side filtering', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    expect(fs.existsSync(productsLibPath)).toBe(true)
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain("pages?: number | 'all'")
    expect(libContent).toContain('Number.POSITIVE_INFINITY')

    const pagePath = path.join(process.cwd(), 'src/app/produkty/page.tsx')
    expect(fs.existsSync(pagePath)).toBe(true)
    const pageContent = fs.readFileSync(pagePath, 'utf8')
    expect(pageContent).toContain('getProductsAccumulated')
    expect(pageContent).toContain("pages: 'all'")
    expect(pageContent).toContain('FilterableProductList')
  })

  test('/api/products resolves wishlist handles without filtering a one-page slice', async () => {
    const routePath = path.join(process.cwd(), 'src/app/api/products/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const routeContent = fs.readFileSync(routePath, 'utf8')

    expect(routeContent).toContain('getProductByHandle')
    expect(routeContent).toContain('Promise.all')
    expect(routeContent).toContain("pages: 'all'")
    expect(routeContent).not.toContain('pages: 1')
  })

  test('/api/products handle lookup returns requested mock product', async ({ request }) => {
    const response = await request.get(
      '/api/products?handles=mycomedica-cordyceps-50-90-rastlinnych-kapsul',
    )
    expect(response.ok()).toBe(true)

    const data = (await response.json()) as { products: Array<{ handle: string }> }
    expect(data.products.map((product) => product.handle)).toEqual([
      'mycomedica-cordyceps-50-90-rastlinnych-kapsul',
    ])
  })
})
