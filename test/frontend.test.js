const {createTestStore}=require('../test-support/store');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createApp}=require('../server/app');
test('frontend loads and saves via fetch without localStorage',async t=>{
 const server=createApp({store:createTestStore()}).listen(0,'127.0.0.1');
 await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)});
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));
 const base='http://127.0.0.1:'+server.address().port;
 const nodes=new Map();
 function get(key){if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',dataset:{},addEventListener(){},querySelectorAll(){return []}});return nodes.get(key)}
 const context={document:{querySelector:get,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){},scrollTo(){}},location:{hash:''},fetch:(url,options)=>fetch(base+url,options),console,setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/app.js'),'utf8'),context);
 await vm.runInContext('loadTrips()',context);
 assert(get('#app').innerHTML.includes('나의 여행'));
 assert(!get('#app').innerHTML.includes('data-import-storage'));
 await vm.runInContext(`(async()=>{const trip=prepareTrip({id:'trip-test-ui',name:'API 연결 여행',place:'서울',startDate:'2026-11-01',endDate:'2026-11-01',budget:10000});trip.extraExpenses=[];await persistTrips([...trips,trip]);trips.push(trip);renderList();})()`,context);
 assert(get('#app').innerHTML.includes('API 연결 여행'));
 let saved=await(await fetch(base+'/api/trips/trip-test-ui')).json();assert.equal(saved.name,'API 연결 여행');
 await vm.runInContext(`(async()=>{const next=trips.map(t=>t.id==='trip-test-ui'?{...t,name:'수정됨',extraExpenses:[{id:'expense-test',name:'보험',category:'기타',cost:1000}]}:t);await persistTrips(next);trips.splice(0,trips.length,...next);})()`,context);
 saved=await(await fetch(base+'/api/trips/trip-test-ui')).json();assert.equal(saved.spent,1000);assert.equal(saved.name,'수정됨');
 await vm.runInContext(`persistTrips(trips.filter(t=>t.id!=='trip-test-ui'))`,context);
 assert.equal((await fetch(base+'/api/trips/trip-test-ui')).status,404);
});
