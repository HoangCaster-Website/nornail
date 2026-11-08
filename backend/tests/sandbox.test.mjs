import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
const config = readFileSync(new URL('../../site-config.js',import.meta.url),'utf8');
const cart = readFileSync(new URL('../../cart.js',import.meta.url),'utf8');

test('test navigation stays in the sandbox without changing normal checkout links',()=>{
  for (const sandbox of [false,true]) {
    const context = vm.createContext({ URL,URLSearchParams,location:{href:'https://store.example/nornail/?lang=en'+(sandbox?'&sandbox=1':''),search:sandbox?'?sandbox=1':'?lang=en'},document:{addEventListener(){}} });
    vm.runInContext(config,context);
    const result = context.nornailsConfig;
    assert.equal(result.sandbox,sandbox);
    assert.equal(new URL(result.apiUrl).pathname,'/functions/v1/'+(sandbox?'nornails-sandbox-api':'nornails-api'));
    const target=new URL(result.pageUrl('payment.html',{session_id:'cs_test_fixture',lang:'en'}));
    assert.equal(target.searchParams.get('session_id'),'cs_test_fixture');
    assert.equal(target.searchParams.get('sandbox'),sandbox?'1':null);
  }
});

test('real and sandbox carts and retry identifiers are independent in the same browser',()=>{
  const saved=new Map();const localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const create = sandbox => {const context=vm.createContext({nornailsConfig:{sandbox},localStorage,crypto:webcrypto});vm.runInContext(cart,context);return context.nornailsCart;};
  const real=create(false),sandbox=create(true);
  real.add('w1',7);sandbox.add('w1',2);
  const realAttempt=real.intent(real.read(),'pickup','en');const testAttempt=sandbox.intent(sandbox.read(),'pickup','en');
  assert.notEqual(realAttempt.requestId,testAttempt.requestId);
  sandbox.saveIntent({...testAttempt,sessionId:'cs_test_sandbox_settlement'});sandbox.settled('cs_test_sandbox_settlement');
  assert.equal(sandbox.read().length,0);assert.equal(real.read()[0].quantity,7);
  assert.equal(real.intent(real.read(),'pickup','en').requestId,realAttempt.requestId);
});
