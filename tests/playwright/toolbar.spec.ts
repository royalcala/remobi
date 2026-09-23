/**
 * Toolbar behaviour on a phone-width viewport.
 *
 * Two things are covered:
 *
 * 1. The `toolbar-toggle` action hides and shows the button bar. It is exercised
 *    from a floating button because that is the only control that survives the
 *    toolbar being hidden — a toolbar button could hide the bar but never bring
 *    it back.
 * 2. Row 1 keeps every button inside the viewport. Row 1 has a per-button
 *    min-width, so with the ten stock buttons a narrow phone used to overflow the
 *    row and clip the outermost buttons (`Esc` and the Enter key).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { type IsolatedServe, startIsolatedServe } from './isolated-serve'

/** Buttons whose box falls outside the viewport, plus the row's own overflow. */
async function rowOverflow(page: import('@playwright/test').Page, rowIndex: number) {
	return page.evaluate((index) => {
		const row = document.querySelectorAll('#wt-toolbar .wt-row')[index]
		if (!row) throw new Error(`row ${index} not found`)
		const clipped = [...row.querySelectorAll('button')].filter((button) => {
			const box = button.getBoundingClientRect()
			return box.left < 0 || box.right > window.innerWidth
		})
		return {
			clipped: clipped.map((button) => button.textContent),
			overflow: row.scrollWidth - row.clientWidth,
		}
	}, rowIndex)
}

test.describe('toolbar', () => {
	test('row 1 stays inside the viewport on a narrow phone', async ({ page }) => {
		for (const width of [390, 360]) {
			await page.setViewportSize({ width, height: 800 })
			await page.goto('/')
			await page.waitForSelector('#wt-toolbar .wt-row:first-child button')

			expect(await rowOverflow(page, 0)).toEqual({ clipped: [], overflow: 0 })
		}
	})

	test('the floating toggle hides and shows the toolbar', async ({ page }) => {
		const dir = mkdtempSync(join(tmpdir(), 'remobi-toolbar-spec-'))
		const configPath = join(dir, 'remobi.config.ts')
		writeFileSync(
			configPath,
			[
				'export default {',
				'  floatingButtons: [',
				"    { position: 'top-left', buttons: [",
				"      { id: 'bar', label: 'Bar', description: 'Hide or show the button bar',",
				"        action: { type: 'toolbar-toggle' } },",
				'    ] },',
				'  ],',
				'}',
				'',
			].join('\n'),
		)

		let serve: IsolatedServe | undefined
		try {
			serve = await startIsolatedServe({ config: configPath })
			await page.goto(serve.url)
			await page.waitForSelector('#wt-toolbar')

			const toggle = page.locator('.wt-floating-group button', { hasText: 'Bar' })
			const toolbar = page.locator('#wt-toolbar')
			// The top controls sit over the terminal's top-right corner, where a
			// full-screen app draws its own controls, so they travel with the bar.
			const topControls = page.locator('#wt-font-controls')
			await expect(toggle).toBeVisible()
			await expect(toolbar).toBeVisible()
			await expect(topControls).toBeVisible()

			await toggle.click()
			await expect(toolbar).toBeHidden()
			await expect(topControls).toBeHidden()
			// The floating button outlives the chrome, so it can all come back.
			await expect(toggle).toBeVisible()

			await toggle.click()
			await expect(toolbar).toBeVisible()
			await expect(topControls).toBeVisible()
		} finally {
			await serve?.close()
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
