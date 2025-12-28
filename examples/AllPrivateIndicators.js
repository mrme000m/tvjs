const TradingView = require('../main');

/**
 * This example creates a chart with all user's private indicators
 */

// Try to load .env automatically if present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv may be unavailable; continue and rely on process.env or CLI args
}

// Accept optional CLI flags: --session <SESSION> --signature <SIGNATURE>
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
  console.error('Please set your sessionid (SESSION) and signature (SIGNATURE) cookies.');
  console.error('Create a .env file with:');
  console.error('  SESSION=your_session_cookie');
  console.error('  SIGNATURE=your_signature_cookie');
  console.error('Then run:');
  console.error('  npm run example -- examples/AllPrivateIndicators.js');
  console.error('or pass them on the command line:');
  console.error('  node examples/AllPrivateIndicators.js --session <SESSION> --signature <SIGNATURE>');
  process.exit(1);
}

const client = new TradingView.Client({
  token: SESSION,
  signature: SIGNATURE,
});

const chart = new client.Session.Chart();
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: 'D',
});

(async () => {
  const debug = argv.includes('--debug');

  // Use the SESSION and SIGNATURE we resolved earlier to fetch private indicators
  if (debug) console.log('Using SESSION (len):', SESSION ? SESSION.length : 0, 'SIGNATURE (len):', SIGNATURE ? SIGNATURE.length : 0);

  const indicList = await TradingView.getPrivateIndicators(SESSION, SIGNATURE);

  if (!indicList || !indicList.length) {
    console.error('Your account has no private indicators or the provided credentials are invalid.');
    if (debug) console.error('Returned list:', JSON.stringify(indicList, null, 2));
    process.exit(0);
  }

  if (debug) {
    console.log(`Found ${indicList.length} private indicator(s):`);
    indicList.forEach((i, idx) => console.log(`#${idx + 1}: id=${i.id} name='${i.name}' access=${i.access}`));
  }

  // If --list-only was passed, just print the list and exit
  if (argv.includes('--list-only')) process.exit(0);

  for (const indic of indicList) {
    const privateIndic = await indic.get();
    console.log('Loading indicator', indic.name, '...');

    const indicator = new chart.Study(privateIndic);

    indicator.onReady(() => {
      console.log('Indicator', indic.name, 'loaded !');
    });

    indicator.onUpdate(() => {
      console.log('Plot values', indicator.periods);
      console.log('Strategy report', indicator.strategyReport);
    });
  }
})();
