// Injected test double only. The running app always uses Neon PostgreSQL.
function createTestStore() {
  const records=new Map();
  return {
    ping:async()=>{},
    all:async()=>structuredClone([...records.values()]),
    get:async id=>structuredClone(records.get(id)),
    save:async trip=>records.set(trip.id,structuredClone(trip)),
    delete:async id=>records.delete(id),
    close:async()=>{}
  };
}
module.exports={createTestStore};
