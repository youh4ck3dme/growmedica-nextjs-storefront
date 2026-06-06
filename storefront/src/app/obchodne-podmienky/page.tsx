import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'

export const metadata: Metadata = {
  title: 'Obchodné podmienky | Grow Medical',
}

export default function ObchodnePodmienky() {
  return (
    <div className="py-12 lg:py-20 bg-[var(--color-bg)] min-h-screen">
      <Container>
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-[var(--shadow-card)] border border-[var(--color-border)]">
          <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-8 font-montserrat">Obchodné podmienky</h1>
          <div className="prose prose-lg text-[var(--color-text-muted)] space-y-6">
            <p className="italic bg-gray-50 p-4 rounded-lg">Poznámka: Tu vložte vaše presné znenie Všeobecných obchodných podmienok (VOP).</p>
            <h2 className="text-xl font-bold text-[var(--color-text)] mt-8 mb-4">1. Úvodné ustanovenia</h2>
            <p>Tieto obchodné podmienky upravujú vzájomné práva a povinnosti medzi predávajúcim a kupujúcim...</p>
            <h2 className="text-xl font-bold text-[var(--color-text)] mt-8 mb-4">2. Uzavretie kúpnej zmluvy</h2>
            <p>Zmluva je uzavretá potvrdením objednávky zo strany predávajúceho...</p>
          </div>
        </div>
      </Container>
    </div>
  )
}
