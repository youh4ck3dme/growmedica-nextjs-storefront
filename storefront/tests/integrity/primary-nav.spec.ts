import { test, expect } from '@playwright/test'
import { PRIMARY_NAV_LINKS } from '../../src/lib/navigation/primary-nav'

test.describe('Primary navigation', () => {
  test('desktop header exposes all primary links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const nav = page.locator('nav[aria-label="Hlavná navigácia"]')
    await expect(nav).toBeVisible()

    for (const link of PRIMARY_NAV_LINKS) {
      await expect(nav.locator(`a[href="${link.href}"]`).first()).toBeVisible()
    }
  })

  test('mobile drawer lists primary links before categories', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await page.locator('#mobile-nav-toggle').click()
    await expect(page.locator('#mobile-nav')).toBeVisible()

    const primary = page.locator('[data-testid="mobile-nav-primary"] a')
    await expect(primary).toHaveCount(PRIMARY_NAV_LINKS.length)

    for (let i = 0; i < PRIMARY_NAV_LINKS.length; i++) {
      await expect(primary.nth(i)).toHaveAttribute('href', PRIMARY_NAV_LINKS[i].href)
      await expect(primary.nth(i)).toContainText(PRIMARY_NAV_LINKS[i].label)
    }

    const categories = page.locator('[data-testid="mobile-nav-categories"]')
    if ((await categories.count()) > 0) {
      const firstCategoryHref = await categories.locator('a').first().getAttribute('href')
      const lastPrimaryHref = await primary.last().getAttribute('href')
      expect(firstCategoryHref).not.toBe(lastPrimaryHref)
    }
  })
})

test.describe('NOOR wordmark logo', () => {
  test.skip(
    process.env.NOOR_DEMO_TEST !== '1',
    'NOOR logo checks run via yarn test:noor-demo',
  )

  test('header, mobile drawer, and footer share NOOR wordmark without icon', async ({ page }) => {
    await page.goto('/')

    for (const selector of ['#site-logo', '.footer-brand-logo']) {
      const logo = page.locator(selector)
      await expect(logo.locator('.storefront-logo svg')).toBeHidden()
      await expect(logo.locator('.storefront-logo__wordmark')).toContainText('Medica')
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('#mobile-nav-toggle').click()
    const mobileLogo = page.locator('#mobile-nav .site-logo-mark')
    await expect(mobileLogo.locator('.storefront-logo svg')).toBeHidden()
    await expect(mobileLogo.locator('.storefront-logo__wordmark')).toContainText('Medica')
  })
})
