const TradingView = require('../main');

/**
 * This examples synchronously fetches data from 3 indicators
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

function getIndicData(indicator) {
  const chart = new client.Session.Chart();
  chart.setMarket('BINANCE:DOTUSDT');
  const STD = new chart.Study(indicator);

  console.log(`Getting "${indicator.description}"...`);

  return new Promise((res) => {
    STD.onUpdate(() => {
      res(STD.periods);
      console.log(`"${indicator.description}" done !`);
    });
  });
}

(async () => {
  console.log('Getting all indicators...');

  const indicData = await Promise.all([
    await TradingView.getIndicator('PUB;3lEKXjKWycY5fFZRYYujEy8fxzRRUyF3'),
    await TradingView.getIndicator('PUB;5nawr3gCESvSHQfOhrLPqQqT4zM23w3X'),
    await TradingView.getIndicator('PUB;vrOJcNRPULteowIsuP6iHn3GIxBJdXwT'),
  ].map(getIndicData));

  console.log(indicData);
  console.log('All done !');

  client.end();
})();
