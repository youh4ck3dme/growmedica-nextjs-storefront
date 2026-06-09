import Link from 'next/link'
import {
  BUNDLE_CATEGORY_LABELS,
  getBundleProductHandle,
  type HealthBundle,
} from '@/lib/bundles/catalog'
import { getProductUrl } from '@/lib/utils'
import type { ProductListItem } from '@/lib/shopify/types'

interface BundleCardProps {
  bundle: HealthBundle
  product?: ProductListItem | null
}

export function BundleCard({ bundle, product }: BundleCardProps) {
  const href = product
    ? getProductUrl(product.handle)
    : `/balicky#${bundle.slug}`

  const price = product?.variants.edges[0]?.node.price ?? product?.priceRange.minVariantPrice
  const compareAt =
    product?.variants.edges[0]?.node.compareAtPrice ??
    product?.compareAtPriceRange.minVariantPrice

  const hasShopifyPrice = Boolean(product && price)
  const hasDiscount =
    hasShopifyPrice &&
    compareAt &&
    parseFloat(compareAt.amount) > parseFloat(price!.amount)

  return (
    <Link
      href={href}
      className="bundle-card liquid-glass liquid-glass--heavy"
      id={product ? undefined : bundle.slug}
    >
      <span className="bundle-card__badge">−{bundle.discountPercent} %</span>
      <h3 className="bundle-card__title">{bundle.name}</h3>
      <ul className="bundle-card__items">
        {bundle.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {bundle.disclaimer && (
        <p className="text-xs text-(--color-text-muted) mb-3 italic">{bundle.disclaimer}</p>
      )}
      <div className="bundle-card__footer">
        <span className="bundle-card__category">
          {BUNDLE_CATEGORY_LABELS[bundle.category]}
        </span>
        {hasShopifyPrice ? (
          <span className="text-sm font-bold text-(--color-primary)">
            {hasDiscount && (
              <span className="text-(--color-text-muted) line-through font-normal mr-1.5">
                {compareAt!.amount} €
              </span>
            )}
            {price!.amount} €
          </span>
        ) : (
          <span className="text-xs font-semibold text-(--color-text-muted)">
            SKU: {getBundleProductHandle(bundle.slug)}
          </span>
        )}
      </div>
    </Link>
  )
}
