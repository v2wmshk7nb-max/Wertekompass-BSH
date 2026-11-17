import {spielschritt} from './spielsignale.js';
import {flightPoint,planShot,smooth} from './basketball-flight.js';

const scene=document.querySelector('#basketball-scene');
const field=scene.querySelector('.basketball-field'),ball=scene.querySelector('.basketball-ball');
const shadow=scene.querySelector('.basketball-shadow'),front=scene.querySelector('.basketball-front');
const asset='assets/basketball-bsh/';
const rim='M1028 269 Q1040 292 1103 284 Q1167 279 1180 260';
const cords='M1036 271 Q1066 319 1073 382 Q1077 392 1086 376 L1128 321 1163 267 M1053 276 Q1070 324 1128 384 Q1135 384 1138 375 M1070 281 Q1090 339 1139 378 Q1149 389 1143 360 L1173 265 M1090 284Q1110 341 1144 371 M1110 284Q1123 325 1148 348 M1130 280Q1141 310 1155 324 M1150 275Q1158 291 1163 301 M1165 268 Q1149 322 1106 380 Q1099 394 1090 376 L1064 351 M1146 274Q1129 331 1087 379 M1127 279Q1113 325 1076 366 M1107 282Q1094 319 1070 348 M1088 284Q1080 311 1063 330 M1070 280Q1066 301 1055 308 M1048 275Q1072 341 1118 386 Q1126 391 1133 375 L1151 346';
let config,start,hoop,net,landing,gesture=null,phase='idle',misses=0,version=0;
let occlusion;
function pct(value,axis){return value/config.referenceSize[axis]*100+'%';}
function position(el,x,y){el.style.left=pct(x,'width');el.style.top=pct(y,'height');}
function setPhase(next){phase=next;scene.dataset.phase=next;}
function render({x,y,scale=1,angle=0}){
 position(ball,x,y);
 if(occlusion){occlusion.setAttribute('cx',x);occlusion.setAttribute('cy',y);occlusion.setAttribute('r',config.sprites.ball.radiusApproxPx*scale);}
 ball.style.setProperty('--ball-scale',String(scale));ball.style.setProperty('--ball-angle',angle+'deg');
 const depth=Math.max(0,Math.min(1,(x-start.x)/(landing.x-start.x)));
 const ground=start.y+111+(landing.y+70-start.y-111)*depth;
 const height=Math.max(0,ground-y-config.sprites.ball.radiusApproxPx*scale);
 position(shadow,x+35*(1-depth),ground);
 shadow.style.opacity=String(.60*scale*Math.max(.2,1-height/760));
 shadow.style.setProperty('--shadow-scale',String(1-.52*depth));
}
function reset(){
 version++;gesture=null;render(start);scene.classList.remove('basketball-through','basketball-score');
 setPhase('idle');
}
function point(e){
 const r=field.getBoundingClientRect(),{width,height}=config.referenceSize;
 return {x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};
}
function animate(ms,token,draw){
 return new Promise(resolve=>{
  let startTime;
  function frame(now){
   if(token!==version||scene.inert||document.hidden){resolve(false);return;}
   startTime??=now;
   const p=Math.min(1,(now-startTime)/ms);draw(p);
   if(p<1)requestAnimationFrame(frame);else resolve(true);
  }
  requestAnimationFrame(frame);
 });
}
async function throwBall(shot){
 const token=++version;
 setPhase('flight');
 const end=shot.hit?shot.cross:1;
 if(!await animate(shot.duration*end,token,t=>render(flightPoint(shot,t*end)))){
  if(token===version)reset();return;
 }
 const landed=flightPoint(shot,end);
 if(shot.hit){
  setPhase('net');scene.classList.add('basketball-through');
  const cleared=await animate(420,token,t=>render({
   x:hoop.x+(net.x-hoop.x)*t,y:hoop.y+(net.y+51-hoop.y)*(.58*t+.42*t*t),
   scale:landed.scale+(.30-landed.scale)*t,angle:landed.angle+82*t
  }));
  if(!cleared){if(token===version)reset();return;}
  scene.classList.remove('basketball-through');scene.classList.add('basketball-score');
  const drift=landing.x-net.x;
  const fell=await animate(540,token,t=>render({
   x:net.x+drift*t,y:net.y+51+(landing.y-net.y-51)*(.55*t+.45*t*t),
   scale:.30+.27*t,angle:landed.angle+82+158*t
  }));
  if(!fell){if(token===version)reset();return;}
  setPhase('complete');window.dispatchEvent(new CustomEvent('basketballCompleted'));return;
 }
 misses++;setPhase('return');
 await animate(620,token,t=>render({
  x:landed.x+(start.x-landed.x)*smooth(t),y:start.y-52*Math.sin(Math.PI*t)*(1-t),
  angle:landed.angle*(1-t)
 }));
 if(token===version){reset();spielschritt();}
}
ball.addEventListener('pointerdown',e=>{
 if(scene.inert||phase!=='idle'||gesture||e.button!==0)return;
 e.preventDefault();gesture={id:e.pointerId,origin:point(e)};
 ball.setPointerCapture(e.pointerId);setPhase('aim');
});
ball.addEventListener('pointermove',e=>{
 if(gesture?.id!==e.pointerId)return;
 e.preventDefault();
});
ball.addEventListener('pointerup',e=>{
 if(gesture?.id!==e.pointerId)return;
 const {origin}=gesture;gesture=null;const p=point(e);
 const shot=planShot({dx:p.x-origin.x,dy:p.y-origin.y},start,hoop,config.interaction,misses);
 if(shot){spielschritt();throwBall(shot);}else setPhase('idle');
});
for(const event of ['pointercancel','lostpointercapture'])ball.addEventListener(event,e=>{
 if(gesture?.id===e.pointerId)reset();
});
function abort(){if(config&&!['idle','complete'].includes(phase))reset();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)abort();});
window.addEventListener('blur',()=>{if(gesture)abort();});
new MutationObserver(()=>{if(scene.inert)abort();}).observe(scene,{attributes:true,attributeFilter:['inert']});

export const basketballReady=(async()=>{
 const res=await fetch(asset+'konfiguration.json');if(!res.ok)throw new Error('Basketball-Konfiguration fehlt.');
 config=await res.json();
 ({ballStartCenter:start,hoopCenter:hoop,hoopNetBottom:net,landing}=config.anchorPoints);
 const background=field.querySelector('.background'),sprite=new Image();
 background.src=asset+config.assets.sceneBackground;
 sprite.src=asset+config.assets.spriteSource;
 await Promise.all([background.decode(),sprite.decode()]);
 field.style.setProperty('--ball-width',pct(config.sprites.ball.width,'width'));
 shadow.style.width=pct(config.sprites.shadow.width,'width');
 const {dx,dy}=config.interaction.hintSwipe;
 ball.dataset.hintDx=String(dx/config.referenceSize.width);
 ball.dataset.hintDy=String(dy/config.referenceSize.height);
 const outline='M210 927 C210 861 260 806 332 805 C399 803 453 852 454 924 C455 988 401 1046 334 1047 C262 1048 209 996 210 927Z';
 ball.innerHTML=`<svg class="basketball-sprite" viewBox="209 802 246 246" aria-hidden="true"><defs><clipPath id="bsh-ball-outline"><path d="${outline}"/></clipPath></defs><image clip-path="url(#bsh-ball-outline)" href="${sprite.getAttribute('src')}" width="1448" height="1086"/></svg>`;
 front.innerHTML=`<defs><clipPath id="basketball-ball-overlap"><circle/></clipPath></defs><g clip-path="url(#basketball-ball-overlap)"><g class="basketball-net"><path d="${cords}" fill="none" stroke="#72584d" stroke-width="5" stroke-linejoin="round"/><path d="${cords}" fill="none" stroke="#fff3e4" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/></g><path d="${rim}" fill="none" stroke="#a5360e" stroke-width="8" stroke-linecap="round"/><path d="${rim}" fill="none" stroke="#e44e23" stroke-width="4" stroke-linecap="round"/></g>`;
 occlusion=front.querySelector('circle');
 render(start);scene.setAttribute('aria-busy','false');
})();
basketballReady.catch(error=>{const alert=scene.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;});
