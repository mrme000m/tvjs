const TradingView = require('../main');

/**
 * This example tests fetching chart data of a number
 * of candles before or after a timestamp
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
  console.error('This example requires SESSION and SIGNATURE cookies. Provide them via .env or CLI: --session <SESSION> --signature <SIGNATURE>');
  process.exit(1);
}

const client = new TradingView.Client({
  token: SESSION,
  signature: SIGNATURE,
});

const chart = new client.Session.Chart();
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: '240',
  range: 2, // Can be positive to get before or negative to get after
  to: 1700000000,
});

// This works with indicators

TradingView.getIndicator('STD;Supertrend').then(async (indic) => {
  console.log(`Loading '${indic.description}' study...`);
  const SUPERTREND = new chart.Study(indic);

  SUPERTREND.onUpdate(() => {
    console.log('Prices periods:', chart.periods);
    console.log('Study periods:', SUPERTREND.periods);
    client.end();
  });
});
