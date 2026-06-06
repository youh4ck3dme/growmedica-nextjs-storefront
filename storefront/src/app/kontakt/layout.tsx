import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kontakt | Grow Medical',
  description: 'Kontaktujte nás — GrowMedica s.r.o., BELLOVA 6, KOŠICE. E-mail: info@growmedica.sk',
}

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return children
}
