import '../helpers/shopify-env'
import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { GET as getProductsRoute } from '../../src/app/api/products/route'
import { getProductsAccumulated } from '../../src/lib/shopify/products'

type ShopifyFetchCall = {
  operation: 'GetProducts' | 'GetProductByHandle'
  variables: Record<string, unknown>
}

function productNode(handle: string) {
  return {
    id: `gid://shopify/Product/${handle}`,
    handle,
    title: handle,
    vendor: 'GrowMedica',
    productType: 'Doplnky vyzivy',
    tags: ['Test'],
    availableForSale: true,
    priceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'EUR' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'EUR' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'EUR' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'EUR' },
    },
    featuredImage: null,
    variants: { edges: [] },
  }
}

function productsConnection(
  handles: string[],
  hasNextPage: boolean,
  endCursor: string | null,
) {
  return {
    edges: handles.map((handle) => ({
      node: productNode(handle),
      cursor: `${handle}-cursor`,
    })),
    pageInfo: {
      hasNextPage,
      hasPreviousPage: false,
      startCursor: handles[0] ? `${handles[0]}-cursor` : null,
      endCursor,
    },
  }
}

function installShopifyFetchMock() {
  const calls: ShopifyFetchCall[] = []
  const originalFetch = globalThis.fetch
  const previousMockMode = process.env.SHOPIFY_MOCK_MODE
  process.env.SHOPIFY_MOCK_MODE = '0'

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      query?: string
      variables?: Record<string, unknown>
    }
    const query = body.query ?? ''
    const variables = body.variables ?? {}

    if (query.includes('query GetProductByHandle')) {
      calls.push({ operation: 'GetProductByHandle', variables })
      return Response.json({
        data: {
          product: productNode(String(variables.handle)),
        },
      })
    }

    if (query.includes('query GetProducts')) {
      calls.push({ operation: 'GetProducts', variables })
      return Response.json({
        data: {
          products:
            variables.after === undefined
              ? productsConnection(['first-page-product'], true, 'cursor-page-1')
              : productsConnection(['second-page-product'], false, null),
        },
      })
    }

    throw new Error(`Unexpected Shopify query in test: ${query}`)
  }

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch
      if (previousMockMode === undefined) {
        delete process.env.SHOPIFY_MOCK_MODE
      } else {
        process.env.SHOPIFY_MOCK_MODE = previousMockMode
      }
    },
  }
}

test.describe('Products catalog pagination', () => {
  test.describe.configure({ mode: 'serial' })

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

  test('getProductsAccumulated can fetch every Shopify page', async () => {
    const mock = installShopifyFetchMock()

    try {
      const data = await getProductsAccumulated({ first: 250, pages: 'all' })

      expect(data.edges.map((edge) => edge.node.handle)).toEqual([
        'first-page-product',
        'second-page-product',
      ])
      expect(mock.calls).toEqual([
        {
          operation: 'GetProducts',
          variables: {
            first: 250,
            after: undefined,
            query: undefined,
            sortKey: 'BEST_SELLING',
            reverse: false,
          },
        },
        {
          operation: 'GetProducts',
          variables: {
            first: 250,
            after: 'cursor-page-1',
            query: undefined,
            sortKey: 'BEST_SELLING',
            reverse: false,
          },
        },
      ])
    } finally {
      mock.restore()
    }
  })

  test('/api/products resolves wishlist handles directly instead of filtering a capped page', async () => {
    const mock = installShopifyFetchMock()

    try {
      const response = await getProductsRoute(
        new NextRequest('http://localhost/api/products?handles=second-page-product'),
      )
      const body = (await response.json()) as { products: Array<{ handle: string }> }

      expect(body.products.map((product) => product.handle)).toEqual(['second-page-product'])
      expect(mock.calls).toEqual([
        {
          operation: 'GetProductByHandle',
          variables: {
            handle: 'second-page-product',
          },
        },
      ])
    } finally {
      mock.restore()
    }
  })
})
