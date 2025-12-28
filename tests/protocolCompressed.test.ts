import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const protocol = require('../src/protocol');

describe('protocol.parseCompressed()', () => {
	it('parses a base64 zip even when the entry name is not empty', async () => {
		const zip = new JSZip();
		zip.file('payload.json', JSON.stringify({ report: { performance: { ok: true } } }));
		const base64 = await zip.generateAsync({ type: 'base64' });

		await expect(protocol.parseCompressed(base64)).resolves.toEqual({
			report: { performance: { ok: true } },
		});
	});

	it('throws a clear error for an empty zip', async () => {
		const zip = new JSZip();
		const base64 = await zip.generateAsync({ type: 'base64' });

		await expect(protocol.parseCompressed(base64)).rejects.toThrow(
			'Compressed payload contained no files',
		);
	});
});
