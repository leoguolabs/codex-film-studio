import {C, ease, clamp, mix, line, poly, arch, fan, fanPair, person, bulb, lightBeam, ellipse, glow} from '../starter/lib/material.mjs';

const $ = selector => document.querySelector(selector);
const copy = {
  en: {
    skip:'Skip to the style study', navigation:'Main navigation', language:'Page language', navStudy:'The style', navMake:'Make a film', allStyles:'All styles ↗',
    eyebrow:'THE MOVING PICTURE COLLECTION · STYLE 08', heroLine:'Every edge, illuminated.<br>Every movement, composed.', heroDescription:'Black lacquer. Sculpted brass. A world of stepped arches, expressive figures and light that moves to its own rhythm.', explore:'Watch the films ↓',
    studyLabel:'01 / A STUDY IN LIGHT & MOTION', studyFormat:'16 SECONDS · INTERACTIVE · SILENT', posterAlt:'An original Art Deco study of a brass arch and ivory fans', canvasDescription:'An Art Deco hall: brass doors open, a figure crosses the light, and ivory fans form an overhead pattern.', play:'Play study', pause:'Pause study', restart:'Restart study', timeline:'Study progress', chapters:'Study chapters', chapter1:'The threshold', chapter2:'A human gesture', chapter3:'Light in sequence', chapter4:'The overhead reveal', studyNote:'An original, silent material study using the reusable Art Deco drawing toolkit. Explore its visual language, then give it a story of your own.',
    visualEyebrow:'02 / THE VISUAL LANGUAGE', visualTitle:'Opulence,<br>with intention.', visualIntro:'Decoration becomes storytelling when a door reveals a space, a glint draws the eye, and a small gesture changes the scene.', palette:'Art Deco color palette', lacquer:'Black lacquer', brass:'Graded brass', ivory:'Warm ivory', burgundy:'Burgundy', emerald:'Emerald', rule1Title:'Give light an edge.', rule1:'Thin metallic highlights trace hard planes. Warm ivory and skin keep their light; local glows give lamps their own presence.', rule2Title:'Build a world with depth.', rule2:'Stepped arches, chevrons and fan shapes belong to rooms and objects. Foreground and background travel at different speeds.', rule3Title:'Let the body speak.', rule3:'Faceted faces, fitted clothing and articulated hands carry the action. Anticipation, contact and release make a gesture legible.', rule4Title:'Compose the rhythm.', rule4:'Piano, clarinet, strings and muted brass leave room for narration. Steps, switches and impacts land on the same frame clock.',
    makeEyebrow:'03 / YOUR TURN TO DIRECT', makeTitle:'A new story.<br>A golden thread.', makeIntro:'Start with the materials and figure toolkit. Bring a subject, an audience and a running time; build your own scenes, voice and score.', repoLabel:'THE PROJECT ON GITHUB', guide:'Read the style guide ↗', copy:'Copy command', copied:'Command copied.', copyFailed:'Select and copy the command above.', promptEyebrow:'START A CONVERSATION IN CODEX', prompt:'Create a three-minute vertical Art Deco film about a subject I provide. Use black lacquer, graded brass, warm faceted figures and stepped architecture. Build clear physical actions and spatial camera moves, with original jazz and English narration. Keep image, voice and captions on one timeline, then inspect and refine the result.', fullPrompt:'Open the reusable prompt ↗', packageNote:'Included: drawing materials, articulated figures, camera helpers and a blank film contract. Each new film needs its own scene renderer, story and soundtrack. Watch the finished films above, then explore the interactive study.',
    notesEyebrow:'04 / INSIDE THE STUDIO', notesTitle:'Craft in every frame.', note1Title:'One shared clock.', note1:'Camera and lighting run at 24 fps. Slower character motion can use 12 pose updates per second; quick gestures need consecutive 24 fps poses.', note2Title:'A vertical restaging.', note2:'A portrait film needs a new composition. Fit the full gesture and fan envelopes, preserve foot contact, and keep captions inside safe areas.', note3Title:'Review the movement.', note3:'Inspect hands, faces, occlusion and cut boundaries, then review normal-speed playback and audio separately. An attractive still is one part of the film.', toolkit:'Explore the toolkit ↗', director:'Director’s guide ↗', production:'Production guide ↗',
    creditsEyebrow:'05 / INSPIRATION & CREDITS', creditsTitle:'A conversation with the classics.', creditsBody:'The visual reference is LemoLab’s <em>Midnight at the Starlight Hotel</em>, from lemo-opuscar (CC BY 4.0). This page’s study and drawing toolkit are independently authored. The reference’s story, score and animation code are not included.', reference:'Watch the reference ↗', referenceLibrary:'LemoLab’s style library ↗', provenance:'Provenance & licenses ↗', fontCredit:'Limelight by Sorkin Type Co and Josefin Sans by the Josefin Sans Project Authors. Font files are hosted here under the SIL Open Font License.', footer:'A visual language for your next film.',
  },
  zh: {
    skip:'跳转到风格演示', navigation:'主导航', language:'页面语言', navStudy:'风格演示', navMake:'开始创作', allStyles:'全部风格 ↗',
    eyebrow:'动态影像风格集 · STYLE 08', heroLine:'让光，勾勒每一道轮廓。<br>让动作，自成一段韵律。', heroDescription:'黑漆、渐变黄铜、阶梯拱门与切面人物。让光线拥有自己的节奏，让精密的几何空间承载鲜活的故事。', explore:'观看最终成片 ↓',
    studyLabel:'01 / 光与运动的风格实验', studyFormat:'16 秒 · 可交互 · 无声', posterAlt:'原创装饰艺术示意：黄铜拱门与象牙白折扇', canvasDescription:'装饰艺术大厅：黄铜门打开，人物走入光中，象牙白折扇组成俯视图案。', play:'播放演示', pause:'暂停演示', restart:'从头播放', timeline:'演示进度', chapters:'演示章节', chapter1:'门后的空间', chapter2:'人物的动作', chapter3:'依次点亮', chapter4:'俯视的秩序', studyNote:'这段原创无声演示使用 Art Deco 可复用绘制工具制作。先感受它的材质与运动，再为它写下自己的故事。',
    visualEyebrow:'02 / 视觉语言', visualTitle:'精致的装饰，<br>有意的安排。', visualIntro:'一扇门打开空间，一道高光引导视线，一个小动作推动情节。装饰在这些时刻，成为叙事的一部分。', palette:'装饰艺术配色', lacquer:'黑漆', brass:'渐变黄铜', ivory:'暖象牙白', burgundy:'勃艮第红', emerald:'祖母绿', rule1Title:'用光勾勒轮廓。', rule1:'细窄的金属高光沿硬朗切面延伸。象牙白与肤色保留明亮端点，灯泡用局部光晕显出体积。', rule2Title:'让空间有纵深。', rule2:'阶梯拱门、V 形纹样和扇形结构融入房间与道具。前景与远景以不同速度移动，产生真实的空间层次。', rule3Title:'让身体说话。', rule3:'切面脸部、合身服装与有关节的双手承担表演。预备、接触、释放，让观众看清一个动作的来龙去脉。', rule4Title:'编排动作的节奏。', rule4:'钢琴、单簧管、弦乐与弱音铜管为旁白留出空间。脚步、开关和碰撞，与画面落在同一帧时钟上。',
    makeEyebrow:'03 / 这一次，由你执导', makeTitle:'新的故事，<br>同一缕金色。', makeIntro:'从材质与人物工具开始，带上主题、观众和时长要求，创作自己的场景、旁白与配乐。', repoLabel:'在 GITHUB 获取项目', guide:'阅读风格指南 ↗', copy:'复制命令', copied:'命令已复制。', copyFailed:'请选中上方命令并复制。', promptEyebrow:'在 CODEX 中这样开始', prompt:'请围绕我提供的主题，创作一部三分钟的竖屏 Art Deco 动画。使用黑漆、渐变黄铜、暖色切面人物与阶梯建筑，安排清楚的实体动作和有纵深的镜头，配上原创爵士乐与英语旁白。让画面、声音和字幕共用一条时间轴，完成后检查并打磨成片。', fullPrompt:'查看可复用提示词 ↗', packageNote:'工具包包含材质绘制、关节人物、镜头辅助函数和空白影片约定。每个新选题需要独立编写场景渲染器、故事与声音。先观看上方最终成片，再探索交互演示。',
    notesEyebrow:'04 / 制作手记', notesTitle:'把工艺，做到每一帧。', note1Title:'共用一只时钟。', note1:'镜头与灯光以 24 fps 运行。较慢的人物动作可每秒更新 12 次姿态；快速手势则需要连续的 24 fps 动作姿态。', note2Title:'为竖屏重新构图。', note2:'竖屏影片需要重新安排空间。容纳完整手势与扇面的运动范围，保持脚底接地，并为字幕留出安全区域。', note3Title:'检查连续的运动。', note3:'检查手、脸、遮挡与切镜边界，再分别验收正常速度播放和声音。漂亮的静帧，只是影片的一部分。', toolkit:'查看绘制工具包 ↗', director:'导演指南 ↗', production:'制作技术指南 ↗',
    creditsEyebrow:'05 / 灵感与署名', creditsTitle:'与经典的视觉语言对话。', creditsBody:'视觉参考来自 LemoLab 的 <em>Midnight at the Starlight Hotel</em>，收录于 lemo-opuscar，采用 CC BY 4.0 许可。本页风格演示与绘制工具独立编写，未导入参考片的故事、音乐或动画代码。', reference:'观看原始参考片 ↗', referenceLibrary:'LemoLab 风格库 ↗', provenance:'素材来源与许可 ↗', fontCredit:'Limelight 字体由 Sorkin Type Co 设计，Josefin Sans 来自 Josefin Sans Project Authors。字体在本站托管，并保留 SIL Open Font License。', footer:'为下一个故事，找到自己的视觉语言。',
  },
};
const state={language:'en',time:0,playing:false,raf:0,previous:0};
const t=key=>copy[state.language][key]??copy.en[key];
const canvas=$('#deco-canvas'),g=canvas.getContext('2d');
const W=1440,H=840,DURATION=16;

function hall(time){
  const wash=g.createLinearGradient(0,0,0,H);wash.addColorStop(0,'#091112');wash.addColorStop(.65,'#172520');wash.addColorStop(1,'#060605');g.fillStyle=wash;g.fillRect(0,0,W,H);
  // Moving light is independent of architectural geometry.
  lightBeam(g,[205,-80],[760+Math.sin(time*.33)*140,780],28,430,{strength:.16});
  lightBeam(g,[1235,-80],[780-Math.sin(time*.3)*180,780],28,380,{color:'179,211,196',strength:.13});
  const push=1+.025*ease(time/12);g.save();g.translate(720,400);g.scale(push,push);g.translate(-720,-400);
  poly(g,[[0,650],[1440,650],[1440,840],[0,840]],'#0e1410','#2c3021',false);
  for(let i=-8;i<=8;i++)line(g,[[720+i*42,650],[720+i*210,840]],.8,0,false,.4);
  for(let i=0;i<6;i++){const y=650+Math.pow(i/5,1.7)*190;line(g,[[0,y],[1440,y]],.7,0,false,.4);}
  for(const s of [-1,1]){
    const x=720+s*475;
    poly(g,[[x-74,0],[x+74,0],[x+74,655],[x-74,655]],'#171a12','#35331e');
    for(let k=0;k<5;k++)line(g,[[x-58+k*29,0],[x-58+k*29,650]],1,time,false,.6);
    fan(g,x,410,104,1,0,C.gold,{folded:true});
    bulb(g,x,413,.85,5);glow(g,x,400,150,'238,197,108',.17);
    line(g,[[x-75,590],[x,540],[x+75,590]],1.4);
    line(g,[[x-75,610],[x,560],[x+75,610]],1.4);
  }
  glow(g,720,405,330,'236,196,114',.16);
  arch(g,720,650,510,510,6);
  // The doors turn on their outer hinges; the revealed opening gains width.
  const open=ease((time-.3)/3.4),width=233*Math.cos(open*Math.PI*.46),inset=60*Math.sin(open*Math.PI*.46);
  for(const s of [-1,1]){
    const hinge=720+s*235,inner=hinge-s*width;
    poly(g,[[hinge,245],[inner,245+inset],[inner,650-inset],[hinge,650]],'#181a12','#796132');
    for(let k=1;k<=4;k++){
      const x=mix(hinge,inner,k/5),y=inset*k/5;
      line(g,[[x,267+y],[x,628-y]],1.3,time);
    }
    const handle=mix(hinge,inner,.86);ellipse(g,handle,465,2.5,19,C.gold);
  }
  for(let i=0;i<23;i++){
    const angle=Math.PI+i*Math.PI/22,x=720+Math.cos(angle)*325,y=310+Math.sin(angle)*206;
    const ignition=8+i*.09,brightness=time<8?.36:mix(.25,.9,ease((time-ignition)/.18));
    bulb(g,x,y,brightness,3.1);
  }
  // A short walk settles before a deliberately timed greeting.
  if(time>=3.5){
    const walk=clamp((time-3.5)/2.8),x=mix(590,750,ease(walk));
    const action=ease((time-6.5)/.45)*(1-ease((time-7.55)/.45));
    ellipse(g,x,703,57,9,'#060705',false);
    person(g,x,700,342,Math.floor(time*12)/12,{greenUniform:false,pose:walk<1?'walk':'consider',turn:walk<1?1:0,action,emotion:'calm',expression:1});
  }
  g.restore();
}
function overhead(time){
  const q=clamp((time-12)/4),rotation=.10*(1-ease(q)),r=242;
  const bg=g.createRadialGradient(720,420,60,720,420,600);bg.addColorStop(0,'#273b2c');bg.addColorStop(1,'#07100f');g.fillStyle=bg;g.fillRect(0,0,W,H);
  for(let i=0;i<5;i++){g.beginPath();g.ellipse(720,420,110+i*70,110+i*70,0,0,Math.PI*2);g.strokeStyle=i%2?'#9d7d3b':'#4c4728';g.lineWidth=i%2?1.2:.7;g.stroke();}
  const fans=[];
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6+rotation,x=720+Math.sin(a)*r,y=420-Math.cos(a)*r;
    const opening=mix(.62,1,ease(q*2))*(1-.08*(.5+.5*Math.sin((time-12)*Math.PI*2+i*.12)));
    fans.push({x,y,a,opening});
  }
  for(const layer of ['surfaces','details'])for(const f of fans){g.save();g.translate(f.x,f.y);g.rotate(f.a);fanPair(g,92,f.opening,{fixture:true,layer});g.restore();}
  for(let i=0;i<24;i++){const a=i*Math.PI/12;bulb(g,720+Math.sin(a)*379,420-Math.cos(a)*379,.6,2.2);}
  // Quiet, dark center keeps ivory petals and their pivots readable.
  ellipse(g,720,420,38,38,'#101d18');line(g,[[720,398],[740,420],[720,442],[700,420]],1.6,0,true);
}
function render(){
  const frame=Math.round(state.time*24)/24;
  if(frame<12)hall(frame);else overhead(frame);
  $('#timeline').value=state.time;
  $('#timeline').setAttribute('aria-valuetext',`${state.time.toFixed(1)} / 16 ${state.language==='zh'?'秒':'seconds'}`);
  $('#time').textContent=`${state.time.toFixed(1).padStart(4,'0')} / 16.0`;
  const playLabel=t(state.playing?'pause':'play');
  if($('#play').textContent!==playLabel)$('#play').textContent=playLabel;
  $('#play').setAttribute('aria-pressed',String(state.playing));
  document.querySelectorAll('[data-seek]').forEach((b,i)=>b.setAttribute('aria-current',String(i===Math.min(3,Math.floor(state.time/4)))));
}
function pause(){state.playing=false;cancelAnimationFrame(state.raf);render();}
function tick(now){if(!state.playing)return;state.time=Math.min(DURATION,state.time+(now-state.previous)/1000);state.previous=now;if(state.time>=DURATION)state.playing=false;render();if(state.playing)state.raf=requestAnimationFrame(tick);}
function play(){if(state.playing)return;if(state.time>=DURATION)state.time=0;state.playing=true;state.previous=performance.now();render();state.raf=requestAnimationFrame(tick);}
$('#play').addEventListener('click',()=>state.playing?pause():play());
$('#restart').addEventListener('click',()=>{pause();state.time=0;play();});
$('#timeline').addEventListener('input',event=>{const value=Number(event.target.value);pause();state.time=value;render();});
document.querySelectorAll('[data-seek]').forEach(button=>button.addEventListener('click',()=>{pause();state.time=Number(button.dataset.seek);render();}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&state.playing)pause();},{threshold:0}).observe($('.theatre'));
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)pause();});
function setLanguage(language){
  state.language=language;document.documentElement.lang=language==='zh'?'zh-CN':'en';
  document.title=`${language==='zh'?'Art Deco · 装饰艺术':'Art Deco'} — Codex Film Studio`;
  document.querySelectorAll('[data-i18n]').forEach(node=>{node.innerHTML=t(node.dataset.i18n);});
  document.querySelectorAll('[data-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.aria)));
  document.querySelectorAll('[data-alt]').forEach(node=>node.alt=t(node.dataset.alt));
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  document.querySelectorAll('[data-home]').forEach(link=>{const url=new URL(link.href);url.searchParams.set('lang',language);link.href=url.href;});
  const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);
  try{localStorage.setItem('film-studio-language',language);}catch{/* Language works without storage. */}
  render();
}
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.language)));
let saved;try{saved=localStorage.getItem('film-studio-language');}catch{/* Optional. */}
const requested=new URL(location.href).searchParams.get('lang');
setLanguage(['en','zh'].includes(requested)?requested:saved==='zh'?'zh':'en');
canvas.hidden=false;$('#study-poster').hidden=true;$('#transport').hidden=false;$('#chapters').hidden=false;

// Local alternate editions remain separate from the pinned public film bundle.
fetch(new URL('../../../catalog-availability.json', import.meta.url))
  .then(response => response.ok ? response.json() : null)
  .then(data => { if (data?.mode === 'local' && data.pages?.['art-deco-landscape']) document.getElementById('landscape-films').hidden = false; })
  .catch(() => {});
