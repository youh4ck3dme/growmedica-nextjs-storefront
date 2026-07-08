import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const STOREFRONT_ROOT = path.join(REPO_ROOT, 'storefront')
const INVENTORY_SCRIPT_PATH = path.join(STOREFRONT_ROOT, 'scripts/fix-shopify-inventory.mjs')
const PACKAGE_JSON_PATH = path.join(STOREFRONT_ROOT, 'package.json')

test.describe('Shopify inventory repair script safety', () => {
  test('defaults to dry-run unless --apply is passed', () => {
    const scriptContent = readFileSync(INVENTORY_SCRIPT_PATH, 'utf8')

    expect(scriptContent).toContain("const apply = parseArgFlag('--apply')")
    expect(scriptContent).toContain("const dryRun = !apply || parseArgFlag('--dry-run')")
  })

  test('package inventory:fix command cannot write by default', () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts['inventory:fix']).toContain('--dry-run')
    expect(packageJson.scripts['inventory:fix:apply']).toContain('--apply')
  })

  test('running the default script without an admin token exits before mutation setup', () => {
    const output = execFileSync('node', ['scripts/fix-shopify-inventory.mjs'], {
      cwd: STOREFRONT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        SHOPIFY_STORE_DOMAIN: 'mock-store.myshopify.com',
        SHOPIFY_ADMIN_ACCESS_TOKEN: '',
      },
      timeout: 5000,
    })

    expect(output).toContain('DRY-RUN')
    expect(output).toContain('Set SHOPIFY_ADMIN_ACCESS_TOKEN')
  })
})
