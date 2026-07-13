import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Products catalog pagination', () => {
  test('/produkty fetches the full catalog for client-side filtering', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    expect(fs.existsSync(productsLibPath)).toBe(true)
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain('getProductsAccumulated')
    expect(libContent).toContain("pages?: number | 'all'")
    
    const pagePath = path.join(process.cwd(), 'src/app/produkty/page.tsx')
    expect(fs.existsSync(pagePath)).toBe(true)
    const pageContent = fs.readFileSync(pagePath, 'utf8')
    expect(pageContent).toContain('getProductsAccumulated')
    expect(pageContent).toContain("pages: 'all'")
    expect(pageContent).toContain('FilterableProductList')
  })

  test('getProductsAccumulated can load beyond the first Shopify page', async () => {
    process.env.SHOPIFY_MOCK_MODE = '1'
    process.env.SHOPIFY_STORE_DOMAIN = 'mock-store.myshopify.com'
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'mock-storefront-token'
    process.env.SHOPIFY_API_VERSION = '2025-01'

    const { getProductsAccumulated } = await import('../../src/lib/shopify/products')
    const firstPage = await getProductsAccumulated({ first: 5, pages: 1 })
    const allPages = await getProductsAccumulated({ first: 5, pages: 'all' })

    expect(firstPage.edges).toHaveLength(5)
    expect(allPages.edges.length).toBeGreaterThan(firstPage.edges.length)
    expect(allPages.pageInfo.hasNextPage).toBe(false)
  })

  test('/api/products uses full catalog and direct handle lookups', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain('PRODUCTS_PAGE_SIZE')
    expect(libContent).toContain('pages')

    const apiPath = path.join(process.cwd(), 'src/app/api/products/route.ts')
    expect(fs.existsSync(apiPath)).toBe(true)
    const apiContent = fs.readFileSync(apiPath, 'utf8')
    expect(apiContent).toContain('getProductByHandle')
    expect(apiContent).toContain("pages: 'all'")
  })
})
