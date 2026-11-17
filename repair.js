import {spielschritt,spielgeste} from './spielsignale.js';
import {RepairProgress} from './repair-state.js';

const scene=document.querySelector('#repair-scene'),svg=scene.querySelector('svg');
const trigger=scene.querySelector('[data-trigger]');
const asset='assets/metallbau/';
const armScale=1.45;
const mounts=[{x:760,y:193},{x:848,y:217},{x:838,y:283}];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let model,art=[],arm,rotor,phase='choose',pointer=null,key=null,frame=0,last=0,completed=false,loop;
export const repairSounds={drillLoop:null,screwDone:null};
function sound(name){
 const file=repairSounds[name];if(!file)return;
 const audio=new Audio(file);audio.loop=name==='drillLoop';
 if(audio.loop)loop=audio;audio.play().catch(()=>{});
}
function stop(){
 spielgeste('repair',false);
 if(model?.running)spielschritt();
 model?.stop();cancelAnimationFrame(frame);frame=0;
 if(loop){loop.pause();loop=null;}
 if(rotor)rotor.setAttribute('opacity','0');
 scene.classList.remove('drilling');trigger.setAttribute('aria-pressed','false');
}
function cancel(){stop();pointer=null;key=null;}
function box(el,{x,y,width,height}){
 const w=1672,h=941;
 Object.assign(el.style,{left:x/w*100+'%',top:y/h*100+'%',width:width/w*100+'%',height:height/h*100+'%'});
}
function alignTool(x,y){
 // Match the tip of the overlaid driver to the front face of the moving bolt.
 arm.style.transform=`translate(${x}px,${y}px)`;
 box(trigger,{x:x+72,y:y+90,width:220,height:205});
}
function draw(index,withTool=true){
 const o=art[index],p=model.values[index],distance=24*(1-p),x=o.x+distance,y=o.y-5*(1-p);
 o.head.setAttribute('transform',`translate(${x} ${y})`);
 o.cross.setAttribute('transform',`rotate(${p*1260})`);
 o.shaft.setAttribute('d',`M${o.x} ${o.y}L${x} ${y}`);
 o.root.style.visibility=p===1?'hidden':'visible';
 if(withTool){
  alignTool(x,y);
  rotor.setAttribute('transform',`translate(0 ${Math.sin(p*1260*Math.PI/180)*3})`);
 }
}
function setPhase(next){phase=next;scene.dataset.phase=next;}
function choose(index,event){
 if(scene.inert||phase!=='choose'||index!==model.index)return;
 spielschritt();art[index].target.disabled=true;
 setPhase('ready');trigger.disabled=false;
 if(event.detail===0)trigger.focus({preventScroll:true});
}
function tick(now){
 if(!model.running||scene.inert){cancel();return;}
 const i=model.index;
 const done=model.advance(Math.max(0,now-last));last=now;draw(i);
 if(!done){frame=requestAnimationFrame(tick);return;}
 spielschritt();
 const keyboard=key!==null;
 cancel();art[i].target.dataset.fertig='true';sound('screwDone');trigger.disabled=true;
 setPhase('settling');
 if(model.complete){
  scene.classList.add('repair-success');
  setTimeout(()=>{if(!completed){completed=true;window.dispatchEvent(new CustomEvent('repairCompleted'));}},1100);
 }else setTimeout(()=>{
  if(scene.inert)return;
  arm.classList.add('metallbau-gleitet');draw(model.index);
  setTimeout(()=>{
   arm.classList.remove('metallbau-gleitet');
   if(scene.inert)return;
   setPhase('choose');const next=art[model.index].target;next.disabled=false;
   if(keyboard)next.focus({preventScroll:true});
  },reduced.matches?0:420);
 },140);
}
function start(){
 if(phase!=='ready'||scene.inert||!model.start())return;
 spielschritt();spielgeste('repair',true);
 last=performance.now();rotor.setAttribute('opacity','.72');trigger.setAttribute('aria-pressed','true');scene.classList.add('drilling');sound('drillLoop');
 frame=requestAnimationFrame(tick);
}
trigger.addEventListener('pointerdown',e=>{
 if(pointer!==null||e.button!==0||phase!=='ready'||scene.inert)return;
 e.preventDefault();pointer=e.pointerId;trigger.setPointerCapture(pointer);start();
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])trigger.addEventListener(name,e=>{if(e.pointerId===pointer)cancel();});
trigger.addEventListener('keydown',e=>{
 if(![' ','Enter'].includes(e.key)||e.repeat)return;
 e.preventDefault();
 key=e.key;start();
});
window.addEventListener('keyup',e=>{if(e.key===key)cancel();});
trigger.addEventListener('blur',()=>{if(key)cancel();});
window.addEventListener('blur',cancel);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
new MutationObserver(()=>{if(scene.inert)cancel();}).observe(scene,{attributes:true,attributeFilter:['inert']});

export const repairReady=(async()=>{
 const [config]=await Promise.all([
  fetch('assets/repair/reparatur_konfiguration.json').then(r=>{if(!r.ok)throw new Error('Metallbau-Konfiguration fehlt.');return r.json();}),
  ...['wertekompass_bsh_metallbau_hintergrund.png','wertekompass_bsh_arm_akkuschrauber_transparent.png'].map(file=>{const img=new Image();img.src=asset+file;return img.decode();})
 ]);
 model=new RepairProgress(mounts.length,config.gameplay.pressDurationMsPerScrew);
 const src=asset+'wertekompass_bsh_arm_akkuschrauber_transparent.png';
 // Clip out the loose screw pictured at the tool tip. The actual screws are separate.
 svg.innerHTML=`<defs>
  <clipPath id="metallbau-arm-silhouette"><rect x="40" y="-60" width="500" height="600"/></clipPath>
  <radialGradient id="metallbau-steel" cx=".32" cy=".25" r=".83"><stop stop-color="#e6edf2"/><stop offset=".58" stop-color="#a1acb6"/><stop offset="1" stop-color="#495661"/></radialGradient>
 </defs>
 <g id="metallbau-bolts">${mounts.map((_,i)=>`<g data-bolt="${i+1}"><path class="metal-shaft" stroke="#576571" stroke-width="17" stroke-linecap="round"/><g class="metal-head"><ellipse rx="13.5" ry="16.5" fill="url(#metallbau-steel)" stroke="#35404a" stroke-width="2.7"/><g class="metal-recess"><path d="M-6-3 0-7 6-3 6 3 0 7-6 3Z" fill="#394751" stroke="#d3dbe1" stroke-width="1.4"/></g></g></g>`).join('')}</g>
 <g id="metallbau-arm">
  <path d="M2 0 13 0 41 5" fill="none" stroke="#303237" stroke-width="9" stroke-linecap="round"/>
  <path d="M12 -1 40 3" fill="none" stroke="#b9c3c9" stroke-width="3" stroke-linecap="round"/>
  <image href="${src}" x="-45" y="-78" width="${357*armScale}" height="${378*armScale}" clip-path="url(#metallbau-arm-silhouette)"/>
  <g id="metallbau-rotor" opacity="0"><path d="m43 0 16 3 m-17 3 18 4" stroke="#f1e3c8" stroke-width="2" stroke-linecap="round"/></g>
 </g>`;
 arm=svg.querySelector('#metallbau-arm');rotor=svg.querySelector('#metallbau-rotor');
 art=mounts.map((mount,i)=>{
  const root=svg.querySelector('[data-bolt="'+(i+1)+'"]'),target=document.createElement('button');
  target.type='button';target.className='repair-control repair-target';target.dataset.screw=String(i+1);
  target.setAttribute('aria-label',`Schraube ${i+1} auswählen`);
  target.disabled=i!==0;box(target,{x:mount.x-14,y:mount.y-25,width:80,height:52});
  target.addEventListener('click',event=>choose(i,event));scene.append(target);
  return {...mount,root,target,shaft:root.querySelector('.metal-shaft'),head:root.querySelector('.metal-head'),cross:root.querySelector('.metal-recess')};
 });
 art.forEach((_,i)=>draw(i,false));draw(0);
 scene.setAttribute('aria-busy','false');
})();
repairReady.catch(error=>{const alert=scene.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;});
