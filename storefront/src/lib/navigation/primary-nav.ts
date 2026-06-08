export interface NavLinkItem {
  href: string
  label: string
}

/** Primary header / mobile drawer links — same order everywhere. */
export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  { href: '/kolekcie', label: 'Všetky kategórie' },
  { href: '/produkty', label: 'Produkty' },
  { href: '/o-nas', label: 'O nás' },
  { href: '/vyhladavanie', label: 'Vyhľadávanie' },
]
