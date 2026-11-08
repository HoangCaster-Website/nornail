import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { environment, call } from './fixtures.mjs';

const viewer = 'v_' + '12'.repeat(32);
function sandbox() {
  const env = environment();
  env.TEST_ONLY = true;
  env.SELLER_VIEWER_HASH = createHash('sha256').update(viewer).digest('hex');
  env.SANDBOX_EXPIRES_AT = new Date(Date.now()+3600000).toISOString();
  const insert=env.DB.sqlite.prepare('INSERT INTO orders(id,mode,status,amount,currency,items,fingerprint,created_at,email,fulfillment,shipping_ore) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  insert.run('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','test','paid',12500,'nok',JSON.stringify([{id:'w1',name:'Test product',unit:'1 bottle',priceOre:10000,quantity:1}]),'fixture',new Date().toISOString(),'buyer@example.invalid','shipping',2500);
  insert.run('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','live','paid',50000,'nok','[]','fixture',new Date().toISOString(),'live@example.invalid','pickup',0);
  return env;
}

test('seller order listing requires a scoped, unexpired sandbox capability',async()=>{
  const env=sandbox();
  assert.equal((await call(env,'/api/seller/orders')).status,401);
  assert.equal((await call(env,'/api/seller/orders',{token:'v_'+'34'.repeat(32)})).status,401);
  const result=await call(env,'/api/seller/orders',{token:viewer});
  assert.equal(result.status,200);assert.equal(result.data.readOnly,true);assert.equal(result.data.mode,'test');
  assert.equal(result.data.orders.length,1);assert.equal(result.data.orders[0].email,'buyer@example.invalid');
  assert.ok(Array.isArray(result.data.orders[0].items));assert.equal(result.data.orders[0].amount,12500);
  assert.equal(result.response.headers.get('Cache-Control'),'no-store');
  assert.equal('checkout_url' in result.data.orders[0],false);assert.equal(JSON.stringify(result.data).includes(viewer),false);
  env.SANDBOX_EXPIRES_AT=new Date(Date.now()-1000).toISOString();
  assert.equal((await call(env,'/api/seller/orders',{token:viewer})).status,401);
});

test('the seller capability cannot access live orders, admin state or write endpoints',async()=>{
  const env=sandbox();
  assert.equal((await call(env,'/api/admin/state',{token:viewer})).status,401);
  assert.equal((await call(env,'/api/admin/products/w1',{method:'PUT',token:viewer,input:{priceOre:1}})).status,401);
  assert.equal((await call(env,'/api/seller/orders',{method:'POST',token:viewer,input:{}})).status,404);
  assert.equal((await call(env,'/api/seller/orders',{token:viewer,origin:'https://unknown.example'})).status,403);
  env.TEST_ONLY=false;
  assert.equal((await call(env,'/api/seller/orders',{token:viewer})).status,404);
});
