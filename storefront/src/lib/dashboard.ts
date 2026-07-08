/** Public iframe target for growmedica-nexus admin (validated URL or undefined). */
export function getDashboardUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim()
  if (!raw) return undefined

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

/** Origin extracted from NEXT_PUBLIC_DASHBOARD_URL for CSP frame-src. */
export function getDashboardOrigin(): string | undefined {
  const url = getDashboardUrl()
  if (!url) return undefined

  try {
    return new URL(url).origin
  } catch {
    return undefined
  }
}

/** CSP frame-src value for the dashboard iframe target. */
export function getDashboardFrameSrcDirective(): string {
  const origin = getDashboardOrigin()
  return origin ? `'self' ${origin}` : "'self'"
}

export const DASHBOARD_ROUTE_HEADER = 'x-dashboard-route'

export function isDashboardRouteHeader(value: string | null): boolean {
  return value === '1'
}
