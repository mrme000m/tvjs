const TradingView = require('../main');

/**
 * This example tests custom timeframes like 1 second
 */

// dotenv + CLI flags support
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

if (!SESSION || !SIGNATURE) {
  console.error('This example requires SESSION and SIGNATURE cookies to use custom timeframes. Provide them via .env or CLI: --session <SESSION> --signature <SIGNATURE>');
  process.exit(1);
}

const client = new TradingView.Client({
  token: SESSION,
  signature: SIGNATURE,
});

const chart = new client.Session.Chart();
chart.setTimezone('Europe/Paris');

try {
  chart.setMarket('CAPITALCOM:US100', {
    timeframe: '1S',
    range: 10,
  });
} catch (err) {
  // Some validators or accounts may not support '1S' (1 second). Fallback to 1 minute.
  console.warn("'1S' timeframe not supported in this environment, falling back to 1 minute ('1').");
  chart.setMarket('CAPITALCOM:US100', {
    timeframe: '1',
    range: 10,
  });
}

chart.onSymbolLoaded(() => {
  console.log(chart.infos.name, 'loaded !');
});

chart.onUpdate(() => {
  console.log('OK', chart.periods);
  client.end();
});
