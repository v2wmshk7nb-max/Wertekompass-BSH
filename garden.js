import {spielschritt,spielgeste} from './spielsignale.js';
import {GardenState,plantOptions,plantTypes} from './garden-state.js?v=bsh-garden-2';
import {gardenPlant} from './garden-bsh-art.js?v=bsh-garden-2';

const scene=document.querySelector('#garden-scene');
const model=new GardenState();
const width=1448,height=1086;
const hole={x:837,y:782,rx:93,ry:56};
const asset='assets/garden-bsh/';
const NS='http://www.w3.org/2000/svg';
const buttons={};
let svg,choices,plant,drag,soil,water,canPatch,can,particles,pointer=null;

function group(id){
 const node=document.createElementNS(NS,'g');
 node.id=id;
 svg.append(node);
 return node;
}

function local(e){
 const r=scene.getBoundingClientRect();
 return {x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};
}

function inHole(p){
 return ((p.x-hole.x)/hole.rx)**2+((p.y-hole.y)/hole.ry)**2<=1;
}

function move(node,x,y){node.setAttribute('transform',`translate(${x} ${y})`);}

function button(id,label,x,y,w,h){
 const b=document.createElement('button');
 b.type='button';b.className='garden-tool';b.setAttribute('aria-label',label);b.dataset.action=id;
 Object.assign(b.style,{left:x/width*100+'%',top:y/height*100+'%',width:w/width*100+'%',height:h/height*100+'%'});
 scene.append(b);buttons[id]=b;
 return b;
}

function refresh(){
 const step=model.step;
 const choosing=step==='choose'||step==='drag';
 scene.dataset.step=step;
 buttons.trowel.disabled=step!=='trowel';
 buttons.planting_place.disabled=step!=='dig'&&step!=='water';
 buttons.watering_can.disabled=step!=='can';
 soil.style.opacity=model.digs===0||!['dig','choose','drag'].includes(step)?1:model.digs===1?.38:0;
 for(const type of plantTypes){
  const b=buttons['plant_'+type];
  b.hidden=!choosing;
  b.disabled=!choosing;
  b.setAttribute('aria-pressed',String(model.plant===type));
 }
 choices.innerHTML=choosing?plantTypes.filter(type=>pointer?.type!==type).map(type=>{
  const {x,y}=plantOptions[type];
  return `<g transform="translate(${x} ${y})"><ellipse rx="27" ry="7" fill="#351d1350"/>${gardenPlant(type,'pot',97)}</g>`;
 }).join(''):'';
}

function diggingMotion(){
 particles.innerHTML=Array.from({length:9},(_,i)=>{
  const x=hole.x+(i-4)*10,y=hole.y-11+((i*13)%29);
  return `<ellipse cx="${x}" cy="${y}" rx="${3+i%3}" ry="3" fill="${i%2?'#ad7852':'#68462e'}"/>`;
 }).join('');
 particles.animate([{transform:'translateY(2px)',opacity:.2},{transform:'translateY(-19px)',opacity:1,offset:.35},{transform:'translateY(8px)',opacity:0}],{duration:470,fill:'both'});
}

function choose(type){
 const changed=model.plant!==type;
 if(!model.choose(type))return false;
 if(changed)spielschritt();
 refresh();
 return true;
}

function showSeedling(){
 move(plant,hole.x,hole.y+8);
 plant.innerHTML=gardenPlant(model.plant,'seed',53);
}

async function pour(){
 if(!model.water())return;
 spielschritt();
 refresh();
 canPatch.style.visibility='visible';
 can.style.visibility='visible';
 const motion=can.animate([
  {transform:'translate(1118px,435px) rotate(0deg) scale(1)'},
  {transform:'translate(873px,610px) rotate(-49deg) scale(.67)',offset:.27},
  {transform:'translate(873px,610px) rotate(-49deg) scale(.67)',offset:.76},
  {transform:'translate(1118px,435px) rotate(0deg) scale(1)'}
 ],{duration:1550,fill:'both',easing:'ease-in-out'});
 const stream=water.animate([{opacity:0},{opacity:0,offset:.23},{opacity:1,offset:.32},{opacity:1,offset:.73},{opacity:0,offset:.83},{opacity:0}],{duration:1550,fill:'both'});
 await motion.finished;
 canPatch.style.visibility='hidden';
 can.style.visibility='hidden';
 water.style.opacity='0';
 motion.cancel();stream.cancel();
 if(!model.grow())return;
 refresh();
 plant.innerHTML=gardenPlant(model.plant,'plant',142);
 const anchor=`translate(${hole.x}px,${hole.y+8}px)`;
 const growth=plant.animate([{transform:anchor+' scale(.373)'},{transform:anchor+' scale(1)'}],{duration:1700,easing:'ease-in-out',fill:'both'});
 await growth.finished;
 growth.cancel();
 if(!model.finish())return;
 refresh();
 scene.classList.add('garden-success');
 await new Promise(resolve=>setTimeout(resolve,900));
 window.dispatchEvent(new CustomEvent('gardenCompleted',{detail:{plant:model.plant}}));
}

function setupArtwork(){
 svg=document.createElementNS(NS,'svg');
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 svg.classList.add('garden-art');
 svg.setAttribute('aria-hidden','true');
 svg.innerHTML=`<defs>
  <radialGradient id="garden-earth-edge"><stop offset=".71" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient>
  <mask id="garden-earth-front"><ellipse cx="838" cy="778" rx="121" ry="54" fill="url(#garden-earth-edge)"/></mask>
  <mask id="garden-earth-back"><ellipse cx="996" cy="737" rx="112" ry="49" fill="url(#garden-earth-edge)"/></mask>
  <filter id="garden-can-edge" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  <mask id="garden-can-cover"><path d="M1070 409 L1199 343 L1354 344 L1390 398 L1395 536 L1359 611 L1192 614 L1105 514 L1070 482Z" fill="white" filter="url(#garden-can-edge)"/></mask>
  <clipPath id="garden-can-cut"><path clip-rule="evenodd" d="M1086 462 Q1081 448 1104 422 Q1129 396 1141 405 Q1150 412 1145 441 L1182 471 L1205 473 L1205 445 Q1198 437 1215 431 Q1224 370 1269 362 Q1330 349 1360 407 Q1392 470 1370 524 Q1361 546 1341 560 L1341 577 Q1349 588 1334 594 Q1273 612 1209 593 Q1196 587 1201 576 L1205 560 L1134 471 Q1114 476 1105 468 Q1089 475 1086 462Z M1232 426 Q1248 370 1289 376 Q1320 376 1341 417 Q1364 460 1359 506 Q1354 529 1343 540 L1345 442 Q1346 428 1313 426 Q1272 420 1232 426Z M1164 474 L1205 513 L1205 484Z"/></clipPath>
 </defs>`;
 scene.append(svg);
 const earth=`<image href="${asset}ebene-erde.png" width="${width}" height="${height}"/>`;
 group('garden-soil-back').innerHTML=`<g mask="url(#garden-earth-back)">${earth}</g>`;
 soil=group('garden-soil');
 soil.innerHTML=`<g mask="url(#garden-earth-front)">${earth}</g>`;
 particles=group('garden-particles');
 choices=group('garden-options');
 plant=group('garden-plant');
 canPatch=group('garden-can-patch');
 canPatch.style.visibility='hidden';
 canPatch.innerHTML=`<image mask="url(#garden-can-cover)" href="${asset}ohne-kanne.png" width="${width}" height="${height}"/>`;
 water=group('garden-water');
 water.style.opacity='0';
 water.innerHTML='<g class="water-stream" fill="none" stroke="#a6e7f4" stroke-width="5" stroke-linecap="round"><path d="M867 607 Q827 668 817 776"/><path d="M874 614 Q843 672 838 781"/><path d="M880 620 Q858 681 859 775"/></g>';
 can=group('garden-moving-can');
 can.style.visibility='hidden';
 can.innerHTML=`<g transform="translate(-1118 -435)"><image clip-path="url(#garden-can-cut)" href="${asset}hochbeet.png" width="${width}" height="${height}"/></g>`;
 drag=group('garden-drag');
}

function installChoice(type){
 const {label,x,y}=plantOptions[type];
 const b=button('plant_'+type,label,x-47,y-100,94,106);
 b.addEventListener('click',()=>choose(type));
 b.addEventListener('pointerdown',e=>{
  if(scene.inert||pointer||(e.pointerType==='mouse'&&e.button!==0)||!choose(type))return;
  e.preventDefault();
  pointer={id:e.pointerId,type,start:local(e),x,y,moving:false};
  b.setPointerCapture(e.pointerId);
 });
 b.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer?.id)return;
  e.preventDefault();
  const p=local(e),dx=p.x-pointer.start.x,dy=p.y-pointer.start.y;
  if(!pointer.moving&&Math.hypot(dx,dy)<8)return;
  if(!pointer.moving){
   pointer.moving=true;
   spielgeste('garden',true);
   refresh();
   drag.innerHTML=gardenPlant(type,'pot',97);
  }
  move(drag,x+dx,y+dy);
  buttons.planting_place.classList.toggle('drop-ready',inHole(p));
 });
 const stop=e=>{
  if(e.pointerId!==pointer?.id)return;
  const planted=e.type==='pointerup'&&pointer.moving&&model.drop(inHole(local(e)));
  pointer=null;
  spielgeste('garden',false);
  drag.innerHTML='';
  buttons.planting_place.classList.remove('drop-ready');
  if(planted){showSeedling();spielschritt();}
  refresh();
 };
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,stop);
}

export const gardenReady=(async()=>{
 const preload=[scene.querySelector('img'),...['ebene-erde.png','ohne-kanne.png','pflanzen.png'].map(file=>{
  const image=new Image();image.src=asset+file;return image;
 })];
 await Promise.all(preload.map(image=>image.decode()));
 setupArtwork();
 button('trowel','Gartenschaufel',248,724,323,172).addEventListener('click',()=>{
  if(model.takeTrowel()){spielschritt();refresh();}
 });
 button('planting_place','Pflanzstelle',hole.x-hole.rx,hole.y-hole.ry,hole.rx*2,hole.ry*2).addEventListener('click',()=>{
  if(model.dig()){spielschritt();refresh();diggingMotion();}
  else if(model.step==='water')pour();
 });
 button('watering_can','Gießkanne',1080,354,306,254).addEventListener('click',()=>{
  if(model.takeCan()){spielschritt();refresh();}
 });
 for(const type of plantTypes)installChoice(type);
 refresh();
 scene.setAttribute('aria-busy','false');
 window.gardenAction={get step(){return model.step},get plant(){return model.plant},get completed(){return model.completed},get digs(){return model.digs}};
})();
gardenReady.catch(error=>{
 const alert=scene.querySelector('[role="alert"]');
 alert.hidden=false;
 alert.textContent='Die Gartenszene konnte nicht geladen werden. '+error.message;
});
