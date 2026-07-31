import { test, expect, type APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const CORDYCEPS_VARIANT_ID = 'gid://shopify/ProductVariant/mock-cordyceps-default'

async function addMockCartLine(request: APIRequestContext) {
  const response = await request.post('/api/cart/add', {
    data: {
      variantId: CORDYCEPS_VARIANT_ID,
      quantity: 1,
    },
  })

  expect(response.ok()).toBe(true)
  return response
}

test.describe('Mock Shopify cart API', () => {
  test('POST /api/cart/add preserves existing carts on add failures', async ({ request }) => {
    const routePath = path.join(process.cwd(), 'src/app/api/cart/add/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)
    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain('existingCartId')
    expect(content).toContain('addToCart')
    expect(content).toContain('getCart')
    expect(content).toContain('throw error')
    expect(content).toContain('createCart')
    expect(content).toContain('CART_COOKIE')

    const productsResponse = await request.get('/api/products')
    expect(productsResponse.ok()).toBe(true)
    const { products } = (await productsResponse.json()) as {
      products: Array<{ variants: { edges: Array<{ node: { id: string } }> } }>
    }
    const variantId = products[0]?.variants.edges[0]?.node.id
    expect(variantId).toBeTruthy()

    const addResponse = await request.post('/api/cart/add', {
      data: { variantId, quantity: 1 },
    })
    expect(addResponse.ok()).toBe(true)
    const addBody = (await addResponse.json()) as { count: number }
    expect(addBody.count).toBe(1)
    const cartCookie = addResponse.headers()['set-cookie']
    expect(cartCookie).toContain('growmedical_cart_id')
    const cookieHeader = cartCookie?.split(';')[0] ?? ''

    const failedAddResponse = await request.post('/api/cart/add', {
      headers: { cookie: cookieHeader },
      data: { variantId: 'gid://shopify/ProductVariant/does-not-exist', quantity: 1 },
    })
    expect(failedAddResponse.status()).toBe(500)
    expect(failedAddResponse.headers()['set-cookie'] ?? '').not.toContain('growmedical_cart_id')
  })

  test('pridanie do košíka aktualizuje badge v hlavičke', async () => {
    const btnPath = path.join(process.cwd(), 'src/components/product/AddToCartButton.tsx')
    expect(fs.existsSync(btnPath)).toBe(true)
    const content = fs.readFileSync(btnPath, 'utf8')
    expect(content).toContain('id="add-to-cart-btn"')
    expect(content).toContain('handleAddToCart')
    expect(content).toContain("window.dispatchEvent(new CustomEvent('cart-count-updated'")
  })

  test('POST /api/cart/discount odmietne prázdny zľavový kód', async ({ request }) => {
    const response = await request.post('/api/cart/discount', {
      data: { discountCode: '   ' },
    })

    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Discount code is required' })
  })

  test('POST /api/cart/discount bez košíka vráti 404', async ({ request }) => {
    const response = await request.post('/api/cart/discount', {
      data: { discountCode: 'ZLAVA10' },
    })

    expect(response.status()).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Cart not found' })
  })

  test('POST /api/cart/discount uplatní ZLAVA10 a prepočíta sumu košíka', async ({ request }) => {
    await addMockCartLine(request)

    const response = await request.post('/api/cart/discount', {
      data: { discountCode: ' ZLAVA10 ' },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.count).toBe(1)
    expect(body.cart.discountCodes).toEqual([{ code: 'ZLAVA10', applicable: true }])
    expect(body.cart.cost.subtotalAmount.amount).toBe('16.20')
    expect(body.cart.cost.totalAmount.amount).toBe('14.58')
  })

  test('DELETE /api/cart/discount odstráni zľavu a obnoví pôvodnú sumu', async ({ request }) => {
    await addMockCartLine(request)

    const applyResponse = await request.post('/api/cart/discount', {
      data: { discountCode: 'ZLAVA10' },
    })
    expect(applyResponse.status()).toBe(200)

    const response = await request.delete('/api/cart/discount')

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.count).toBe(1)
    expect(body.cart.discountCodes).toEqual([])
    expect(body.cart.cost.subtotalAmount.amount).toBe('16.20')
    expect(body.cart.cost.totalAmount.amount).toBe('16.20')
  })
})
