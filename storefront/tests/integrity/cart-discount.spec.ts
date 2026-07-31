import {
  expect,
  test,
  type APIRequestContext,
} from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const MOCK_VARIANT_ID = 'gid://shopify/ProductVariant/mock-cordyceps-default'
const VALID_DISCOUNT_CODE = 'ZLAVA10'

type CartResponse = {
  count: number
  cart: {
    discountCodes?: Array<{ code: string; applicable: boolean }>
    cost: {
      subtotalAmount: { amount: string; currencyCode: string }
      totalAmount: { amount: string; currencyCode: string }
    }
  }
}

async function seedCart(request: APIRequestContext) {
  const response = await request.post('/api/cart/add', {
    data: {
      variantId: MOCK_VARIANT_ID,
      quantity: 1,
    },
  })

  expect(response.ok()).toBe(true)

  const payload = (await response.json()) as CartResponse
  expect(payload.count).toBe(1)
  return payload.cart
}

test.describe('Cart discount flow', () => {
  test('wires the cart discount UI to the discount API', () => {
    const cartPath = path.join(process.cwd(), 'src/components/cart/InteractiveCart.tsx')
    expect(fs.existsSync(cartPath)).toBe(true)

    const content = fs.readFileSync(cartPath, 'utf8')
    expect(content).toContain("fetch('/api/cart/discount'")
    expect(content).toContain("method: 'POST'")
    expect(content).toContain("method: 'DELETE'")
    expect(content).toContain('id="discount-input"')
    expect(content).toContain('id="apply-discount-btn"')
    expect(content).toContain('id="applied-discounts"')
    expect(content).toContain('id="remove-discount-btn"')
    expect(content).toContain('id="cart-total-price"')
  })

  test('validates discount input and requires an existing cart', async ({ request }) => {
    const emptyDiscount = await request.post('/api/cart/discount', {
      data: { discountCode: '   ' },
    })
    expect(emptyDiscount.status()).toBe(400)
    await expect(emptyDiscount.json()).resolves.toEqual({ error: 'Discount code is required' })

    const missingCart = await request.post('/api/cart/discount', {
      data: { discountCode: VALID_DISCOUNT_CODE },
    })
    expect(missingCart.status()).toBe(404)
    await expect(missingCart.json()).resolves.toEqual({ error: 'Cart not found' })
  })

  test('applies and removes the ZLAVA10 discount through the cart API', async ({ request }) => {
    const seededCart = await seedCart(request)
    const subtotal = Number(seededCart.cost.subtotalAmount.amount)

    const applyResponse = await request.post('/api/cart/discount', {
      data: { discountCode: VALID_DISCOUNT_CODE },
    })
    expect(applyResponse.ok()).toBe(true)

    const applied = (await applyResponse.json()) as CartResponse
    expect(applied.count).toBe(1)
    expect(applied.cart.discountCodes).toEqual([
      { code: VALID_DISCOUNT_CODE, applicable: true },
    ])
    expect(Number(applied.cart.cost.totalAmount.amount)).toBeCloseTo(subtotal * 0.9, 2)

    const removeResponse = await request.delete('/api/cart/discount')
    expect(removeResponse.ok()).toBe(true)

    const removed = (await removeResponse.json()) as CartResponse
    expect(removed.count).toBe(1)
    expect(removed.cart.discountCodes).toEqual([])
    expect(Number(removed.cart.cost.totalAmount.amount)).toBeCloseTo(subtotal, 2)
  })
})
