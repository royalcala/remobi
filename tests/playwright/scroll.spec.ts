/**
 * Scroll-to-bottom on a real, long scrollback.
 *
 * The ▲/▼ buttons page the *running app* (mouse sequences), so they can only
 * move as far as the app lets them and they need the app to be reading mouse
 * input. The ⤓ button instead moves the client terminal's own scrollback, which
 * is where the history lives, so it must land on the newest line no matter how
 * far up the buffer the viewport sits.
 *
 * xterm 6 keeps the whole buffer but renders only the viewport, so "where am I"
 * is read from the visible rows rather than from a DOM scroller.
 */
import { expect, test } from '@playwright/test'
import { type IsolatedServe, startIsolatedServe } from './isolated-serve'

const bottomButton = '#wt-scroll-buttons button[aria-label="Scroll to bottom"]'

/** The non-blank rows currently on screen. */
async function visibleLines(page: import('@playwright/test').Page): Promise<string[]> {
	return page.evaluate(() =>
		[...document.querySelectorAll('#terminal .xterm-rows > div')]
			.map((row) => (row.textContent || '').trim())
			.filter(Boolean),
	)
}

test('the bottom button returns to the newest line of a long buffer', async ({ page }) => {
	let serve: IsolatedServe | undefined
	try {
		serve = await startIsolatedServe()
		await page.goto(serve.url)
		await page.waitForSelector('#terminal .xterm-rows')

		// Fill the scrollback far beyond one screen.
		await page.locator('#terminal').click()
		await page.keyboard.type('seq 1 500\n')
		await expect.poll(() => visibleLines(page), { timeout: 20_000 }).toContain('500')

		// Scroll up into the history until the newest line is off screen. xterm
		// handles the wheel itself here: this shell has not enabled mouse reporting.
		await page.mouse.move(195, 400)
		for (let i = 0; i < 20 && (await visibleLines(page)).includes('500'); i++) {
			await page.mouse.wheel(0, -1200)
		}
		expect(await visibleLines(page)).not.toContain('500')

		await page.locator(bottomButton).click()
		await expect.poll(() => visibleLines(page)).toContain('500')
	} finally {
		await serve?.close()
	}
})
