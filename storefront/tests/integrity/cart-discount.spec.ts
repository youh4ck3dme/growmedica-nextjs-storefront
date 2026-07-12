import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type BrowserContext,
} from '@playwright/test'

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
  return { cart: payload.cart, response }
}

async function cartCookieFrom(response: APIResponse) {
  const setCookieHeader = response.headers()['set-cookie']
  expect(setCookieHeader).toBeTruthy()

  const cartCookie = setCookieHeader!.split(';')[0]
  const separatorIndex = cartCookie.indexOf('=')

  return {
    name: cartCookie.slice(0, separatorIndex),
    value: cartCookie.slice(separatorIndex + 1),
  }
}

async function seedBrowserCart(context: BrowserContext) {
  const { cart, response } = await seedCart(context.request)
  const cookie = await cartCookieFrom(response)
  await context.addCookies([
    {
      ...cookie,
      url: new URL('/', response.url()).toString(),
      httpOnly: true,
      sameSite: 'Strict',
    },
  ])
  return cart
}

test.describe('Cart discount flow', () => {
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
    const { cart: seededCart } = await seedCart(request)
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

  test('applies a discount from /kosik and updates the displayed total', async ({
    context,
    page,
  }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('gm_cookie_consent', 'accepted')
    })

    const seededCart = await seedBrowserCart(context)
    const subtotal = Number(seededCart.cost.subtotalAmount.amount)
    const discountedTotal = (subtotal * 0.9).toFixed(2)

    await page.goto('/kosik')

    await expect(page.locator('#discount-input')).toBeVisible()
    await expect(page.locator('#cart-total-price')).toContainText(seededCart.cost.totalAmount.amount)

    await page.locator('#discount-input').fill(VALID_DISCOUNT_CODE)
    await page.locator('#apply-discount-btn').click()

    await expect(page.locator('#discount-success')).toContainText('Zľavový kód bol úspešne uplatnený.')
    await expect(page.locator('#applied-discounts')).toContainText(VALID_DISCOUNT_CODE)
    await expect(page.locator('text=Zľava')).toBeVisible()
    await expect(page.locator('#cart-total-price')).toContainText(discountedTotal)

    await page.locator('#remove-discount-btn').click()
    await expect(page.locator('#discount-success')).toContainText('Zľava bola odstránená.')
    await expect(page.locator('#applied-discounts')).toHaveCount(0)
    await expect(page.locator('#cart-total-price')).toContainText(seededCart.cost.totalAmount.amount)
  })
})
