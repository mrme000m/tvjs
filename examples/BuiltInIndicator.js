const TradingView = require('../main');

/**
 * This example tests built-in indicators like volume-based indicators
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

const volumeProfile = new TradingView.BuiltInIndicator('VbPFixed@tv-basicstudies-241!');

const needAuth = ![
  'VbPFixed@tv-basicstudies-241',
  'VbPFixed@tv-basicstudies-241!',
  'Volume@tv-basicstudies-241',
].includes(volumeProfile.type);

if (needAuth && (!SESSION || !SIGNATURE)) {
  console.error('This built-in indicator requires authentication. Provide SESSION and SIGNATURE via .env or CLI flags: --session <SESSION> --signature <SIGNATURE>');
  process.exit(1);
}

const client = new TradingView.Client(
  needAuth
    ? {
      token: SESSION,
      signature: SIGNATURE,
    }
    : {},
);

const chart = new client.Session.Chart();
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: '60',
  range: 1,
});

/* Required or not, depending on the indicator */
volumeProfile.setOption('first_bar_time', Date.now() - 10 ** 8);
// volumeProfile.setOption('first_visible_bar_time', Date.now() - 10 ** 8);

const VOL = new chart.Study(volumeProfile);
VOL.onUpdate(() => {
  VOL.graphic.horizHists
    .filter((h) => h.lastBarTime === 0) // We only keep recent volume infos
    .sort((a, b) => b.priceHigh - a.priceHigh)
    .forEach((h) => {
      console.log(
        `~ ${Math.round((h.priceHigh + h.priceLow) / 2)} € :`,
        `${'_'.repeat(h.rate[0] / 3)}${'_'.repeat(h.rate[1] / 3)}`,
      );
    });

  client.end();
});
