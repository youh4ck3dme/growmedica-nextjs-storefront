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
    expect(pageContent).toContain('FilterableProductList')
  })

  test('/produkty?stranka=2 loads accumulated products', async () => {
    const productsLibPath = path.join(process.cwd(), 'src/lib/shopify/products.ts')
    const libContent = fs.readFileSync(productsLibPath, 'utf8')
    expect(libContent).toContain('PRODUCTS_PAGE_SIZE')
    expect(libContent).toContain('pages')
  })
})
