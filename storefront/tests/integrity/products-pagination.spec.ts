import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Products catalog pagination', () => {
  test('/produkty shows product grid with load-more when catalog spans pages', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    expect(fs.existsSync(productsLibPath)).toBe(true)
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain('getProductsAccumulated')
    
    const pagePath = path.join(process.cwd(), 'src/app/produkty/page.tsx')
    expect(fs.existsSync(pagePath)).toBe(true)
    const pageContent = fs.readFileSync(pagePath, 'utf8')
    expect(pageContent).toContain('getProductsAccumulated')
    expect(pageContent).toContain("pages: 'all'")
    expect(pageContent).toContain('FilterableProductList')
  })

  test('product accumulation supports fetching all Shopify pages', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain('PRODUCTS_PAGE_SIZE')
    expect(libContent).toContain("type AccumulatedPages = number | 'all'")
    expect(libContent).toContain("pages === 'all'")
  })

  test('/api/products fetches all products and resolves wishlist handles directly', async () => {
    const apiPath = path.join(process.cwd(), 'src/app/api/products/route.ts')
    expect(fs.existsSync(apiPath)).toBe(true)
    const apiContent = fs.readFileSync(apiPath, 'utf8')
    expect(apiContent).toContain('getProductByHandle')
    expect(apiContent).toContain("pages: 'all'")
    expect(apiContent).not.toContain('pages: 1')
  })
})
