const {createTestStore}=require('../test-support/store');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/app');

test('HTTP API validation and CRUD with injected test store', async t => {
  const server = createApp({store:createTestStore()}).listen(0,'127.0.0.1');
  await new Promise((resolve,reject) => {server.once('listening',resolve);server.once('error',reject);});
  t.after(() => new Promise(resolve => {server.close(resolve);server.closeAllConnections();}));
  const base='http://127.0.0.1:'+server.address().port;
  async function request(path,method='GET',body) {
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,data:response.status===204?null:await response.json()};
  }
  assert.equal((await fetch(base)).status,200);
  assert.equal((await fetch(base+'/js/app.js')).status,200);
  assert.equal((await fetch(base+'/server/app.js')).status,404);
  assert.equal((await request('/api/trips')).data.length,0);
  assert.equal((await request('/api/health')).data.storage,'postgres');
  assert.equal((await request('/api/import/local-storage','POST',{trips:[]})).status,404);
  const body={name:'당일치기',place:'서울',startDate:'2026-11-01',endDate:'2026-11-01'};
  const created=await request('/api/trips','POST',body);
  assert.equal(created.status,201);assert.equal(created.data.budget,0);assert.equal(created.data.days,'당일치기');
  const trip=created.data, path='/api/trips/'+trip.id;
  for(const patch of [{endDate:'2026-10-31'},{startDate:'2026-02-30'},{budget:-1},{budget:1.5},{name:'   '}]) assert.equal((await request(path,'PUT',{...trip,...patch})).status,400);
  trip.schedules=[{id:'schedule-1',date:trip.startDate,time:'13:05',name:'점심',place:'식당',memo:'예약',category:'식비',cost:15000}];
  trip.extraExpenses=[{id:'expense-1',name:'보험',category:'기타',cost:5000}];
  trip.spent=1;
  let result=await request(path,'PUT',trip);assert.equal(result.status,200);assert.equal(result.data.spent,20000);
  assert.equal((await request(path)).data.schedules[0].time,'13:05');
  const bad=structuredClone(trip);bad.schedules[0].date='2026-11-02';assert.equal((await request(path,'PUT',bad)).status,400);
  bad.schedules[0].date=trip.startDate;bad.schedules[0].time='25:00';assert.equal((await request(path,'PUT',bad)).status,400);
  trip.schedules=[];trip.extraExpenses=[];assert.equal((await request(path,'PUT',trip)).data.spent,0);
  assert.equal((await request(path,'DELETE')).status,204);assert.equal((await request(path)).status,404);
  assert.equal((await request('/api/no-such-route')).status,404);
  const invalid=await fetch(base+'/api/trips',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(invalid.status,400);
  for(const trip of (await request('/api/trips')).data)await request('/api/trips/'+trip.id,'DELETE');
  assert.deepEqual((await request('/api/trips')).data,[]);
});


test('DATABASE_URL is required when a test store is not injected', () => {
  assert.throws(() => createApp({databaseUrl:''}), /DATABASE_URL/);
});
