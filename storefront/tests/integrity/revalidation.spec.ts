import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Cache revalidation security', () => {
  test('revalidation secret is only accepted from the request header', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/revalidate/route.ts')
    expect(fs.existsSync(routePath)).toBe(true)

    const content = fs.readFileSync(routePath, 'utf8')
    expect(content).toContain("request.headers.get('x-revalidation-secret')")
    expect(content).not.toContain("request.nextUrl.searchParams.get('secret')")
  })
})
