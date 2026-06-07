'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { AiProductSummary, RecommendApiResponse } from '@/lib/ai/schemas'
import { cn, getProductUrl } from '@/lib/utils'

export function SupplementFinder() {
  const [input, setInput] = useState('')
  const [recommendations, setRecommendations] = useState<RecommendApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: input.trim() }),
      })

      const data = (await response.json()) as RecommendApiResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? 'Chyba pri spracovaní požiadavky.')
      }

      setRecommendations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať odporúčania.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-2 text-(--color-text)">Nájdite vhodný doplnok</h2>
        <p className="text-sm text-(--color-text-muted) mb-6">
          AI asistent vám pomôže nájsť produkty z našej ponuky. Nie je to lekárska rada.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Popíšte svoje potreby (napr. viac energie na tréning)"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={loading}
            className={cn(
              'w-full p-3 border border-(--color-border) rounded-lg',
              'text-(--color-text) bg-(--color-surface)',
              'placeholder:text-(--color-text-muted)',
              'focus:outline-none focus:ring-2 focus:ring-(--color-primary)',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="Popíšte svoje potreby pre hľadanie doplnkov"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            disabled={!input.trim()}
            fullWidth
          >
            {loading ? 'Vyhľadávam…' : 'Nájsť doplnky'}
          </Button>
        </form>

        {loading && (
          <div className="mt-6 space-y-4" aria-live="polite">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 p-4 border border-(--color-error) rounded-lg bg-(--color-surface-2) text-(--color-error)"
          >
            {error}
          </div>
        )}

        {recommendations && !loading && (
          <div className="mt-6 space-y-6">
            <div className="p-4 border border-(--color-border) rounded-lg bg-(--color-surface-2)">
              <p className="text-(--color-text)">{recommendations.summary}</p>
              <p className="mt-4 text-sm text-(--color-text-muted)">
                {recommendations.reasoningForUser}
              </p>
            </div>

            {recommendations.recommendedProducts.length > 0 ? (
              <ProductLinkList
                heading="Odporúčané produkty"
                products={recommendations.recommendedProducts}
              />
            ) : (
              <EmptyState
                title="Nenašli sa vhodné produkty"
                description={recommendations.reasoningForUser}
                icon="search"
              />
            )}

            {recommendations.bundleSuggestion && recommendations.bundleProducts.length > 0 && (
              <div className="p-4 border border-(--color-border) rounded-lg bg-(--color-surface-2)">
                <h3 className="font-semibold mb-2 text-(--color-text)">
                  {recommendations.bundleSuggestion.title}
                </h3>
                <p className="text-(--color-text-muted) mb-3">
                  {recommendations.bundleSuggestion.cta}
                </p>
                <ProductLinkList products={recommendations.bundleProducts} />
              </div>
            )}

            {recommendations.warnings.length > 0 && (
              <div
                role="alert"
                className="p-4 border border-(--color-warning) rounded-lg bg-(--color-surface-2)"
              >
                <h4 className="font-semibold mb-2 text-(--color-warning)">Upozornenia</h4>
                <ul className="list-disc pl-5 space-y-1 text-(--color-text)">
                  {recommendations.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function ProductLinkList({
  heading,
  products,
}: {
  heading?: string
  products: AiProductSummary[]
}) {
  return (
    <div>
      {heading && <h3 className="text-lg font-semibold mb-3 text-(--color-text)">{heading}</h3>}
      <ul className="list-disc pl-5 space-y-2">
        {products.map((product) => (
          <li key={product.handle} className="text-(--color-text)">
            <Link
              href={getProductUrl(product.handle)}
              className="underline hover:text-(--color-primary) transition-colors"
            >
              {product.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
