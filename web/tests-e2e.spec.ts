import { test, expect } from '@playwright/test'

test('app loads', async ({ page }) => {
  await page.goto('http://localhost:5173/auth')
  await expect(page.locator('text=Sign in')).toBeVisible()
})