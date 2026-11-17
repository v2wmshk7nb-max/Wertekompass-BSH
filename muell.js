import {spielschritt} from './spielsignale.js';
import {WasteSort,binAt} from './muell-state.js';

const scene=document.querySelector('#muell-scene');
const asset='assets/muell-bsh/';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const openings={papier:[390,450],verpackung:[567,450],rest:[741,449]};
const rims={papier:'M332 440Q381 435 427 441L444 457H339Z',verpackung:'M519 441Q561 436 608 441L620 456H526Z',rest:'M692 441Q735 435 774 440L790 456H698Z'};
const art={
 papier:{size:[168,134],outline:'M5 69L19 31 32 30 52 10 68 15 86 5 112 14 129 38 142 32 151 48 164 82 153 109 136 133 104 131 85 125 65 131 51 127 34 131 17 109 17 91Z'},
 verpackung:{size:[238,140],outline:'M3 68L17 67 37 56 72 41 107 25 139 5 167 18 186 25 199 38 205 52 217 65 222 72 236 79 224 93 211 102 187 110 155 116 117 126 82 132 47 137 36 124 26 110 17 98 11 83Z'},
 rest:{size:[213,108]}
};
let config,model,selected=null,gesture=null,locked=false,emitted=false;
const objects=new Map();
export const wasteSoundFiles={sorted:null,complete:null};
function sound(key){if(wasteSoundFiles[key])new Audio(wasteSoundFiles[key]).play().catch(()=>{});}
function rect(el,x,y,w,h){const {width,height}=config.coordinateSystem;Object.assign(el.style,{left:x/width*100+'%',top:y/height*100+'%',width:w/width*100+'%',height:h/height*100+'%'});}
function point(e){const r=scene.getBoundingClientRect(),{width,height}=config.coordinateSystem;return [(e.clientX-r.left)*width/r.width,(e.clientY-r.top)*height/r.height];}
function delta(dx,dy){const r=scene.getBoundingClientRect(),{width,height}=config.coordinateSystem;return `translate(${dx*r.width/width}px,${dy*r.height/height}px)`;}
function select(id){if(id!==null&&selected!==id)spielschritt();selected=id;scene.classList.toggle('waste-selected',Boolean(id));for(const [key,o] of objects)o.button.setAttribute('aria-pressed',String(key===id));}
async function animate(el,frames,duration){await el.animate(frames,{duration:reduced.matches?100:duration,easing:'ease-in-out'}).finished;}
async function drop(id,bin){
 if(locked||scene.inert||!id||model.sorted.has(id))return;
 locked=true;
 const o=objects.get(id),start=o.button.style.transform||'translate(0,0)';
 o.button.classList.add('in-flight');
 const correct=model.sort(id,bin);
 if(correct){
  spielschritt();
  const [x,y]=openings[bin];
  const [ox,oy]=o.initialPosition,[w,h]=o.size;
  const end=delta(x-ox-w/2,y-oy-h/2);
  sound('sorted');
  await animate(o.button,[{transform:start,opacity:1},{transform:end+' scale(.75)',opacity:1,offset:.7},{transform:end+' scale(.15)',opacity:0}],470);
  o.button.hidden=true;
 }else await animate(o.button,[{transform:start},{transform:'translate(0,0)'}],330);
 o.button.style.transform='';o.button.classList.remove('in-flight');select(null);
 if(model.complete&&!emitted){
  emitted=true;scene.classList.add('waste-success');sound('complete');
  await new Promise(resolve=>setTimeout(resolve,900));
  window.dispatchEvent(new CustomEvent('muellCompleted'));
 }else locked=false;
}
function bindObject(o){
 const button=o.button;
 button.addEventListener('pointerdown',e=>{
  if(scene.inert||locked||gesture||e.button!==0)return;
  gesture={id:e.pointerId,object:o.id,origin:point(e),moving:false};
  button.setPointerCapture(e.pointerId);
 });
 button.addEventListener('pointermove',e=>{
  if(gesture?.id!==e.pointerId||gesture.object!==o.id)return;
  const [x,y]=point(e),[sx,sy]=gesture.origin;
  if(Math.hypot(x-sx,y-sy)>12)gesture.moving=true;
  if(gesture.moving){button.classList.add('in-flight');button.style.transform=delta(x-sx,y-sy);}
 });
 function end(e){
  if(gesture?.id!==e.pointerId||gesture.object!==o.id)return;
  const {moving}=gesture;gesture=null;
  if(e.type==='pointerup'&&moving)drop(o.id,binAt(binZonesForHit,...point(e)));
  else if(e.type==='pointerup')select(o.id);
  else drop(o.id,null);
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);
 button.addEventListener('click',e=>{if(e.detail===0&&!locked&&!scene.inert)select(o.id);});
}
const binZonesForHit={};
export const wasteReady=(async()=>{
 const res=await fetch(asset+'muell_konfiguration.json');if(!res.ok)throw new Error('Müll-Positionsdaten fehlen.');
 const data=await res.json();
 config={coordinateSystem:data.coordinateSpace,objects:data.items.map(o=>({
  id:o.id,label:o.id==='papier'?'Zerknülltes Papier':o.label,correctBin:o.target,
  initialPosition:[o.start.x,o.start.y],size:art[o.id].size,hitAreaPadding:22
 }))};
 model=new WasteSort(config.objects);
 const bg=scene.querySelector('.background');bg.src=asset+data.reference;
 const retouch=new Image();retouch.src=asset+data.background;
 await Promise.all([bg.decode(),retouch.decode()]);
 // Only the pavement around the original litter is retouched.
 scene.querySelector('.waste-floor').innerHTML=`<defs>
 <filter id="waste-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
 <mask id="waste-clean-patches" maskUnits="userSpaceOnUse" x="0" y="0" width="1448" height="1086">
 <path filter="url(#waste-feather)" fill="white" d="M288 770H1150Q1171 770 1171 792V925Q1171 945 1148 945H310Q288 945 288 925Z M861 746H1045V802H861Z"/>
 </mask></defs>
 <image href="${retouch.src}" width="1448" height="1086" mask="url(#waste-clean-patches)"/>
 <g class="waste-rims" fill="none" stroke="#fff0ab" stroke-width="5" stroke-linejoin="round">${Object.values(rims).map(d=>`<path d="${d}"/>`).join('')}</g>`;
 for(const b of data.bins){
  const bin=document.createElement('button');bin.type='button';bin.className='waste-bin';bin.setAttribute('aria-label',b.name);
  const {x,y,width,height}=b.region;
  rect(bin,x,y,width,height);scene.append(bin);
  binZonesForHit[b.id]={targetCenter:openings[b.id],dropRect:[x,y,x+width,y+height]};
  bin.addEventListener('click',()=>{if(!gesture)drop(selected,b.id);});
 }
 const pen=new Image();pen.src='assets/muell-v2/kugelschreiber-spiel.svg';await pen.decode();
 for(const o of config.objects){
  const button=document.createElement('button');button.type='button';button.className='waste-object';button.setAttribute('aria-label',o.label);button.setAttribute('aria-pressed','false');
  const [x,y]=o.initialPosition,[w,h]=o.size,p=o.hitAreaPadding;
  rect(button,x-p,y-p,w+2*p,h+2*p);
  const shape=art[o.id];
  const contents=shape.outline
   ? `<defs><clipPath id="waste-cut-${o.id}"><path d="${shape.outline}"/></clipPath></defs><image href="${bg.src}" x="${-x}" y="${-y}" width="1448" height="1086" clip-path="url(#waste-cut-${o.id})"/>`
   : `<image href="${pen.src}" width="${w}" height="${h}"/>`;
  button.innerHTML=`<svg viewBox="${-p} ${-p} ${w+2*p} ${h+2*p}" aria-hidden="true">${contents}</svg>`;
  scene.append(button);const item={...o,button};objects.set(o.id,item);bindObject(item);
 }
 scene.setAttribute('aria-busy','false');
})();
wasteReady.catch(error=>{const alert=scene.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;});
