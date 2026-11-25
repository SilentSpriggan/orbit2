'use strict';

const ObservationStore = (() => {
  let pending;
  function open() {
    if(!('indexedDB' in globalThis))return Promise.reject(new Error('Image storage is not available in this browser.'));
    if(pending)return pending;
    pending=new Promise((resolve,reject)=>{
      const request=indexedDB.open('orbit-observations-v1',1);
      request.onupgradeneeded=()=>{
        const store=request.result.createObjectStore('images',{keyPath:'id'});
        store.createIndex('owner',['workspace','crewId']);
        store.createIndex('workspace','workspace');
      };
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();pending=null;};resolve(db);};
      request.onerror=()=>{pending=null;reject(new Error('Browser image storage could not open.'));};
      request.onblocked=()=>{pending=null;reject(new Error('Close other ORBIT tabs and try image storage again.'));};
    });
    return pending;
  }
  async function transact(mode,operation) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction('images',mode),store=transaction.objectStore('images');
      let result;
      transaction.oncomplete=()=>resolve(result);
      transaction.onerror=()=>reject(new Error('Image storage failed. Check browser permissions and available space.'));
      transaction.onabort=()=>reject(new Error('Image storage did not complete. The record was not saved.'));
      operation(store,value=>{result=value;});
    });
  }
  const list=(workspace,crewId)=>transact('readonly',(store,done)=>{const request=store.index('owner').getAll([workspace,crewId]);request.onsuccess=()=>done(request.result.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)));});
  const get=(id,workspace,crewId)=>transact('readonly',(store,done)=>{const request=store.get(id);request.onsuccess=()=>done(request.result?.workspace===workspace&&request.result?.crewId===crewId?request.result:null);});
  const save=record=>transact('readwrite',(store,done)=>{const request=store.put(record);request.onsuccess=()=>done(record.id);});
  const remove=(id,workspace,crewId)=>transact('readwrite',(store,done)=>{const request=store.get(id);request.onsuccess=()=>{const row=request.result;if(row?.workspace===workspace&&row?.crewId===crewId){store.delete(id);done(true);}else done(false);};});
  async function clearWorkspace(workspace) {
    if(!('indexedDB' in globalThis))return;
    return transact('readwrite',(store,done)=>{const request=store.index('workspace').openCursor(IDBKeyRange.only(workspace));let count=0;request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();count++;cursor.continue();}else done(count);};});
  }
  return {list,get,save,remove,clearWorkspace};
})();
