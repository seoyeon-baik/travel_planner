require('../server/env').loadEnv();
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createApp}=require('../server/app');
async function main(){
 const app=createApp();await app.locals.store.ready;
 const server=app.listen(0,'127.0.0.1');
 await new Promise((r,j)=>{server.once('listening',r);server.once('error',j)});
 const base='http://127.0.0.1:'+server.address().port;
 const id='trip-check-'+randomUUID();
 async function request(method,url,body){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=r.status===204?null:await r.json();return {status:r.status,data};}
 try{
  const before=(await request('GET','/api/trips')).data.length;
  const body={id,name:'연결 검증 임시 여행',place:'테스트',startDate:'2026-11-01',endDate:'2026-11-01',budget:20000};
  assert.equal((await request('POST','/api/trips',body)).status,201);
  const update={...body,schedules:[{id:'check-schedule',date:body.startDate,time:'13:00',name:'점심',place:'',memo:'',category:'식비',cost:1000}],extraExpenses:[{id:'check-expense',name:'보험',category:'기타',cost:500}]};
  assert.equal((await request('PUT','/api/trips/'+id,update)).data.spent,1500);
  assert.equal((await request('GET','/api/trips/'+id)).data.schedules.length,1);
  assert.equal((await request('DELETE','/api/trips/'+id)).status,204);
  assert.equal((await request('GET','/api/trips/'+id)).status,404);
  assert.equal((await request('GET','/api/trips')).data.length,before);
  console.log('PASS: Neon HTTP API 조회·생성·일정/비용 수정·삭제, 임시 데이터 정리 완료');
 }finally{
  await request('DELETE','/api/trips/'+id);
  await new Promise(r=>{server.close(r);server.closeAllConnections()});await app.locals.store.close();
 }
}
main().catch(()=>{console.error('Neon API 검증 실패. 연결과 데이터베이스 상태를 확인하세요.');process.exitCode=1});
