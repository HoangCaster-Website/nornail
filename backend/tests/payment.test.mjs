import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, call, signIn, prepareCheckout, eventSignature } from './fixtures.mjs';

function mockStripe() {
  const original = globalThis.fetch;
  const calls = [];
  const sessions = new Map();
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'POST') {
      const session = { id: 'cs_test_invoicefixture' + (sessions.size + 1), url: 'https://checkout.stripe.com/c/pay/invoicefixture' + (sessions.size + 1), expires_at: Math.floor(Date.now() / 1000) + 3600, status: 'open' };
      sessions.set(session.id, session);
      return Response.json(session);
    }
    return Response.json(sessions.get(url.split('/').pop()));
  };
  return { calls, sessions, restore: () => { globalThis.fetch = original; } };
}
async function createOrder(env, fulfillment, quantity = 1, additional = {}) {
  const result = await call(env, '/api/checkout', { method:'POST', input:{requestId:crypto.randomUUID(),items:[{id:'w1',quantity}],fulfillment,language:'en',...additional} });
  assert.equal(result.status,200,JSON.stringify(result.data));
  return { ...result.data, invoice: (await call(env,'/api/checkout/invoice?session_id='+result.data.sessionId)).data };
}
async function webhook(env, order, type, paymentStatus = 'paid', extra = {}) {
  const event = { id:'evt_'+crypto.randomUUID(),livemode:false,type,data:{object:{id:order.sessionId,metadata:{order_id:order.invoice.id},payment_status:paymentStatus,currency:'nok',amount_total:order.invoice.total,...extra}} };
  const raw = JSON.stringify(event);
  return call(env,'/api/stripe/webhook',{method:'POST',origin:null,raw,headers:{'stripe-signature':eventSignature(raw,env.STRIPE_WEBHOOK_SECRET)}});
}

test('buyer delivery choice controls immutable shipping totals and Stripe collection, not browser fees',async()=>{
  const env=environment();await prepareCheckout(env,12345);const mock=mockStripe();
  try {
    const pickup=await createOrder(env,'pickup',2,{shippingOre:1,amount:1});
    const delivery=await createOrder(env,'shipping',2,{shippingOre:0,amount:1});
    assert.equal(pickup.invoice.total,24690);assert.equal(pickup.invoice.shippingOre,0);assert.equal(pickup.invoice.fulfillment,'pickup');
    assert.equal(delivery.invoice.total,34590);assert.equal(delivery.invoice.shippingOre,9900);assert.equal(delivery.invoice.fulfillment,'shipping');
    const pickupParams=mock.calls[0].options.body,shippingParams=mock.calls[1].options.body;
    assert.equal(pickupParams.get('shipping_address_collection[allowed_countries][0]'),null);
    assert.equal(shippingParams.get('shipping_address_collection[allowed_countries][0]'),'NO');
    assert.equal(shippingParams.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'9900');
    assert.equal(shippingParams.get('metadata[fulfillment]'),'shipping');
    assert.equal(pickupParams.get('metadata[fulfillment]'),'pickup');
    const cancel=new URL(shippingParams.get('cancel_url'));
    assert.equal(cancel.searchParams.get('order_id'),delivery.invoice.id);
    assert(!cancel.href.includes('{CHECKOUT_SESSION_ID}'));
    assert.equal((await call(env,'/api/checkout/invoice?order_id='+delivery.invoice.id)).data.paymentUrl,delivery.url);
    assert.equal(new URL(delivery.invoiceUrl).origin,'https://store.example');
    assert.equal(new URL(delivery.invoiceUrl).searchParams.get('session_id'),delivery.sessionId);
    assert.equal(delivery.invoice.paymentUrl,delivery.url);
  } finally {mock.restore();}
});

test('a delivery method must be selected and offered; unknown or missing shipping fees cannot enable checkout',async()=>{
  const env=environment();const admin=await prepareCheckout(env);
  const base={requestId:crypto.randomUUID(),items:[{id:'w1',quantity:1}]};
  assert.equal((await call(env,'/api/checkout',{method:'POST',input:base})).status,400);
  assert.equal((await call(env,'/api/checkout',{method:'POST',input:{...base,fulfillment:'free-courier'}})).status,400);
  const config={...globalThis.nornailsCommerce.defaults,enabled:true,shippingEnabled:false,termsConfirmed:true,termsUrl:'https://store.example/terms'};
  assert.equal((await call(env,'/api/admin/settings',{method:'PUT',token:admin,input:config})).status,200);
  assert.equal((await call(env,'/api/checkout',{method:'POST',input:{...base,fulfillment:'shipping'}})).status,400);
  assert.equal((await call(env,'/api/admin/settings',{method:'PUT',token:admin,input:{...config,shippingEnabled:true}})).status,400);
  assert.equal((await call(env,'/api/admin/settings',{method:'PUT',token:admin,input:{...config,pickupEnabled:false}})).status,400);
});

test('invoice and QR status become paid only after a verified matching event; private delivery details stay admin-only',async()=>{
  const env=environment();await prepareCheckout(env);const mock=mockStripe();
  try {
    const order=await createOrder(env,'shipping');
    assert.equal(order.invoice.status,'pending');assert(order.invoice.paymentUrl);
    assert.equal((await webhook(env,order,'checkout.session.completed','paid',{amount_total:1})).status,400);
    assert.equal((await call(env,'/api/checkout/status?session_id='+order.sessionId+'&paid=1')).data.status,'pending');
    const details={name:'Buyer Fixture',address:{line1:'Private fixture address',city:'Oslo',postal_code:'0001',country:'NO'}};
    assert.equal((await webhook(env,order,'checkout.session.completed','paid',{customer_details:{email:'buyer@example.invalid'},collected_information:{shipping_details:details}})).status,200);
    const invoice=(await call(env,'/api/checkout/invoice?session_id='+order.sessionId)).data;
    assert.equal(invoice.status,'paid');assert.equal(invoice.paymentUrl,null);assert.equal(invoice.total,order.invoice.total);
    assert.equal(invoice.email,undefined);assert.equal(invoice.delivery_details,undefined);assert(!JSON.stringify(invoice).includes(details.address.line1));
    const state=(await call(env,'/api/admin/state',{token:await signIn(env)})).data;
    assert.equal(JSON.parse(state.orders[0].delivery_details).address.line1,details.address.line1);
    assert.equal(state.orders[0].fulfillment,'shipping');
  } finally {mock.restore();}
});

test('pending bank confirmation hides the payable QR, then async success or failure updates the same order',async()=>{
  const env=environment();await prepareCheckout(env);const mock=mockStripe();
  try {
    const order=await createOrder(env,'pickup');
    assert.equal((await webhook(env,order,'checkout.session.completed','unpaid')).status,200);
    const processing=(await call(env,'/api/checkout/invoice?session_id='+order.sessionId)).data;
    assert.equal(processing.status,'processing');assert.equal(processing.paymentUrl,null);
    assert.equal((await webhook(env,order,'checkout.session.async_payment_succeeded')).status,200);
    assert.equal((await call(env,'/api/checkout/status?session_id='+order.sessionId)).data.status,'paid');
    assert.equal((await webhook(env,order,'checkout.session.expired','unpaid')).status,200);
    assert.equal((await call(env,'/api/checkout/status?session_id='+order.sessionId)).data.status,'paid');
    const failed=await createOrder(env,'pickup');
    await webhook(env,failed,'checkout.session.completed','unpaid');await webhook(env,failed,'checkout.session.async_payment_failed','unpaid');
    assert.equal((await call(env,'/api/checkout/invoice?session_id='+failed.sessionId)).data.status,'failed');
  } finally {mock.restore();}
});

test('expired and unknown sessions never expose a payable QR or fabricated unpaid invoice',async()=>{
  const env=environment();await prepareCheckout(env);const mock=mockStripe();
  try {
    const order=await createOrder(env,'pickup');env.DB.sqlite.prepare('UPDATE orders SET expires_at = 1').run();
    const expired=(await call(env,'/api/checkout/invoice?session_id='+order.sessionId)).data;
    assert.equal(expired.status,'expired');assert.equal(expired.paymentUrl,null);
    assert.equal((await call(env,'/api/checkout/status?session_id=cs_test_unknownfixture')).status,404);
    assert.equal((await call(env,'/api/checkout/invoice?session_id=cs_test_unknownfixture')).status,404);
  } finally {mock.restore();}
});

test('legacy pending sessions are retrieved once and reused instead of creating another payment',async()=>{
  const env=environment();await prepareCheckout(env);const mock=mockStripe();
  try {
    const order=await createOrder(env,'pickup');env.DB.sqlite.prepare('UPDATE orders SET checkout_url = NULL, expires_at = NULL').run();
    const invoice=(await call(env,'/api/checkout/invoice?session_id='+order.sessionId)).data;
    assert.equal(invoice.paymentUrl,order.url);assert.equal(invoice.status,'pending');
    await call(env,'/api/checkout/invoice?session_id='+order.sessionId);
    assert.equal(mock.calls.filter(item=>item.options.method==='POST').length,1);
    assert.equal(mock.calls.filter(item=>item.options.method!=='POST').length,1);
  } finally {mock.restore();}
});

test('multi-item bags use authoritative totals, charge shipping once and reject a stale review before creating an order',async()=>{
  const env=environment();const token=await prepareCheckout(env,10000);
  const product={...globalThis.nornailsCatalog.find(product=>product.id==='w2'),priceOre:5000,version:1};
  assert.equal((await call(env,'/api/admin/products/w2',{method:'PUT',token,input:product})).status,200);
  const mock=mockStripe();
  const request={requestId:crypto.randomUUID(),items:[{id:'w1',quantity:2},{id:'w2',quantity:3}],fulfillment:'shipping',language:'en',expectedTotal:44900};
  try {
    const stale=await call(env,'/api/checkout',{method:'POST',input:{...request,expectedTotal:1}});
    assert.equal(stale.status,409);assert.equal(mock.calls.length,0);
    assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS count FROM orders').get().count,0);
    const result=await call(env,'/api/checkout',{method:'POST',input:request});assert.equal(result.status,200);
    const invoice=(await call(env,'/api/checkout/invoice?session_id='+result.data.sessionId)).data;
    assert.equal(invoice.items.length,2);assert.equal(invoice.subtotal,35000);assert.equal(invoice.shippingOre,9900);assert.equal(invoice.total,44900);
    const params=mock.calls[0].options.body;assert.equal(params.get('line_items[1][quantity]'),'3');
    await call(env,'/api/checkout',{method:'POST',input:request});
    assert.equal(mock.calls.filter(call=>call.options.method==='POST').length,1);
  } finally {mock.restore();}
});
