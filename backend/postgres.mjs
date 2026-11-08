// The existing store uses this small statement interface. Only source-controlled
// store queries are accepted; no browser input ever becomes SQL or a table name.
import { statements } from './statements.mjs';

const tables = ['products', 'settings', 'sessions', 'rate_limits', 'orders', 'stripe_events', 'stripe_merchants', 'connect_invites', 'connect_states', 'connect_sessions'];
export function postgresStatement(source) {
  if (!statements.includes(source)) throw new Error('Unknown store statement.');
  let sql = source.replace(/\b(?:FROM|INTO|(?<!DO )UPDATE) (\w+)/g, (match, table) => {
    if (!tables.includes(table)) throw new Error('Table outside Nornails.');
    return match.replace(table, 'public.nornails_' + table);
  });
  let parameter = 0;
  sql = sql.replace(/\?/g, () => '$' + (++parameter));
  if (sql.startsWith('INSERT OR IGNORE')) sql = sql.replace('INSERT OR IGNORE', 'INSERT') + ' ON CONFLICT DO NOTHING';
  // Qualify the target counter to distinguish it from EXCLUDED in PostgreSQL.
  sql = sql.replace('SET count = count + 1', 'SET count = nornails_rate_limits.count + 1');
  return sql;
}

export class PostgresStore {
  constructor(sql) { this.sql = sql; }
  prepare(source) {
    const text = postgresStatement(source);
    const db = this;
    return {
      values: [], text,
      bind(...values) { this.values = values; return this; },
      async first() { return (await db.sql.unsafe(text, this.values))[0] || null; },
      async all() { return { results: [...await db.sql.unsafe(text, this.values)] }; },
      async run() { const rows = await db.sql.unsafe(text, this.values); return { meta: { changes: rows.count } }; }
    };
  }
  async batch(statements) {
    // Webhook status + event marker, OAuth claims, and session rotation are atomic.
    return this.sql.begin(async transaction => {
      const results = [];
      for (const statement of statements) {
        const rows = await transaction.unsafe(statement.text, statement.values);
        results.push({ meta: { changes: rows.count } });
      }
      return results;
    });
  }
}
