const { PinePermManager } = require('../main');

/**
 * This example creates a pine permission manager
 * and tests all the available functions
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

const pineid = process.argv[2];

if (!pineid) throw Error('Please specify a pine id as first argument');

console.log('Pine ID:', pineid);

const manager = new PinePermManager(
  process.env.SESSION,
  process.env.SIGNATURE,
  pineid,
);

(async () => {
  console.log('Users:', await manager.getUsers());

  console.log('Adding user \'TradingView\'...');

  switch (await manager.addUser('TradingView')) {
    case 'ok':
      console.log('Done !');
      break;
    case 'exists':
      console.log('This user is already authorized');
      break;
    default:
      console.error('Unknown error...');
      break;
  }

  console.log('Users:', await manager.getUsers());

  console.log('Modifying expiration date...');

  const newDate = new Date(Date.now() + 24 * 3600000); // Add one day
  if (await manager.modifyExpiration('TradingView', newDate) === 'ok') {
    console.log('Done !');
  } else console.error('Unknown error...');

  console.log('Users:', await manager.getUsers());

  console.log('Removing expiration date...');

  if (await manager.modifyExpiration('TradingView') === 'ok') {
    console.log('Done !');
  } else console.error('Unknown error...');

  console.log('Users:', await manager.getUsers());

  console.log('Removing user \'TradingView\'...');

  if (await manager.removeUser('TradingView') === 'ok') {
    console.log('Done !');
  } else console.error('Unknown error...');

  console.log('Users:', await manager.getUsers());
})();
