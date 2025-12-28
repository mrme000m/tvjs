const TradingView = require('../main');

/**
 * This example tests an indicator that sends graphic data such
 * as 'lines', 'labels', 'boxes', 'tables', 'polygons', etc...
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
  timeframe: '5',
  range: 10000,
});

// TradingView.getIndicator('USER;01efac32df544348810bc843a7515f36').then((indic) => {
// TradingView.getIndicator('PUB;5xi4DbWeuIQrU0Fx6ZKiI2odDvIW9q2j').then((indic) => {
TradingView.getIndicator('STD;Zig_Zag').then((indic) => {
  const STD = new chart.Study(indic);

  STD.onError((...err) => {
    console.log('Study error:', ...err);
  });

  STD.onReady(() => {
    console.log(`STD '${STD.instance.description}' Loaded !`);
  });

  STD.onUpdate(() => {
    console.log('Graphic data:', STD.graphic);
    // console.log('Tables:', changes, STD.graphic.tables);
    // console.log('Cells:', STD.graphic.tables[0].cells());
    client.end();
  });
});
