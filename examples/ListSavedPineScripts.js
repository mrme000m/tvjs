const TradingView = require('../main');

/**
 * Example: List saved/private Pine scripts for the authenticated user
 * Usage:
 *  - Create a .env with SESSION and SIGNATURE or pass via CLI:
 *      node examples/ListSavedPineScripts.js --session <SESSION> --signature <SIGNATURE> [--json] [--details]
 *  - --json prints JSON output
 *  - --details will fetch each indicator metadata (may be slower)
 */

try { require('dotenv').config(); } catch (e) {}
const argv = process.argv.slice(2);
let cliSession = null;
let cliSignature = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--session') { cliSession = argv[i + 1]; i++; }
  else if (argv[i] === '--signature') { cliSignature = argv[i + 1]; i++; }
}

const SESSION = cliSession || process.env.SESSION;
const SIGNATURE = cliSignature || process.env.SIGNATURE;
const json = argv.includes('--json');
const details = argv.includes('--details');
const outPathFlagIndex = argv.indexOf('--out');
const outPath = outPathFlagIndex >= 0 ? argv[outPathFlagIndex + 1] : null;

if (!SESSION || !SIGNATURE) {
  console.error('This example requires SESSION and SIGNATURE (provide via .env or CLI).');
  console.error('Usage: node examples/ListSavedPineScripts.js --session <SESSION> --signature <SIGNATURE> [--json] [--details] [--out <file>]');
  process.exit(1);
}

(async () => {
  try {
    const list = await TradingView.getPrivateIndicators(SESSION, SIGNATURE);
    if (!list || !list.length) {
      console.log('No saved private scripts found for this account.');
      return;
    }

    if (json) {
      if (!details) {
        const out = list.map((i) => ({ id: i.id, name: i.name, access: i.access, kind: i.type || 'study' }));
        if (outPath) {
          require('fs').writeFileSync(outPath, JSON.stringify(out, null, 2));
          console.log(`Wrote ${out.length} entries to ${outPath}`);
        } else console.log(JSON.stringify(out, null, 2));
        return;
      }

      // If details requested, fetch full indicator metadata for each and embed
      const expanded = [];
      for (const i of list) {
        try {
          const ind = await i.get();
          const inputs = Object.keys(ind.inputs || {}).map((key) => ({
            id: key,
            name: ind.inputs[key].name,
            inline: ind.inputs[key].inline,
            internalID: ind.inputs[key].internalID,
            tooltip: ind.inputs[key].tooltip,
            type: ind.inputs[key].type,
            default: ind.inputs[key].value,
            isHidden: !!ind.inputs[key].isHidden,
            isFake: !!ind.inputs[key].isFake,
            options: ind.inputs[key].options || null,
          }));

          expanded.push({
            id: i.id,
            name: i.name,
            access: i.access,
            kind: i.type || 'study',
            pineId: ind.pineId,
            pineVersion: ind.pineVersion,
            inputs,
          });
        } catch (e) {
          expanded.push({ id: i.id, name: i.name, access: i.access, error: String(e.message || e) });
        }
      }
      if (outPath) {
        require('fs').writeFileSync(outPath, JSON.stringify(expanded, null, 2));
        console.log(`Wrote ${expanded.length} entries to ${outPath}`);
      } else console.log(JSON.stringify(expanded, null, 2));
      return;
    }

    console.log(`Found ${list.length} saved scripts:`);
    for (let idx = 0; idx < list.length; idx++) {
      const i = list[idx];
      if (details) {
        try {
          const ind = await i.get();
          console.log(`#${idx + 1}: ${i.id} - ${i.name} (version=${ind.pineVersion}) inputs=${Object.keys(ind.inputs || {}).length} type=${i.type || 'study'}`);
        } catch (e) {
          console.log(`#${idx + 1}: ${i.id} - ${i.name} (error fetching metadata: ${e.message || e})`);
        }
      } else {
        console.log(`#${idx + 1}: ${i.id} - ${i.name}`);
      }
    }
  } catch (e) {
    console.error('Error listing saved scripts:', e?.response?.data?.detail || e.message || e);
    process.exit(1);
  }
})();
