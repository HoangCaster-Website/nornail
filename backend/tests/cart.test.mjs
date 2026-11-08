import test from 'node:test';
import assert from 'node:assert/strict';
import '../../cart.js';
const bag = globalThis.nornailsCart;
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };

test('basket stores only bounded identifiers/quantities and keeps unknown prices distinct from zero', () => {
  storage.clear();
  bag.add('w1', 2); bag.add('w2'); bag.add('w1');
  assert.deepEqual(bag.read(), [{ id:'w1',quantity:3 },{ id:'w2',quantity:1 }]);
  assert.throws(() => bag.add('w1',18));
  assert.equal(bag.read()[0].quantity,3);
  for (const input of [[{id:'bad<script>',quantity:1}],[{id:'w1',quantity:0}],[{id:'w1',quantity:1.5}],[{id:'w1',quantity:1},{id:'w1',quantity:2}]]) assert.throws(() => bag.validate(input));
  const resolved = bag.resolve(bag.read(), [{ id:'w1',active:true,priceOre:10000 },{ id:'w2',active:true,priceOre:null }]);
  assert.equal(resolved.subtotal,null);
  assert.equal(bag.resolve(bag.read(),[{id:'w1',active:true,priceOre:10000},{id:'w2',active:true,priceOre:5000}]).subtotal,35000);
  assert.equal(bag.resolve(bag.read(),[{id:'w1',active:true,priceOre:10000}]).lines[1].product,null);
});

test('checkout attempts survive retries and settlement removes purchased quantities once', () => {
  storage.clear(); bag.write([{id:'w1',quantity:2},{id:'w2',quantity:1}]);
  const first = bag.intent(bag.read(),'shipping','en');
  assert.equal(bag.intent([...bag.read()].reverse(),'shipping','en').requestId,first.requestId);
  bag.saveIntent({...first,sessionId:'cs_test_verified_cart'});
  bag.add('w1',1); bag.add('buffer',2);
  bag.settled('cs_test_unrelated'); assert.equal(bag.read()[0].quantity,3);
  bag.settled('cs_test_verified_cart');
  assert.deepEqual(bag.read(),[{id:'w1',quantity:1},{id:'buffer',quantity:2}]);
  bag.settled('cs_test_verified_cart');
  assert.deepEqual(bag.read(),[{id:'w1',quantity:1},{id:'buffer',quantity:2}]);
  assert.notEqual(bag.intent(bag.read(),'pickup','en').requestId,first.requestId);
  const repeat = bag.intent([{id:'w1',quantity:1},{id:'buffer',quantity:2}],'pickup','en');
  bag.saveIntent({...repeat,sessionId:'cs_test_order_return'});
  bag.settled(null,repeat.requestId);
  assert.deepEqual(bag.read(),[]);
  bag.write([{id:'w1',quantity:1},{id:'buffer',quantity:2}]);
  assert.notEqual(bag.intent(bag.read(),'pickup','en').requestId,repeat.requestId);
});

test('invalid persisted data is ignored; unavailable storage cannot silently start a fresh order', () => {
  storage.set(bag.key,'{"items":[{"id":"w1","quantity":999}]}');
  assert.deepEqual(bag.read(),[]);
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage unavailable'); };
  try { assert.throws(() => bag.add('w1')); assert.throws(() => bag.intent([{id:'w1',quantity:1}],'pickup','en')); }
  finally { localStorage.setItem = original; }
});
