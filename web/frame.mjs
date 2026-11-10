const palette={ink:'#0a0f24',paper:'#eef1e0',phos:'#baf86b',muted:'#a3b0d8',stamp:'#ff6f52'};
const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const reportCode = code => code+'-'+Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>alphabet[n&31]).join('');
export function osFamily() {
  const ua=navigator.userAgent;
  return /Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/CrOS/.test(ua)?'ChromeOS':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Unknown';
}
export const geometry=(width,height,pixel=false)=>{
  const scale=pixel?Math.max(1,Math.ceil(960/width)):1, w=width*scale, h=height*scale;
  return {w,h,scale,side:Math.round(.02*w),band:Math.round(.072*w),line:Math.max(1,Math.round(.0023*w))};
};
let fonts;
async function loadFonts() {
  fonts??=Promise.all([['SnapAnybody','anybody','800'],['SnapMono','martianmono','500'],['SnapInstrument','instrumentsans','700']]
    .map(async ([family,file,weight])=>{
      const font=new FontFace(family,'url('+new URL('../addons/pause_postcard/fonts/'+file+'.ttf',import.meta.url)+')',{weight});
      document.fonts.add(await font.load());
    }));
  await fonts;
}
export async function drawFrame(source,{name,build,platform,where,utc,reportCode:code,pixel=false}) {
  const {w,h,side,band,line,scale}=geometry(source.width,source.height,pixel);
  const frame=document.createElement('canvas'); frame.width=w+side*2; frame.height=h+band*2;
  const c=frame.getContext('2d');
  // Read the game canvas synchronously, before fonts load or the game draws another frame.
  c.fillStyle=palette.ink; c.fillRect(0,0,frame.width,frame.height);
  c.fillStyle=palette.paper; c.fillRect(side-line,band-line,w+2*line,h+2*line);
  c.imageSmoothingEnabled=scale===1; c.drawImage(source,side,band,w,h);
  await loadFonts();
  const right=side+w, k=w/1280;
  function print(value,x,y,px,family,color,max,align='left') {
    c.textAlign=align; c.textBaseline='alphabetic';
    const weight=family==='SnapAnybody'?800:family==='SnapInstrument'?700:500;
    c.font=weight+' '+Math.max(1,Math.round(px*k))+'px '+family;
    value=String(value??'');
    if (c.measureText(value).width>max) {
      while (value && c.measureText(value+'…').width>max) value=value.slice(0,-1);
      value+='…';
    }
    c.fillStyle=color; c.fillText(value,x,y);
  }
  const bottom=band+h;
  print(name.toUpperCase(),side,44*k,37,'SnapAnybody',palette.paper,w*.74);
  print('build '+build+' · '+platform,side,70*k,17,'SnapMono',palette.phos,w*.74);
  print('PausePostcard',side,bottom+38*k,27,'SnapInstrument',palette.phos,w*.46);
  print('Screenshot captured during play',side,bottom+65*k,14,'SnapMono',palette.muted,w*.48);
  print(where||'Where: add it in your report',right,bottom+36*k,17,'SnapMono',palette.paper,w*.49,'right');
  print(String(utc ?? '').slice(0,16).replace('T',' ')+' UTC · Report code '+code,right,bottom+65*k,14,'SnapMono',palette.muted,w*.49,'right');
  c.save();
  c.translate(right-124*k,45*k); c.rotate(-4*Math.PI/180);
  c.beginPath(); c.roundRect(-116*k,-33*k,232*k,66*k,8*k);
  c.strokeStyle=palette.stamp; c.lineWidth=3*k; c.stroke();
  print('POSTCARD',0,-1*k,31,'SnapAnybody',palette.stamp,220*k,'center');
  print('GAME CAPTURE',0,21*k,14,'SnapMono',palette.stamp,220*k,'center');
  c.restore();
  return frame;
}
export const asBlob=(canvas,type='image/png',quality)=>new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(Error('Image could not be encoded.')),type,quality));
const sig=[137,80,78,71,13,10,26,10], encoder=new TextEncoder();
const keyword='pausepostcard';
function crc(bytes) {
  let n=0xffffffff;
  for (const byte of bytes) { n^=byte; for (let j=0;j<8;j++) n=(n>>>1)^((n&1)?0xedb88320:0); }
  return (n^0xffffffff)>>>0;
}
function* chunks(b) {
  if (!sig.every((n,i)=>b[i]===n)) return;
  const d=new DataView(b.buffer,b.byteOffset,b.byteLength);
  for(let i=8;i+12<=b.length;) {
    const n=d.getUint32(i), end=i+12+n;
    if (end>b.length) return;
    const tag=String.fromCharCode(...b.subarray(i+4,i+8));
    yield {tag,i,data:b.subarray(i+8,end-4),good:()=>d.getUint32(end-4)===crc(b.subarray(i+4,end-4))};
    if(tag==='IEND') return;
    i=end;
  }
}
export function publicMetadata(metadata) {
  const input = metadata && typeof metadata === 'object' ? metadata : {};
  const result = {};
  for (const [key, limit] of Object.entries({game:80, build:64, where:120, platform:24, utc:32})) {
    if (typeof input[key] === 'string') result[key] = input[key].slice(0, limit);
  }
  if (typeof input.reportCode === 'string' && /^[A-Z0-9]{1,12}-[2-9A-HJ-NP-Z]{4}$/.test(input.reportCode)) {
    result.reportCode = input.reportCode;
  }
  if (Array.isArray(input.resolution) && input.resolution.length === 2 &&
      input.resolution.every(value => Number.isInteger(value) && value > 0 && value <= 32768)) {
    result.resolution = input.resolution;
  }
  return result;
}
export function insertSnap(b,metadata) {
  const end=[...chunks(b)].find(p=>p.tag==='IEND');
  if(!end) throw Error('Invalid PNG.');
  // tEXt is Latin-1; escape Unicode so the value stays portable ASCII JSON.
  const body=encoder.encode('tEXt'+keyword+'\0'+JSON.stringify(publicMetadata(metadata)).replace(/[^\x20-\x7e]/g,s=>'\\u'+s.charCodeAt(0).toString(16).padStart(4,'0')));
  const part=new Uint8Array(body.length+8), view=new DataView(part.buffer);
  view.setUint32(0,body.length-4); part.set(body,4); view.setUint32(part.length-4,crc(body));
  return new Blob([b.subarray(0,end.i),part,b.subarray(end.i)],{type:'image/png'});
}
export async function readSnap(blob) {
  if (!blob || blob.size>32*1024*1024) return null;
  const bytes=new Uint8Array(await blob.arrayBuffer());
  for(const p of chunks(bytes)) {
    if(p.tag!=='tEXt'||p.data.length>8000||!p.good()) continue;
    const t=new TextDecoder().decode(p.data), z=t.indexOf('\0');
    if(t.slice(0,z)!==keyword) continue;
    try { return publicMetadata(JSON.parse(t.slice(z+1))); } catch { return null; }
  }
  return null;
}
export async function frameSnap(source,meta,name,pixel=false) {
  const frame=await drawFrame(source,{...publicMetadata(meta),name,pixel});
  return insertSnap(new Uint8Array(await (await asBlob(frame)).arrayBuffer()),meta);
}
