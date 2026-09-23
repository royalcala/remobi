import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { defaultConfig } from '../src/config'
import { createScrollButtons } from '../src/controls/scroll-buttons'
import { mockTerminalWithSent } from './fixtures'

beforeEach(() => {
	GlobalRegistrator.register()
})

afterEach(() => {
	GlobalRegistrator.unregister()
})

describe('createScrollButtons', () => {
	test('creates container with correct id', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		expect(element.id).toBe('wt-scroll-buttons')
	})

	test('has the page buttons and the bottom button', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		const buttons = element.querySelectorAll('button')
		expect(buttons).toHaveLength(3)
	})

	test('buttons have aria-labels', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		const buttons = element.querySelectorAll('button')
		expect(buttons[0]?.getAttribute('aria-label')).toBe('Page Up')
		expect(buttons[1]?.getAttribute('aria-label')).toBe('Page Down')
		expect(buttons[2]?.getAttribute('aria-label')).toBe('Scroll to bottom')
	})

	test('buttons have correct symbols', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		const buttons = element.querySelectorAll('button')
		expect(buttons[0]?.textContent).toBe('\u25B2')
		expect(buttons[1]?.textContent).toBe('\u25BC')
		expect(buttons[2]?.textContent).toBe('\u2913')
	})

	test('the bottom button moves the local scrollback and sends nothing', () => {
		const term = mockTerminalWithSent()
		let bottomed = 0
		term.scrollToBottom = () => {
			bottomed += 1
		}
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		document.body.appendChild(element)

		element.querySelectorAll('button')[2]?.click()

		expect(bottomed).toBe(1)
		// Unlike ▲/▼ this is not a key sequence for the app.
		expect(term.sent).toHaveLength(0)
	})

	test('click sends wheel-up sequence by default', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		document.body.appendChild(element)

		const upBtn = element.querySelectorAll('button')[0]
		upBtn?.click()

		expect(term.sent).toHaveLength(1)
		expect(term.sent[0]).toBe('\x1b[<64;6;11M')
	})

	test('click sends wheel-down sequence by default', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		document.body.appendChild(element)

		const downBtn = element.querySelectorAll('button')[1]
		downBtn?.click()

		expect(term.sent).toHaveLength(1)
		expect(term.sent[0]).toBe('\x1b[<65;6;11M')
	})

	test('falls back to centre when buffer is unavailable', () => {
		const term = mockTerminalWithSent()
		const { buffer: _, ...termNoBuffer } = term
		const { element } = createScrollButtons(termNoBuffer, defaultConfig.gestures.scroll)
		document.body.appendChild(element)

		const buttons = element.querySelectorAll('button')
		buttons[0]?.click()
		buttons[1]?.click()

		expect(termNoBuffer.sent).toEqual(['\x1b[<64;40;12M', '\x1b[<65;40;12M'])
	})

	test('cursor at origin sends cell (1,1)', () => {
		const term = mockTerminalWithSent()
		term.buffer = { active: { cursorX: 0, cursorY: 0 } }
		const { element } = createScrollButtons(term, defaultConfig.gestures.scroll)
		document.body.appendChild(element)

		element.querySelectorAll('button')[0]?.click()
		expect(term.sent[0]).toBe('\x1b[<64;1;1M')
	})

	test('keys strategy sends page keys', () => {
		const term = mockTerminalWithSent()
		const { element } = createScrollButtons(term, {
			enabled: true,
			sensitivity: 40,
			strategy: 'keys',
			wheelIntervalMs: 24,
		})
		document.body.appendChild(element)

		const buttons = element.querySelectorAll('button')
		buttons[0]?.click()
		buttons[1]?.click()

		expect(term.sent).toEqual(['\x1b[5~', '\x1b[6~'])
	})
})
