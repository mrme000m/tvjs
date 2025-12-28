/**
 * Example demonstrating the new connection management features
 * 
 * This example shows how to use the new connection management features:
 * - Automatic reconnection with configurable retry attempts
 * - Connection timeout handling
 * - Connection health monitoring with ping/pong
 */

const TradingView = require('../main');

// Create a client with connection management options
const client = new TradingView.Client({
  // Connection management options
  reconnectAttempts: 3,      // Number of reconnection attempts (default: 5)
  reconnectDelay: 3000,      // Delay between reconnections in ms (default: 5000)
  connectionTimeout: 15000,  // Connection timeout in ms (default: 10000)
  pingTimeout: 45000,        // Ping timeout in ms (default: 30000)
  
  // Other options
  debug: true,               // Enable debug mode to see connection events
});

// Set up event handlers to see connection management in action
client.onConnected(() => {
  console.log('✅ Connected to TradingView');
});

client.onDisconnected(() => {
  console.log('❌ Disconnected from TradingView');
});

client.onLogged((session) => {
  console.log('🔐 Logged in to TradingView session:', session.session_id);
});

client.onError((error, ...messages) => {
  console.log('🚨 Client error:', error.message, messages);
});

// Create a chart session
const chart = new client.Session.Chart();

// Set up chart events
chart.onSymbolLoaded(() => {
  console.log(`📈 Chart for ${chart.infos.description} loaded!`);
});

chart.onUpdate(() => {
  if (chart.periods[0]) {
    console.log(`📊 [${chart.infos.description}]: ${chart.periods[0].close} ${chart.infos.currency_id}`);
  }
});

// Set the market
chart.setMarket('BINANCE:BTCEUR', {
  timeframe: 'D',
});

// After 10 seconds, demonstrate manual disconnection and reconnection
setTimeout(() => {
  console.log('\n⏳ Simulating network issue in 10 seconds...');
  
  setTimeout(() => {
    console.log('\n🔌 Simulating connection loss...');
    // This simulates a network issue - in real usage, the client would automatically reconnect
    // Here we just close the connection to demonstrate the reconnection logic
    if (client.isOpen) {
      client.end().then(() => {
        console.log('🔄 Connection closed, would automatically reconnect in a real scenario');
      });
    }
  }, 5000);
}, 10000);

// Clean up after 30 seconds
setTimeout(() => {
  console.log('\n🛑 Closing chart and client...');
  
  chart.delete();
  client.end().then(() => {
    console.log('👋 Client closed');
    process.exit(0);
  });
}, 30000);