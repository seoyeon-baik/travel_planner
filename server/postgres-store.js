const { Pool } = require('pg');
const schema = 'blueway';
function createPostgresStore(connectionString) {
  const url = new URL(connectionString);
  if(url.hostname.endsWith('.neon.tech')) url.searchParams.set('sslmode','verify-full');
  const pool = new Pool({ connectionString: url.toString(), max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000, enableChannelBinding: true });
  pool.on('error', () => console.error('PostgreSQL 연결이 종료되었습니다. 다음 요청에서 재연결합니다.'));
  const ready = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('blueway-schema-v1'))");
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema};
        CREATE TABLE IF NOT EXISTS ${schema}.trips (id TEXT PRIMARY KEY, body JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS ${schema}.schedules (
          trip_id TEXT NOT NULL REFERENCES ${schema}.trips(id) ON DELETE CASCADE,
          id TEXT NOT NULL, position INTEGER NOT NULL, body JSONB NOT NULL, PRIMARY KEY(trip_id,id));
        CREATE TABLE IF NOT EXISTS ${schema}.expenses (
          trip_id TEXT NOT NULL REFERENCES ${schema}.trips(id) ON DELETE CASCADE,
          id TEXT NOT NULL, position INTEGER NOT NULL, body JSONB NOT NULL, PRIMARY KEY(trip_id,id));`);
      await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  })();
  // Keep rejected initialization handled until the first request awaits it.
  ready.catch(() => {});
  async function transaction(fn) {
    await ready;
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async function get(id, client = pool) {
    await ready;
    const {rows} = await client.query(`SELECT t.body,
      COALESCE((SELECT jsonb_agg(s.body ORDER BY s.position) FROM ${schema}.schedules s WHERE s.trip_id=t.id),'[]'::jsonb) AS schedules,
      COALESCE((SELECT jsonb_agg(e.body ORDER BY e.position) FROM ${schema}.expenses e WHERE e.trip_id=t.id),'[]'::jsonb) AS expenses
      FROM ${schema}.trips t WHERE t.id=$1`, [id]);
    return rows[0] ? {...rows[0].body,schedules:rows[0].schedules,extraExpenses:rows[0].expenses} : undefined;
  }
  async function write(client, trip) {
    const {schedules,extraExpenses,...body}=trip;
    await client.query(`INSERT INTO ${schema}.trips(id,body) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET body=excluded.body`,[trip.id,JSON.stringify(body)]);
    await client.query(`DELETE FROM ${schema}.schedules WHERE trip_id=$1`,[trip.id]);
    await client.query(`DELETE FROM ${schema}.expenses WHERE trip_id=$1`,[trip.id]);
    for (const [table,items] of [['schedules',schedules],['expenses',extraExpenses]]) {
      if(items.length) await client.query(`INSERT INTO ${schema}.${table}(trip_id,id,position,body)
        SELECT $1, item->>'id', (ordinality-1)::integer, item FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS entries(item,ordinality)`,[trip.id,JSON.stringify(items)]);
    }
  }
  const store = {
    ready, get,
    ping: async () => {await ready; await pool.query('SELECT 1');},
    all: async () => {
      await ready;
      const {rows}=await pool.query(`SELECT t.body,
        COALESCE((SELECT jsonb_agg(s.body ORDER BY s.position) FROM ${schema}.schedules s WHERE s.trip_id=t.id),'[]'::jsonb) AS schedules,
        COALESCE((SELECT jsonb_agg(e.body ORDER BY e.position) FROM ${schema}.expenses e WHERE e.trip_id=t.id),'[]'::jsonb) AS expenses
        FROM ${schema}.trips t ORDER BY t.body->>'startDate',t.id`);
      return rows.map(row=>({...row.body,schedules:row.schedules,extraExpenses:row.expenses}));
    },
    save: trip => transaction(client=>write(client,trip)),
    delete: async id => {await ready;return pool.query(`DELETE FROM ${schema}.trips WHERE id=$1`,[id]);},
    close: () => pool.end()
  };
  return store;
}
module.exports = {createPostgresStore};
