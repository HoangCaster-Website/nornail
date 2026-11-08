// Integration verification against a real PostgreSQL connection. Every write is
// inside one rolled-back transaction; never creates a real administrator/order.
import { PostgresStore } from '../postgres.mjs';
import { statements } from '../statements.mjs';

export async function runPostgresChecks(sql) {
  const rollback = new Error('Nornails integration check rollback');
  let checked = 0;
  try {
    await sql.begin(async transaction => {
      const db = new PostgresStore({ unsafe: transaction.unsafe.bind(transaction), begin: fn => transaction.savepoint(fn) });
      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();
      const sample = JSON.stringify({ id: 'qa-' + id, active: true, priceOre: null });
      // Bindings match the source allowlist. There is no remotely supplied SQL.
      const values = [
        [], [now - 86400], ['qa-' + id, now + 900], ['qa-' + id, now], [0], ['qa-' + id, now + 100],
        ['w1'], [id, 'test', 'pending', 20000, 'nok', '[]', 'qa-fingerprint', new Date().toISOString(), null, 'pickup', 0, 20000],
        [id], ['processing', id, 'pending'], ['cs_test_qa_' + id, 'https://checkout.stripe.com/c/pay/qa', now + 900, id, 'cs_test_qa_' + id],
        ['evt_qa_' + id], [id], ['paid', 'cs_test_qa_' + id, '', null, 'paid', 'paid', new Date().toISOString(), id, 'paid', 'paid', 'paid', 'pending', 'processing'],
        ['evt_qa_' + id], [], ['cs_test_qa_' + id], [null, now, 'expired', id, 'pending'], [id], ['qa-' + id], [],
        ['qa-' + id], ['qa-' + id, sample], ['qa-' + id, 999], [sample, 'qa-' + id, 1], [JSON.stringify({ enabled: false })],
        ['test'], ['qa-' + id], ['qa-' + id, now], ['qa-' + id],
        ['qa-' + id, 'qa-' + id, null, now + 900], ['pending', new Date().toISOString(), 'test', 'acct_qa'],
        ['pending', 'test', 'acct_qa'], ['unconfigured'], ['qa-' + id, 'qa-' + id, 'test', now + 900, new Date().toISOString()],
        [0], ['qa-' + id, 'qa-' + id, now + 900], ['qa-' + id, now], ['test', 'acct_qa', 'pending', new Date().toISOString()],
        ['pending', 'acct_qa', 'qa-' + id], ['pending', 'test', 'acct_qa'], ['pending', 'test', 'acct_qa']
      ];
      if (values.length !== statements.length) throw new Error('Update PostgreSQL test bindings after changing store statements.');
      // Invite must precede the session/state foreign keys.
      const order = [...values.keys()].filter(i => ![30, 34].includes(i));
      order.splice(order.indexOf(31), 0, 34, 30);
      for (const i of order) {
        if ((statements[i].match(/\?/g) || []).length !== values[i].length) throw new Error('Incorrect fixture bindings for statement ' + i);
        await db.prepare(statements[i]).bind(...values[i]).all();
        checked++;
      }
      const product = await db.prepare('SELECT data, version FROM products WHERE id = ?').bind('qa-' + id).first();
      if (product.version !== 2) throw new Error('Versioned update did not persist.');
      const stale = await db.prepare('DELETE FROM products WHERE id = ? AND version = ?').bind('qa-' + id, 1).run();
      if (stale.meta.changes !== 0) throw new Error('Stale edits were accepted.');
      await db.batch([
        db.prepare('INSERT INTO sessions (token_hash, expires) VALUES (?, ?)').bind('qa-batch-' + id, now + 100),
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind('qa-batch-' + id)
      ]);
      let aborted = false;
      try {
        await db.batch([
          db.prepare('INSERT INTO sessions (token_hash, expires) VALUES (?, ?)').bind('qa-fail-' + id, now + 100),
          db.prepare('INSERT INTO sessions (token_hash, expires) VALUES (?, ?)').bind('qa-fail-' + id, now + 100)
        ]);
      } catch { aborted = true; }
      if (!aborted || await db.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires > ?').bind('qa-fail-' + id, now).first()) throw new Error('Batch failure was not atomic.');
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  return { checked, rolledBack: true, optimisticVersions: true, atomicBatches: true };
}
