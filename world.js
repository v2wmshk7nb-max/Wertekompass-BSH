import {spielschritt} from './spielsignale.js';
import {installRoundHelp} from './rundenhilfe.js?v=bsh-basketball-1';
import {basketballReady} from './basketball.js?v=bsh-release-1';
import {repairReady} from './repair.js?v=bsh-metallbau-1';
import {wasteReady} from './muell.js?v=bsh-muell-1';
import {bankReady} from './app.js?v=bsh-bank-1';
import {gardenReady} from './garden.js?v=bsh-garden-2';
import {RoundProgress} from './garden-state.js?v=bsh-garden-2';
import {gardenPlant} from './garden-bsh-art.js?v=bsh-garden-2';
const game=document.querySelector('#game'),world=document.querySelector('#world'),camera=document.querySelector('#world-camera');
const activities={
 bank:{scene:document.querySelector('#scene'),entry:document.querySelector('#bench-entry'),origin:'57.791% 52.183%',zoom:'translate(-7.791%,-2.183%) scale(2.8)',label:'Bank fertig gestrichen',ready:bankReady},
 garden:{scene:document.querySelector('#garden-scene'),entry:document.querySelector('#garden-entry'),origin:'80.000% 72.311%',zoom:'translate(-30.000%,-22.311%) scale(2.6)',label:'Garten fertig bepflanzt',ready:gardenReady},
 muell:{scene:document.querySelector('#muell-scene'),entry:document.querySelector('#muell-entry'),origin:'12.358% 42.492%',zoom:'translate(37.642%,7.508%) scale(2.6)',label:'Müll fertig sortiert',ready:wasteReady},
 repair:{scene:document.querySelector('#repair-scene'),entry:document.querySelector('#repair-entry'),origin:'24.716% 35.996%',zoom:'translate(25.284%,14.004%) scale(2.6)',label:'Metallbau abgeschlossen',ready:repairReady},
 basketball:{scene:document.querySelector('#basketball-scene'),entry:document.querySelector('#basketball-entry'),origin:'92.119% 32.907%',zoom:'translate(-42.119%,17.093%) scale(2.6)',label:'Basketballkorb getroffen',ready:basketballReady}
};
const fit=()=>game.style.setProperty('--stage-height',`${game.clientHeight}px`);
new ResizeObserver(fit).observe(game);fit();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const round=new RoundProgress();
let view='start',current=null;
const help=installRoundHelp(game);
const boardEntry=document.querySelector('#board-entry'),speaker=document.querySelector('#frage-anhoeren');
const audio=document.querySelector('#board-audio'),banner=document.querySelector('#values-board');
let playing=false,finale=false,resetTimer=0;
function listen(finish=false){
 // A board tap can promote an already playing preview to the finale.
 if(finish){
  finale=true;game.classList.add('frage-abschluss');
  state('board');banner.hidden=false;banner.focus({preventScroll:true});
 }
 if(playing)return;
 clearTimeout(resetTimer);playing=true;help.pause();
 audio.currentTime=0;
 audio.play().catch(audioFailed);
}
function audioFailed(){
 if(!playing)return;
 playing=false;
 if(finale){
  finale=false;game.classList.remove('frage-abschluss');
  banner.hidden=true;state('world');boardEntry.focus({preventScroll:true});
 }
 help.resume();
}
audio.addEventListener('error',audioFailed);
audio.addEventListener('ended',()=>{
 if(!playing)return;
 playing=false;
 if(finale)resetTimer=setTimeout(()=>location.reload(),10000);
 else help.resume();
});
boardEntry.addEventListener('click',()=>{if(view==='world')listen(round.unlocked);});
speaker.addEventListener('click',()=>{if(view!=='start')listen();});
function state(next){
 view=next;game.dataset.view=next;
 for(const [id,item]of Object.entries(activities)){const enabled=next===id;item.scene.inert=!enabled;item.scene.setAttribute('aria-hidden',String(!enabled));}
 world.inert=next!=='world';world.setAttribute('aria-hidden',String(next!=='world'));
}
const ease='cubic-bezier(.42,0,.58,1)';
async function animate(element,keyframes,duration,delay=0){
 const animation=element.animate(keyframes,{duration:reduced.matches?180:duration,delay:reduced.matches?0:delay,easing:ease,fill:'both'});
 await animation.finished;
 for(const [property,value]of Object.entries(keyframes[keyframes.length-1]))element.style[property]=value;
 animation.cancel();
}
const startScreen=document.querySelector('#start-screen'),startButton=document.querySelector('#start-button');
startButton.addEventListener('click',()=>{
 if(view!=='start')return;
 const keyboard=document.activeElement===startButton&&startButton.matches(':focus-visible');
 // Paint-only fade: never depend on an animation callback to unlock the hit targets.
 startScreen.inert=true;
 startScreen.classList.add('departing');
 help.begin();boardEntry.hidden=false;speaker.hidden=false;state('world');
 setTimeout(()=>{startScreen.hidden=true;},reduced.matches?180:480);
 if(keyboard)world.querySelector('button:enabled')?.focus({preventScroll:true});
});
for(const [id,item]of Object.entries(activities)){
 item.ready.then(()=>{item.entry.disabled=round.unlocked;}).catch(()=>{
  item.entry.disabled=round.unlocked;item.failed=true;item.entry.setAttribute('aria-label',item.entry.getAttribute('aria-label')+': Ladefehler anzeigen');
 });
 item.entry.addEventListener('click',async()=>{
  if(view!=='world'||round.unlocked||round.activities.has(id))return;
  spielschritt();current=id;game.dataset.activity=id;camera.style.transformOrigin=item.origin;
  state('entering');
  await Promise.all([
   animate(camera,[{transform:'translate(0,0) scale(1)'},{transform:item.zoom}],1200),
   animate(world,[{opacity:1},{opacity:0}],800,400),
   animate(item.scene,[{opacity:0},{opacity:1}],800,400),
   animate(item.scene,[{transform:'scale(.985)'},{transform:'scale(1)'}],2000)
  ]);
  state(id);
  (id==='bank'?document.querySelector('[data-color="rot"]'):id==='garden'?document.querySelector('[data-action="trowel"]'):item.scene.querySelector(id==='repair'?'[data-screw="1"]':id==='basketball'?'.basketball-ball':'.waste-object'))?.focus({preventScroll:true});
 });
 window.addEventListener(id+'Completed',async event=>{
  if(view!==id||current!==id||round.activities.has(id))return;
  const unlocked=round.complete(id);
  if(id==='bank')world.classList.add('finished');else item.entry.classList.add('finished');
  if(id==='garden'){
   document.querySelector('#world-garden-detail').innerHTML=`<g transform="translate(1410 754) scale(.48)">${gardenPlant(event.detail.plant,'plant',105)}</g>`;
  }
  item.entry.disabled=true;item.entry.setAttribute('aria-label',item.label);item.entry.setAttribute('aria-disabled','true');
  state('returning');
  await Promise.all([animate(item.scene,[{opacity:1},{opacity:0}],800),animate(world,[{opacity:0},{opacity:1}],800)]);
  await animate(camera,[{transform:item.zoom},{transform:'translate(0,0) scale(1)'}],1200);
  current=null;
  world.setAttribute('aria-label','Schulwelt. '+[...round.activities].map(key=>activities[key].label).join('. ')+'.');
  // Only distinct completed scenes count. No board finale/audio is started automatically.
  if(unlocked){
   for(const item of Object.values(activities))item.entry.disabled=true;
   boardEntry.dataset.abschluss='true';
   boardEntry.setAttribute('aria-label','Werteboard: Abschluss anhören');
  }
  spielschritt();state('world');
  if(unlocked)window.dispatchEvent(new CustomEvent('valuesBoardUnlocked'));
 });
}
window.wertekompassRound={get completedActivities(){return [...round.activities]},get boardUnlocked(){return round.unlocked}};
