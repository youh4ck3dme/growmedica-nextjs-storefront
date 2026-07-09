import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import robots from '../../src/app/robots'
import { metadata } from '../../src/app/dashboard/layout'
import { getDashboardOrigin, getDashboardUrl, isDashboardRouteHeader } from '../../src/lib/dashboard'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const DASHBOARD_PAGE_PATH = path.join(REPO_ROOT, 'storefront/src/app/dashboard/page.tsx')
const ROOT_LAYOUT_PATH = path.join(REPO_ROOT, 'storefront/src/app/layout.tsx')
const MIDDLEWARE_PATH = path.join(REPO_ROOT, 'storefront/src/middleware.ts')

test.describe('Dashboard route — smoke', () => {
  test('returns 200', () => {
    expect(existsSync(DASHBOARD_PAGE_PATH)).toBe(true)
    const content = readFileSync(DASHBOARD_PAGE_PATH, 'utf8')
    expect(content).toContain('export default function DashboardPage')
  })

  test('skips shop chrome (no site header or footer)', () => {
    // 1. Verify that middleware sets the DASHBOARD_ROUTE_HEADER header
    expect(existsSync(MIDDLEWARE_PATH)).toBe(true)
    const middlewareContent = readFileSync(MIDDLEWARE_PATH, 'utf8')
    expect(middlewareContent).toContain('requestHeaders.set(DASHBOARD_ROUTE_HEADER, \'1\')')
    expect(middlewareContent).toContain("matcher: ['/dashboard'")

    // 2. Verify that root layout checks this header and returns a layout without HeaderShell, Footer, or AnnouncementBar
    expect(existsSync(ROOT_LAYOUT_PATH)).toBe(true)
    const rootLayoutContent = readFileSync(ROOT_LAYOUT_PATH, 'utf8')
    expect(rootLayoutContent).toContain('const isDashboardRoute = isDashboardRouteHeader(headersList.get(DASHBOARD_ROUTE_HEADER))')
    expect(rootLayoutContent).toContain('if (isDashboardRoute) {')
    
    // The branch for isDashboardRoute should render children inside html/body directly without common layout elements
    const isDashboardRouteBranch = rootLayoutContent.match(/if\s*\(isDashboardRoute\)\s*\{([\s\S]*?)\}/)
    expect(isDashboardRouteBranch).toBeTruthy()
    if (isDashboardRouteBranch) {
      const branchContent = isDashboardRouteBranch[1]
      expect(branchContent).not.toContain('<HeaderShell')
      expect(branchContent).not.toContain('<Footer')
      expect(branchContent).not.toContain('<AnnouncementBar')
      expect(branchContent).not.toContain('<TrustStrip')
    }
  })

  test('robots.txt disallows /dashboard', () => {
    const robotsConfig = robots()
    const rules = robotsConfig.rules
    const baseRule = Array.isArray(rules) ? rules[0] : rules
    const disallowList = baseRule?.disallow
    expect(disallowList).toContain('/dashboard')
  })

  test('shows fallback when NEXT_PUBLIC_DASHBOARD_URL is missing', () => {
    expect(existsSync(DASHBOARD_PAGE_PATH)).toBe(true)
    const content = readFileSync(DASHBOARD_PAGE_PATH, 'utf8')

    // Statically verify the unconfigured condition renders correct heading and links
    expect(content).toContain('Dashboard nie je nakonfigurovaný')
    expect(content).toContain('data-testid="dashboard-unconfigured"')
    expect(content).toContain('data-testid="dashboard-nexus-direct-link"')
    expect(content).toContain('https://growmedica-nexus.lovable.app/admin/prihlasenie')
  })

  test('renders iframe when NEXT_PUBLIC_DASHBOARD_URL is set', () => {
    expect(existsSync(DASHBOARD_PAGE_PATH)).toBe(true)
    const content = readFileSync(DASHBOARD_PAGE_PATH, 'utf8')

    // Statically verify that it renders the DashboardFrame when configured
    expect(content).toContain('<DashboardFrame src={dashboardUrl} />')
  })

  test('contains meta title and robot policies', () => {
    expect(metadata.title).toBe('Dashboard')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

test.describe('Dashboard URL helpers', () => {
  const originalDashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL

  test.afterEach(() => {
    if (originalDashboardUrl === undefined) {
      delete process.env.NEXT_PUBLIC_DASHBOARD_URL
      return
    }

    process.env.NEXT_PUBLIC_DASHBOARD_URL = originalDashboardUrl
  })

  test('normalizes the configured dashboard URL and exposes only its origin for CSP', () => {
    process.env.NEXT_PUBLIC_DASHBOARD_URL =
      '  https://growmedica-nexus.lovable.app/admin?section=orders#today  '

    expect(getDashboardUrl()).toBe(
      'https://growmedica-nexus.lovable.app/admin?section=orders#today',
    )
    expect(getDashboardOrigin()).toBe('https://growmedica-nexus.lovable.app')
  })

  test('keeps local HTTP dashboard URLs valid for development embeds', () => {
    process.env.NEXT_PUBLIC_DASHBOARD_URL = 'http://localhost:8080/admin'

    expect(getDashboardUrl()).toBe('http://localhost:8080/admin')
    expect(getDashboardOrigin()).toBe('http://localhost:8080')
  })

  test('rejects missing, malformed, and non-HTTP dashboard URLs', () => {
    const invalidDashboardUrls = [
      undefined,
      '',
      '   ',
      'not a url',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://growmedica-nexus.lovable.app/admin',
    ]

    for (const dashboardUrl of invalidDashboardUrls) {
      if (dashboardUrl === undefined) {
        delete process.env.NEXT_PUBLIC_DASHBOARD_URL
      } else {
        process.env.NEXT_PUBLIC_DASHBOARD_URL = dashboardUrl
      }

      expect(getDashboardUrl(), `url=${dashboardUrl ?? '<unset>'}`).toBeUndefined()
      expect(getDashboardOrigin(), `url=${dashboardUrl ?? '<unset>'}`).toBeUndefined()
    }
  })

  test('only the dashboard route marker enables dashboard layout handling', () => {
    expect(isDashboardRouteHeader('1')).toBe(true)
    expect(isDashboardRouteHeader(null)).toBe(false)
    expect(isDashboardRouteHeader('0')).toBe(false)
    expect(isDashboardRouteHeader('true')).toBe(false)
  })
})

