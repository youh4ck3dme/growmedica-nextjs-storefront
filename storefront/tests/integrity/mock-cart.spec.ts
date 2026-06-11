import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Mock Shopify cart API', () => {
  test('POST /api/cart/add vráti count a cookie', async () => {
    const routePath = path.join(process.cwd(), 'src/app/api/cart/add/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('existingCartId')
    expect(content).toContain('addToCart')
    expect(content).toContain('createCart')
    expect(content).toContain('CART_COOKIE')
  })

  test('pridanie do košíka aktualizuje badge v hlavičke', async () => {
    const btnPath = path.join(process.cwd(), 'src/components/product/AddToCartButton.tsx')
    expect(fs.existsSync(btnPath)).toBe(true)
    const content = fs.readFileSync(btnPath, 'utf8')
    expect(content).toContain('id="add-to-cart-btn"')
    expect(content).toContain('handleAddToCart')
    expect(content).toContain("window.dispatchEvent(new CustomEvent('cart-count-updated'")
  })
})
