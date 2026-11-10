import {readSnap} from './frame.mjs';

function database() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('pause-postcard',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('snaps');
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function transfer(mode,id,blob) {
  const db=await database();
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('snaps',mode==='get'?'readonly':'readwrite');
      const store=tx.objectStore('snaps');
      const req=mode==='put'?store.put({blob,time:Date.now()},id):mode==='get'?store.get(id):store.delete(id);
      if(mode==='put') {
        store.openCursor().onsuccess=e=>{
          const cur=e.target.result;
          if(cur) { if(Date.now()-cur.value.time>3600000)cur.delete(); cur.continue(); }
        };
      }
      tx.oncomplete=()=>resolve(req.result);
      tx.onerror=tx.onabort=()=>reject(tx.error??Error('Browser storage is unavailable.'));
    });
  } finally { db.close(); }
}
export async function getSnap(id) {
  if (!/^[0-9a-f-]{36}$/.test(id??'')) return null;
  const entry=await transfer('get',id);
  return entry&&Date.now()-entry.time<3600000?entry.blob:null;
}
export const forgetSnap=id=>transfer('delete',id);
export function saveSnap(file) {
  const url=URL.createObjectURL(file), a=document.createElement('a');
  a.href=url; a.download=file.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function feedbackLink(file,meta,base) {
  const url=new URL(base,location.href);
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('Feedback URL must use HTTP or HTTPS.');
  for(const [key,value] of Object.entries({game:meta.game,build:meta.build,where:meta.where,code:meta.reportCode})) {
    if(value)url.searchParams.set(key,value);
  }
  if(url.origin===location.origin) {
    const id=crypto.randomUUID();
    await transfer('put',id,file); url.searchParams.set('snap',id);
  }
  return url;
}
const el=(name,text)=>Object.assign(document.createElement(name),{textContent:text??''});
export async function offerSnap(blob,{inline=false,base}={}) {
  const meta=await readSnap(blob);
  if(!meta?.reportCode) throw Error('PausePostcard metadata is missing.');
  const file=new File([blob],meta.reportCode+'.png',{type:'image/png'});
  const dialog=el('dialog'); dialog.style.cssText='max-width:min(850px,95vw);max-height:93vh;color:#eef1e0;background:#0a0f24;border:1px solid #a3b0d8;padding:14px';
  const heading=el('h2','PausePostcard '+meta.reportCode), img=el('img'), status=el('p');
  status.setAttribute('role','status');
  heading.id='snap-title';dialog.setAttribute('aria-labelledby',heading.id);
  img.src=URL.createObjectURL(file); img.alt='Framed game screenshot'; img.style.cssText='display:block;max-width:100%;max-height:65vh;object-fit:contain';
  const save=el('button','Save'), share=el('button','Share'), tell=el('button','Tell us about it'), close=el('button','Close');
  save.onclick=()=>saveSnap(file);
  share.hidden=!navigator.canShare?.({files:[file]});
  share.onclick=()=>navigator.share({files:[file],title:'PausePostcard'}).catch(error=>{if(error.name!=='AbortError')status.textContent='Share failed. You can still save the PausePostcard.';});
  tell.hidden=!base;
  tell.onclick=async()=>{
    tell.disabled=true;
    try {
      const url=await feedbackLink(file,meta,base);
      if(inline && url.origin===location.origin) {
        const frame=el('iframe'); frame.title='Player feedback'; frame.src=url.href;
        frame.style.cssText='border:0;width:min(680px,82vw);height:72vh;background:white';
        dialog.replaceChildren(heading,frame,close);close.focus();
      } else location.href=url.href;
    } catch { status.textContent='Could not attach your PausePostcard. Save it and upload it on the feedback page.'; tell.disabled=false; }
  };
  close.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{URL.revokeObjectURL(img.src);dialog.remove();},{once:true});
  dialog.append(heading,img,status,save,' ',share,' ',tell,' ',close);document.body.append(dialog);dialog.showModal();
}
