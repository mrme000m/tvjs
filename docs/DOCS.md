# Documentation

### All the project is now JSDoc-ed :)

## Event listeners (unsubscribe)

All `onX(...)` registration methods return an *unsubscribe* function.

Example:

```js
const off = chart.onUpdate((changes) => {
	console.log('update', changes);
});

// later
off();
```

This helps long-running processes avoid accumulating listeners.

## Timestamps & time units

- Chart candles/periods (`chart.periods`) use **unix seconds** (`time` is seconds).
- Strategy/Study `$time` values are also typically **unix seconds**.
- Some built-in indicator options (e.g. volume profile) historically used `Date.now()` defaults,
	which are **unix milliseconds**. When setting options like `first_bar_time` / `last_bar_time`,
	prefer matching what that specific built-in expects.

## Client "logged" event

`client.onLogged(cb)` fires when the websocket handshake/session payload is received
(a packet containing `session_id`).

Notes:

- This does **not** mean your TradingView user is authenticated; it means the socket session is established.
- Authenticated clients still require valid `token`/`signature` cookies so the library can fetch an auth token.
