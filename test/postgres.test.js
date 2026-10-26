const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {errorDetails}=require('../server/error-log');
test('a failed first connection is retried by the next request',async()=>{
 let attempts=0;
 class Pool{
  on(){}
  async connect(){attempts++;if(attempts===1)throw new Error('Connection terminated due to connection timeout');return {query:async()=>({rows:[]}),release(){}};}
  async query(){return {rows:[]}}
  async end(){}
 }
 const context={require:name=>{assert.equal(name,'pg');return {Pool}},module:{exports:{}},URL,console};
 vm.runInNewContext(fs.readFileSync(require.resolve('../server/postgres-store'),'utf8'),context);
 const store=context.module.exports.createPostgresStore('postgresql://user:password@localhost/test');
 await assert.rejects(store.ping(),/timeout/);
 await store.ping();await store.ping();assert.equal(attempts,2);
 await store.close();
});
test('error diagnostics redact connection strings and Neon passwords',()=>{
 const result=errorDetails(new Error('connect postgresql://user:secret@example/db failed npg_example123'));
 assert(!result.message.includes('secret'));assert(!result.message.includes('npg_example123'));assert(result.message.includes('[DATABASE_URL]'));
 assert.equal(errorDetails(new Error('Connection terminated due to connection timeout')).message,'Connection terminated due to connection timeout');
});
