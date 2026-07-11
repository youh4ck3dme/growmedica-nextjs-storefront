import '../helpers/shopify-env'
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { getProductsAccumulated } from '../../src/lib/shopify/products'

test.describe('Products catalog pagination', () => {
  test('/produkty fetches the complete Shopify catalog', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    expect(fs.existsSync(productsLibPath)).toBe(true)
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain('getProductsAccumulated')
    expect(libContent).toContain("pages?: number | 'all'")
    expect(libContent).toContain("pages === 'all'")
    
    const pagePath = path.join(process.cwd(), 'src/app/produkty/page.tsx')
    expect(fs.existsSync(pagePath)).toBe(true)
    const pageContent = fs.readFileSync(pagePath, 'utf8')
    expect(pageContent).toContain('getProductsAccumulated')
    expect(pageContent).toContain("pages: 'all'")
    expect(pageContent).not.toContain('pages: 1')
    expect(pageContent).toContain('FilterableProductList')
  })

  test('/api/products is not capped before wishlist handle filtering', async () => {
    const apiPath = path.join(process.cwd(), 'src/app/api/products/route.ts')
    expect(fs.existsSync(apiPath)).toBe(true)
    const apiContent = fs.readFileSync(apiPath, 'utf8')

    expect(apiContent).toContain('getProductByHandle')
    expect(apiContent).toContain("pages: 'all'")
    expect(apiContent).not.toContain('pages: 1')
  })

  test('getProductsAccumulated follows every available Shopify page', async () => {
    process.env.SHOPIFY_MOCK_MODE = '1'

    const firstPageOnly = await getProductsAccumulated({ first: 10, pages: 1 })
    const allPages = await getProductsAccumulated({ first: 10, pages: 'all' })

    expect(firstPageOnly.pageInfo.hasNextPage).toBe(true)
    expect(allPages.edges.length).toBeGreaterThan(firstPageOnly.edges.length)
    expect(allPages.pageInfo.hasNextPage).toBe(false)
  })
})
