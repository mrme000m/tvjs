import { describe, it, expect, vi } from 'vitest';

describe('Lifecycle edge cases (unit, no network)', () => {
	it('Replay methods reject when replay mode is not enabled', async () => {
		// Create a ChartSession with a stubbed client bridge so there is no websocket/network.
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const chartSessionFactory = require('../src/chart/session');
		const clientBridge = { sessions: {}, send: vi.fn() };
		const ChartSession = chartSessionFactory(clientBridge);
		const chart = new ChartSession();

		await expect(chart.replayStep(1)).rejects.toThrow('No replay session');
		await expect(chart.replayStart(100)).rejects.toThrow('No replay session');
		await expect(chart.replayStop()).rejects.toThrow('No replay session');

		chart.delete();
	});

	it('QuoteMarket unsubscribes only after last listener closes', () => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const quoteMarketFactory = require('../src/quote/market');
		const send = vi.fn();
		const symbolListeners: Record<string, any[]> = {};
		const QuoteMarket = quoteMarketFactory({
			sessionID: 'qs_test',
			symbolListeners,
			send,
		});

		const symbol = 'BINANCE:BTCEUR';
		const key = `=${JSON.stringify({ session: 'regular', symbol })}`;

		const m1 = new QuoteMarket(symbol);
		const m2 = new QuoteMarket(symbol);

		// Only one subscribe for the symbol.
		expect(send).toHaveBeenCalledWith('quote_add_symbols', ['qs_test', key]);
		expect(send.mock.calls.filter((c) => c[0] === 'quote_add_symbols').length).toBe(1);

		m1.close();
		// Still one active listener, should not unsubscribe.
		expect(send.mock.calls.some((c) => c[0] === 'quote_remove_symbols')).toBe(false);

		// Closing the last listener unsubscribes and clears the key.
		m2.close();
		expect(send).toHaveBeenCalledWith('quote_remove_symbols', ['qs_test', key]);
		expect(symbolListeners[key]).toBeUndefined();
	});

	it('QuoteMarket reuses freed listener slots (no unbounded growth)', () => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const quoteMarketFactory = require('../src/quote/market');
		const send = vi.fn();
		const symbolListeners: Record<string, any[]> = {};
		const QuoteMarket = quoteMarketFactory({
			sessionID: 'qs_test',
			symbolListeners,
			send,
		});

		const symbol = 'BINANCE:ETHEUR';
		const key = `=${JSON.stringify({ session: 'regular', symbol })}`;

		const m1 = new QuoteMarket(symbol);
		const m2 = new QuoteMarket(symbol);
		expect(symbolListeners[key].length).toBe(2);

		m1.close();
		// Slot is freed but array length stays 2.
		expect(symbolListeners[key].length).toBe(2);

		const m3 = new QuoteMarket(symbol);
		// Should reuse a null slot, not grow the array.
		expect(symbolListeners[key].length).toBe(2);

		m2.close();
		m3.close();
		expect(symbolListeners[key]).toBeUndefined();
	});
});
