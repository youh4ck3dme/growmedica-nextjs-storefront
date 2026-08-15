import { expect, test } from '@playwright/test'

const CORDYCEPS_VARIANT_ID = 'gid://shopify/ProductVariant/mock-cordyceps-default'

function amount(value: string) {
  return Number.parseFloat(value)
}

test.describe('Cart discount API', () => {
  test('applies a loyalty code to an existing cart and removes it again', async ({ request }) => {
    const addResponse = await request.post('/api/cart/add', {
      data: {
        variantId: CORDYCEPS_VARIANT_ID,
        quantity: 2,
      },
    })
    expect(addResponse.status()).toBe(200)

    const applyResponse = await request.post('/api/cart/discount', {
      data: {
        discountCode: '  ZLAVA10  ',
      },
    })
    expect(applyResponse.status()).toBe(200)

    const appliedPayload = await applyResponse.json()
    expect(appliedPayload.count).toBe(2)
    expect(appliedPayload.cart.discountCodes).toEqual([
      expect.objectContaining({
        code: 'ZLAVA10',
        applicable: true,
      }),
    ])

    const discountedSubtotal = amount(appliedPayload.cart.cost.subtotalAmount.amount)
    const discountedTotal = amount(appliedPayload.cart.cost.totalAmount.amount)
    expect(discountedTotal).toBeLessThan(discountedSubtotal)
    expect(discountedTotal).toBeCloseTo(discountedSubtotal * 0.9, 2)

    const removeResponse = await request.delete('/api/cart/discount')
    expect(removeResponse.status()).toBe(200)

    const removedPayload = await removeResponse.json()
    expect(removedPayload.count).toBe(2)
    expect(removedPayload.cart.discountCodes).toEqual([])
    expect(amount(removedPayload.cart.cost.totalAmount.amount)).toBeCloseTo(
      amount(removedPayload.cart.cost.subtotalAmount.amount),
      2,
    )
  })

  test('rejects blank discount codes before touching Shopify', async ({ request }) => {
    const response = await request.post('/api/cart/discount', {
      data: {
        discountCode: '   ',
      },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Discount code is required',
    })
  })

  test('requires an existing cart cookie for applying or clearing discounts', async ({ request }) => {
    const applyResponse = await request.post('/api/cart/discount', {
      data: {
        discountCode: 'ZLAVA10',
      },
    })
    expect(applyResponse.status()).toBe(404)
    expect(await applyResponse.json()).toMatchObject({
      error: 'Cart not found',
    })

    const deleteResponse = await request.delete('/api/cart/discount')
    expect(deleteResponse.status()).toBe(404)
    expect(await deleteResponse.json()).toMatchObject({
      error: 'Cart not found',
    })
  })
})
