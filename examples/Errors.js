const TradingView = require('../main');

/**
 * This example tests many types of errors
 */

// Report and continue on unhandled errors so tests don't abort
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.message ? err.message : err);
});

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

// Creates a websocket client
const client = new TradingView.Client({
  token: SESSION,
  signature: SIGNATURE,
});

const tests = [
  (next) => { /* Testing "Credentials error" */
    console.info('\nTesting "Credentials error" error:');

    const client2 = new TradingView.Client({
      token: 'FAKE_CREDENTIALS', // Set wrong credentials
    });

    client2.onError((...err) => {
      console.error(' => Client error:', err);
      client2.end();
      next();
    });
  },

  (next) => { /* Testing "Invalid symbol" */
    console.info('\nTesting "Invalid symbol" error:');

    const chart = new client.Session.Chart();
    chart.onError((...err) => { // Listen for errors
      console.error(' => Chart error:', err);
      chart.delete();
      next();
    });

    chart.setMarket('XXXXX'); // Set a wrong market
  },

  (next) => { /* Testing "Invalid timezone" */
    console.info('\nTesting "Invalid timezone" error:');

    const chart = new client.Session.Chart();
    chart.onError((...err) => { // Listen for errors
      console.error(' => Chart error:', err);
      next();
    });

    chart.setMarket('BINANCE:BTCEUR'); // Set a market
    chart.setTimezone('Nowhere/Nowhere'); // Set a fake timezone
  },

  (next) => { /* Testing "Custom timeframe" */
    console.info('\nTesting "Custom timeframe" error:');

    const chart = new client.Session.Chart();
    chart.onError((...err) => { // Listen for errors
      console.error(' => Chart error:', err);
      chart.delete();
      next();
    });

    chart.setMarket('BINANCE:BTCEUR', { // Set a market
      timeframe: '20', // Set a custom timeframe
      /*
        Timeframe '20' isn't available because we are
        not logged in as a premium TradingView account
      */
    });
  },

  (next) => { /* Testing "Invalid timeframe" */
    console.info('\nTesting "Invalid timeframe" error:');

    const chart = new client.Session.Chart();
    chart.onError((...err) => { // Listen for errors
      console.error(' => Chart error:', err);
      next();
    });

    chart.setMarket('BINANCE:BTCEUR', { // Set a market
      timeframe: 'XX', // Set a wrong timeframe
    });
  },

  (next) => { /* Testing "Study not auth" */
    console.info('\nTesting "Study not auth" error:');

    const chart = new client.Session.Chart();
    chart.onError((...err) => { // Listen for errors
      console.error(' => Chart error:', err);
      next();
    });

    chart.setMarket('BINANCE:BTCEUR', { // Set a market
      timeframe: '15',
      type: 'Renko',
    });

    chart.onUpdate(() => {
      console.log('DATA', chart.periods[0]);
    });
  },

  (next) => { /* Testing "Set the market before" */
    console.info('\nTesting "Set the market before..." error:');

    const chart = new client.Session.Chart();
    chart.onError((...err) => { // Listen for errors
      console.error(' => Chart error:', err);
      chart.delete();
      next();
    });

    chart.setSeries('15'); // Set series before setting the market
  },

  (next) => { /* Testing "Inexistent indicator" */
    console.info('\nTesting "Inexistent indicator" error:');

    TradingView.getIndicator('STD;XXXXXXX')
      .catch((err) => {
        console.error(' => API error:', [err.message]);
        next();
      });
  },

  async (next) => { /* Testing "Invalid value" */
    console.info('\nTesting "Invalid value" error:');

    const chart = new client.Session.Chart();
    chart.setMarket('BINANCE:BTCEUR'); // Set a market

    const ST = await TradingView.getIndicator('STD;Supertrend');
    ST.setOption('Factor', -1); // This will cause an error

    const Supertrend = new chart.Study(ST);
    Supertrend.onError((...err) => {
      console.error(' => Study error:', err);
      chart.delete();
      next();
    });
  },
];

(async () => {
  // eslint-disable-next-line no-restricted-syntax, no-await-in-loop
  for (const t of tests) await new Promise(t);
  console.log(`\nTests ${tests.length}/${tests.length} done !`);
})();
