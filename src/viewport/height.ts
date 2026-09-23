import { isKeyboardOpen } from '../util/keyboard'
import { resizeTerm } from '../util/terminal'
import { checkLandscapeKeyboard } from './landscape'

export function viewportHeight(
	vp: Pick<VisualViewport, 'height' | 'offsetTop'> | null,
	fallbackHeight: number,
	includeOffsetTop: boolean,
): number {
	if (!vp) return fallbackHeight
	return includeOffsetTop ? vp.height + vp.offsetTop : vp.height
}

export function lockDocumentHeight(height: string): void {
	document.documentElement.style.setProperty('height', height, 'important')
	document.documentElement.style.setProperty('max-height', height, 'important')
	document.documentElement.style.setProperty('overflow', 'hidden', 'important')
	document.documentElement.style.setProperty('overscroll-behavior', 'none', 'important')

	document.body.style.setProperty('min-height', '0', 'important')
	document.body.style.setProperty('height', height, 'important')
	document.body.style.setProperty('max-height', height, 'important')
	document.body.style.setProperty('overflow', 'hidden', 'important')
	document.body.style.setProperty('overscroll-behavior', 'none', 'important')
}

/**
 * Set by the most recent `initHeightManager`. Hiding or showing the toolbar
 * changes its height without any viewport event, so whoever does it (see the
 * `toolbar-toggle` action) has to ask for a relayout explicitly.
 */
let relayout: (() => void) | null = null

/** Recompute the terminal height after the toolbar changed on its own. */
export function requestRelayout(): void {
	relayout?.()
}

/**
 * Manage terminal height to account for the toolbar and virtual keyboard.
 * Uses visualViewport API when available for accurate keyboard detection.
 */
export function initHeightManager(toolbar: HTMLDivElement): void {
	let pendingResize = 0

	function updateHeight(): void {
		pendingResize = 0
		checkLandscapeKeyboard(toolbar)

		const vp = window.visualViewport
		const kbOpen = isKeyboardOpen()
		const vh = viewportHeight(vp, window.innerHeight, kbOpen)
		const tbH = kbOpen ? 0 : toolbar.offsetHeight || 90
		const h = `${vh - tbH}px`

		lockDocumentHeight(h)
		resizeTerm()
	}

	function scheduleResize(): void {
		if (!pendingResize) {
			pendingResize = requestAnimationFrame(updateHeight)
		}
	}

	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', scheduleResize)
		window.visualViewport.addEventListener('scroll', scheduleResize)
	}
	window.addEventListener('resize', scheduleResize)
	window.addEventListener('orientationchange', () => {
		setTimeout(scheduleResize, 200)
	})

	relayout = scheduleResize
	scheduleResize()
}
