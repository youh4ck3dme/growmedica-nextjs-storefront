import '../helpers/shopify-env'
import { expect, test } from '@playwright/test'
import { NextRequest } from 'next/server'
import { GET as getProductsRoute } from '../../src/app/api/products/route'
import { getProductsAccumulated } from '../../src/lib/shopify/products'

type ShopifyFetchCall = {
  operation: string
  variables: Record<string, unknown>
}

type ProductNode = ReturnType<typeof productNode>
type ProductEdge = { node: ProductNode; cursor: string }

function pageInfo(hasNextPage: boolean, endCursor: string | null = null) {
  return {
    hasNextPage,
    hasPreviousPage: false,
    startCursor: null,
    endCursor,
  }
}

function productNode(handle: string) {
  const price = { amount: '10.00', currencyCode: 'EUR' }

  return {
    id: `gid://shopify/Product/${handle}`,
    handle,
    title: handle,
    vendor: 'GrowMedica',
    productType: 'Doplnky vyzivy',
    tags: ['Test'],
    availableForSale: true,
    priceRange: {
      minVariantPrice: price,
      maxVariantPrice: price,
    },
    compareAtPriceRange: {
      minVariantPrice: price,
      maxVariantPrice: price,
    },
    featuredImage: null,
    variants: {
      edges: [
        {
          node: {
            id: `gid://shopify/ProductVariant/${handle}`,
            title: 'Default Title',
            availableForSale: true,
            selectedOptions: [{ name: 'Title', value: 'Default Title' }],
            price,
            compareAtPrice: null,
          },
        },
      ],
    },
  }
}

function productDetail(handle: string) {
  return {
    ...productNode(handle),
    description: `${handle} detail`,
    descriptionHtml: `<p>${handle} detail</p>`,
    options: [
      {
        id: `gid://shopify/ProductOption/${handle}`,
        name: 'Title',
        values: ['Default Title'],
      },
    ],
    images: { edges: [] },
    seo: { title: null, description: null },
    metafields: [],
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

function productsConnection(
  edges: ProductEdge[],
  hasNextPage: boolean,
  endCursor: string | null = null,
) {
  return {
    edges,
    pageInfo: pageInfo(hasNextPage, endCursor),
  }
}

type ProductsMockOptions = {
  pageOneEdges?: ProductEdge[]
  pageTwoEdges?: ProductEdge[]
  handleProducts?: Record<string, ProductNode | null>
}

function installShopifyFetchMock({
  pageOneEdges = [],
  pageTwoEdges = [],
  handleProducts = {},
}: ProductsMockOptions = {}) {
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

    if (query.includes('query GetProducts')) {
      calls.push({ operation: 'GetProducts', variables })
      if (variables.after === undefined) {
        return Response.json({
          data: {
            products: productsConnection(
              pageOneEdges,
              pageTwoEdges.length > 0,
              'cursor-page-1',
            ),
          },
        })
      }

      return Response.json({
        data: {
          products: productsConnection(pageTwoEdges, false),
        },
      })
    }

    if (query.includes('query GetProductByHandle')) {
      calls.push({ operation: 'GetProductByHandle', variables })
      const handle = String(variables.handle ?? '')
      const product = Object.prototype.hasOwnProperty.call(
        handleProducts,
        handle,
      )
        ? handleProducts[handle]
        : null

      return Response.json({
        data: {
          product: product ? productDetail(product.handle) : null,
        },
      })
    }

    throw new Error(
      `Unexpected Shopify query in products pagination test: ${query}`,
    )
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

  test('getProductsAccumulated can fetch every Shopify cursor page', async () => {
    const mock = installShopifyFetchMock({
      pageOneEdges: [
        { node: productNode('page-1-alpha'), cursor: 'page-1-alpha-cursor' },
        { node: productNode('page-1-beta'), cursor: 'page-1-beta-cursor' },
      ],
      pageTwoEdges: [
        { node: productNode('page-2-gamma'), cursor: 'page-2-gamma-cursor' },
      ],
    })

    try {
      const products = await getProductsAccumulated({ first: 2, pages: 'all' })

      expect(products.edges.map((edge) => edge.node.handle)).toEqual([
        'page-1-alpha',
        'page-1-beta',
        'page-2-gamma',
      ])
      expect(mock.calls.map((call) => call.operation)).toEqual([
        'GetProducts',
        'GetProducts',
      ])
      expect(mock.calls.at(-1)?.variables.after).toBe('cursor-page-1')
    } finally {
      mock.restore()
    }
  })

  test('GET /api/products returns products beyond the first Shopify page', async () => {
    const mock = installShopifyFetchMock({
      pageOneEdges: [
        { node: productNode('page-1-alpha'), cursor: 'page-1-alpha-cursor' },
      ],
      pageTwoEdges: [
        { node: productNode('page-2-gamma'), cursor: 'page-2-gamma-cursor' },
      ],
    })

    try {
      const response = await getProductsRoute(
        new NextRequest('http://localhost/api/products'),
      )
      const body = (await response.json()) as { products: ProductNode[] }

      expect(body.products.map((product) => product.handle)).toEqual([
        'page-1-alpha',
        'page-2-gamma',
      ])
      expect(mock.calls.map((call) => call.operation)).toEqual([
        'GetProducts',
        'GetProducts',
      ])
    } finally {
      mock.restore()
    }
  })

  test('GET /api/products?handles resolves wishlist handles directly', async () => {
    const mock = installShopifyFetchMock({
      handleProducts: {
        'page-2-gamma': productNode('page-2-gamma'),
        missing: null,
      },
    })

    try {
      const response = await getProductsRoute(
        new NextRequest(
          'http://localhost/api/products?handles=page-2-gamma,missing,page-2-gamma',
        ),
      )
      const body = (await response.json()) as { products: ProductNode[] }

      expect(body.products.map((product) => product.handle)).toEqual([
        'page-2-gamma',
      ])
      expect(mock.calls.map((call) => call.operation)).toEqual([
        'GetProductByHandle',
        'GetProductByHandle',
      ])
      expect(mock.calls.map((call) => call.variables.handle)).toEqual([
        'page-2-gamma',
        'missing',
      ])
    } finally {
      mock.restore()
    }
  })
})
