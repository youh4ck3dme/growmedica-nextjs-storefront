import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import BrandPageHeader from '@/components/ui/BrandPageHeader'
import { BundleGrid } from '@/components/bundle/BundleGrid'
import { BRAND_COPY } from '@/lib/brand'
import { HEALTH_BUNDLE_CATALOG } from '@/lib/bundles/catalog'
import { getBundleProducts } from '@/lib/shopify/products'
import { buildPageMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = buildPageMetadata(
  'Balíčky zdravia',
  'Overené kombinácie biomedicínskych doplnkov GrowMedica.sk za zvýhodnené ceny — imunita, spánok, šport, krása a ďalšie.',
)

function mapProductsByBundleSlug(
  products: Awaited<ReturnType<typeof getBundleProducts>>,
): Map<string, (typeof products)[number]> {
  const map = new Map<string, (typeof products)[number]>()

  for (const product of products) {
    const slugFromHandle = product.handle.startsWith('balicek-')
      ? product.handle.slice('balicek-'.length)
      : null
    if (slugFromHandle) {
      map.set(slugFromHandle, product)
    }
  }

  return map
}

export default async function BalickyPage() {
  let productsByHandle = new Map<string, Awaited<ReturnType<typeof getBundleProducts>>[number]>()

  try {
    const shopifyBundles = await getBundleProducts(100)
    productsByHandle = mapProductsByBundleSlug(shopifyBundles)
  } catch {
    // Shopify not configured
  }

  const liveCount = productsByHandle.size

  return (
    <div className="py-10 lg:py-16 bg-(--color-bg) min-h-[70vh]">
      <Container>
        <BrandPageHeader
          title={BRAND_COPY.bundlesHeading}
          subtitle={BRAND_COPY.bundlesSubheading}
          centered={false}
          className="mb-8"
        />

        {liveCount === 0 && (
          <div className="mb-8 rounded-xl border border-(--color-border) bg-(--color-surface) p-4 text-sm text-(--color-text-muted)">
            <p>
              Katalóg obsahuje <strong>{HEALTH_BUNDLE_CATALOG.length} navrhovaných balíčkov</strong>.
              Produktové stránky sa zobrazia automaticky po vytvorení v Shopify s tagom{' '}
              <code className="text-(--color-text)">balicek-zdravia</code> a handle{' '}
              <code className="text-(--color-text)">balicek-{'{slug}'}</code>.
            </p>
            <p className="mt-2">
              Návod na nastavenie:{' '}
              <Link href="/o-nas" className="text-(--color-primary) underline">
                kontaktujte nás
              </Link>{' '}
              alebo pozrite interný dokument <code>BUNDLE_CATALOG.md</code> v repozitári.
            </p>
          </div>
        )}

        <BundleGrid productsByHandle={productsByHandle} />
      </Container>
    </div>
  )
}
