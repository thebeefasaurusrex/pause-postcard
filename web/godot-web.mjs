import {osFamily} from './frame.mjs';
import {offerSnap} from './browser.mjs';
window.ssSnapOS=osFamily;
window.ssGodotSnap=async base64=>{
  try {
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const base=document.querySelector('meta[name="pause-postcard-feedback"]')?.content;
    await offerSnap(new Blob([bytes],{type:'image/png'}),{inline:true,base});
  } catch(e) {
    const error=document.createElement('p');error.role='alert';error.textContent='PausePostcard failed: '+e.message;
    error.style.cssText='position:fixed;top:0;right:0;background:white;color:black;z-index:99';document.body.append(error);
    setTimeout(()=>error.remove(),6000);
  }
};
