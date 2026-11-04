import {Score, Camera, BoardRenderer, createLettering, line, poly, rect, circle, curve,
  arrow, check, marker, beginDrawing, INK, BLUE, ORANGE} from './board.mjs'
import {learnerAtDesk,thinkingLearner,turkishFlag} from './illustrations.mjs'
import {compileSequence} from './choreography.mjs'
import {makeTimeline,FPS} from './film.mjs'
export {FPS}

const frame=t=>Math.round(t*FPS)/FPS

// One persistent board. The middle row reads right-to-left, following the camera.
export const regions=[
  ['hook',600,400],['measures',3400,400],['turkey',6200,400],['physics',9000,400],
  ['delay',9000,2150],['offload',6200,2150],['guidance',3400,2150],['retrieval',600,2150],
  ['example',600,3900],['transfer',3400,3900],['labels',6200,3900],['closing',9000,3900],
]

export function createFilm({font,narration,audio=[],alignments=[],createCanvas}){
  beginDrawing()
  const timeline=makeTimeline(narration,audio,alignments,{
    targetDuration:720,minimumRoom:42,leadIn:4.75,extraGaps:{'09':6},
  })
  const S=new Score(),L=createLettering(font)
  const handoffs=[]
  const after=(before,following,gap=1.25)=>handoffs.push({before,after:following,gap})
  const row=id=>timeline.lines.find(r=>r.id===String(id).padStart(2,'0'))
  const t=(id,f=0)=>row(id).start+row(id).duration*f
  const pen=c=>c===BLUE?'blue':c===ORANGE?'orange':'black'
  const d=(id,shapes,at,duration=1.5,color=INK)=>
    S.draw(id,shapes,frame(at),frame(at+duration),{pen:pen(color)})
  const tx=(id,words,x,y,h,at,duration=1.5,color=INK,align='left')=>
    S.draw(id,L.text(words,x,y,{h,color,align}),frame(at),frame(at+duration),
      {pen:pen(color),label:words})
  const rmap=Object.fromEntries(regions.map(([id,x,y])=>[id,{x,y}]))
  const text=(id,words,region,dx,dy,at,{h=62,color=INK,duration=1.6,align='left'}={})=>{
    const p=rmap[region];tx(id,words,p.x+dx,p.y+dy,h,at,duration,color,align)
  }
  const heading=(region,words,id)=>text(`${region}-heading`,words,region,900,80,t(id),{h:86,align:'center',duration:2})
  const doc=(x,y,w=240,h=300,color=INK)=>[
    ...rect(x,y,w,h,{color,width:7}),
    ...[.24,.42,.60].map((q,i)=>line(x+28,y+h*q,x+w-28-i*14,y+h*q,{color,width:6}))]
  const book=(x,y,w=460,h=300)=>[
    poly([[x,y],[x+w/2,y+38],[x+w,y],[x+w,y+h],[x+w/2,y+h+38],[x,y+h],[x,y]],{width:8}),
    line(x+w/2,y+38,x+w/2,y+h+38,{width:6})]
  const laptop=(x,y,w=520,h=300)=>[
    ...rect(x,y,w,h,{width:8}),
    poly([[x,y+h],[x-45,y+h+52],[x+w+45,y+h+52],[x+w,y+h]],{width:8}),
    line(x+w*.38,y+h+30,x+w*.62,y+h+30,{width:5})]
  const desk=(id,region,dx,dy,at,mode='laptop',accent=BLUE,scale=1,pace=1)=>{
    const p=rmap[region],x=p.x+dx,y=p.y+dy
    const a=learnerAtDesk(x,y,{scale,mode:mode==='spreadsheet'?'laptop':mode,accent})
    if(mode==='spreadsheet'){
      const point=([px,py])=>[x+px*scale,y+py*scale]
      const gridStyle={color:accent,width:2.8*scale,wobble:.35*scale}
      const gridLine=(a,b)=>line(...point(a),...point(b),gridStyle)
      a.task=[
        ...a.task.slice(0,2),
        poly([[193,104],[275,104],[284,155],[202,155],[193,104]].map(point),gridStyle),
        ...[1/3,2/3].map(q=>gridLine([193+82*q,104],[202+82*q,155])),
        ...[1/3,2/3].map(q=>gridLine([193+9*q,104+51*q],[275+9*q,104+51*q])),
      ]
    }
    d(`${id}-body`,[...a.body,...a.desk],at,2.6/pace)
    d(`${id}-task`,a.task,at+1.1,1.5/pace,accent)
    after(`${id}-body`,`${id}-task`)
  }
  const thinker=(id,region,dx,dy,at,accent=BLUE,facing='right',scale=1)=>{
    const p=rmap[region],a=thinkingLearner(p.x+dx,p.y+dy,{scale,accent,facing})
    // Let the black marker leave before the colored marker approaches the notebook.
    d(`${id}-body`,a.body,at,2.8);d(`${id}-book`,a.notebook,at+4,.9,accent)
    after(`${id}-body`,`${id}-book`)
  }
  const arr=(id,region,a,b,at,color=INK)=>{
    const p=rmap[region]
    d(id,arrow(p.x+a[0],p.y+a[1],p.x+b[0],p.y+b[1],{color,width:7,head:25}),at,.8,color)
  }
  const underline=(id,region,a,b,at,color=ORANGE)=>{
    const p=rmap[region]
    d(id,line(p.x+a[0],p.y+a[1],p.x+b[0],p.y+b[1],{color,width:7}),at,.8,color)
  }

  // 01: The same worker succeeds with help, then faces an independent attempt.
  text('hook-heading','AI: LEARN OR JUST FINISH?','hook',900,80,.75,
    {h:86,align:'center',duration:2})
  desk('opening-worker','hook',180,235,1.75,'spreadsheet',BLUE,1.35)
  text('deadline','today: it works','hook',160,735,t(1,.55),{color:BLUE,h:76})
  arr('opening-change','hook',[690,470],[990,470],t(2,.08),ORANGE)
  desk('opening-alone','hook',1110,235,t(2,.25),'paper',ORANGE,1.35)
  text('tomorrow','tomorrow: can you rebuild it?','hook',960,735,t(2,.62),{h:51,color:ORANGE})
  text('first-question','what remains when help disappears?','hook',900,950,t(3,.25),{h:68,align:'center',duration:2.4})
  underline('opening-rule','hook',[260,1010],[1540,1010],t(4,.45))

  // 02: Four different assessments, each represented by an object and action.
  heading('measures','four different questions',5)
  const {x:mx,y:my}=rmap.measures
  d('measure-laptop',laptop(mx+130,my+230,430,250),t(5,.10),2)
  text('measure-help','with help','measures',340,650,t(5,.3),{h:70,color:BLUE,align:'center'})
  desk('measure-alone','measures',1040,220,t(5,.58),'paper',ORANGE,1.1)
  text('measure-alone-label','alone','measures',1220,650,t(5,.8),{h:70,color:ORANGE,align:'center'})
  d('later-calendar',[...rect(mx+160,my+820,340,210,{color:ORANGE,width:7}),
    line(mx+160,my+875,mx+500,my+875,{color:ORANGE,width:6}),
    line(mx+225,my+795,mx+225,my+850,{color:ORANGE,width:7}),
    line(mx+435,my+795,mx+435,my+850,{color:ORANGE,width:7})],t(6,.10),1.5,ORANGE)
  text('later-label','later','measures',330,1140,t(6,.27),{h:61,color:ORANGE,align:'center'})
  d('changed-doc',doc(mx+1110,my+825,240,220,ORANGE),t(6,.48),1.6,ORANGE)
  text('changed-label','changed problem','measures',1230,1140,t(6,.72),{h:60,color:ORANGE,align:'center'})
  arr('measure-horizontal','measures',[640,430],[920,430],t(7,.1))
  text('one-test-limits','one test cannot answer all four','measures',900,1320,t(8,.25),{h:57,align:'center',duration:2.3})

  // 03: Keep measured percentages separate from the explicitly invented calculation.
  text('turkey-heading','one study, two scoreboards','turkey',900,80,t(9),
    {h:86,align:'center',duration:1.6})
  const {x:sx,y:sy}=rmap.turkey
  const flag=turkishFlag(sx+20,sy+130,{height:115})
  d('turkey-pole',flag.pole,t(9,.08),.5)
  S.draw('turkey-flag',flag.field,frame(t(9,.10)),frame(t(9,.10)+2.2),{pen:'red'})
  text('turkey-context','nearly 1,000 students / mathematics','turkey',1000,240,t(9,.2),{h:49,align:'center',duration:2})
  desk('turkey-assisted','turkey',90,360,t(9,.48),'laptop',BLUE,.95,1.3)
  desk('turkey-unaided','turkey',1030,360,t(9,.76),'paper',ORANGE,.95,1.3)
  text('turkey-practice','practice: +48%','turkey',420,560,t(10,.10),{h:76,color:BLUE,duration:1.8})
  text('turkey-exam','exam: -17%','turkey',1390,560,t(10,.45),{h:65,color:ORANGE,duration:1.7})
  text('relative','relative to the control group','turkey',900,810,t(10,.72),{h:55,align:'center'})
  text('guarded','guarded tutor: penalty largely removed','turkey',900,940,t(11,.15),{h:55,align:'center',color:BLUE,duration:2.2})
  text('guarded-scope','no significant positive exam gain','turkey',900,1055,t(11,.60),{h:49,align:'center',duration:2.1})
  text('study-scope','short-term exam / not permanent damage','turkey',900,1170,t(12,.36),{h:48,align:'center',duration:2.3})
  text('relative-example','illustration only: 50 x 1.48 = 74','turkey',900,1300,t(13,.2),{h:49,align:'center',color:ORANGE,duration:2.4})
  S.cue('study-reversal',t(10,.40),{kind:'silence',duration:1.7})

  // 04: Teaching design and correctness, with a book, learner and checked feedback.
  heading('physics','design changes the result',14)
  const {x:cx,y:cy}=rmap.physics
  d('physics-book',book(cx+100,cy+245),t(14,.15),1.9)
  text('physics-equation','F = ma','physics',138,410,t(14,.36),{h:45,color:BLUE})
  d('physics-page-notes',[...rect(cx+380,cy+355,75,65,{color:BLUE,width:6}),
    ...arrow(cx+417,cy+460,cx+505,cy+460,{color:BLUE,width:6,head:14})],t(14,.43),1,BLUE)
  thinker('physics-thinker','physics',1230,235,t(14,.5),BLUE,'left',1.25)
  after('physics-page-notes','physics-thinker-body')
  arr('physics-understanding','physics',[650,410],[1120,410],t(15,.08),BLUE)
  text('physics-design','questions / feedback / pacing','physics',900,810,t(15,.32),{h:60,align:'center',color:BLUE,duration:2.3})
  text('physics-result','better immediate test scores','physics',900,960,t(16,.1),{h:63,align:'center',color:ORANGE,duration:2})
  text('physics-not-months','immediate test does not establish months of retention','physics',900,1070,t(16,.52),{h:38,align:'center',duration:2.5})
  text('hints-result','generated help can teach; check it','physics',900,1210,t(17,.35),{h:52,align:'center',duration:2.2})
  text('hints-errors','32% of initial help failed quality checks','physics',900,1320,t(18,.05),{h:49,align:'center',color:ORANGE,duration:2.4})

  // 05: Calendar makes the actual delay explicit. No pooled effect-size ranking.
  heading('delay','come back one week later',19)
  const {x:dx,y:dy}=rmap.delay
  desk('delayed-practice','delay',130,270,t(19,.12),'laptop',BLUE,1.2)
  d('week-calendar',[...rect(dx+750,dy+310,400,340,{color:ORANGE,width:8}),
    line(dx+750,dy+390,dx+1150,dy+390,{color:ORANGE,width:7}),
    ...[820,1080].map(a=>line(dx+a,dy+280,dx+a,dy+350,{color:ORANGE,width:8}))],t(19,.48),1.8,ORANGE)
  text('week-number','7 days','delay',950,555,t(20,.08),{h:86,align:'center',color:ORANGE})
  d('week-test',doc(dx+1400,dy+340,230,290),t(20,.32),1.5)
  arr('week-arrow','delay',[1160,490],[1360,490],t(20,.55))
  text('week-study','6,000+ students / working paper','delay',900,830,t(20,.72),{h:57,align:'center'})
  text('week-result','better error recovery during practice','delay',900,955,t(20,.82),{h:57,align:'center',color:BLUE,duration:2.2})
  text('week-limits','delayed gains: limited and conditional','delay',900,1080,t(21,.25),{h:56,align:'center',color:ORANGE,duration:2.3})
  text('three-labels','population / comparison / test','delay',900,1280,t(22,.36),{h:63,align:'center',duration:2.2})

  // 06: The external answer can disappear while the learner remains.
  heading('offload','what thinking remains yours?',23)
  const {x:ox,y:oy}=rmap.offload
  d('offload-answer-box',[...rect(ox+100,oy+300,650,300,{color:BLUE,width:8}),
    poly([[ox+200,oy+600],[ox+180,oy+680],[ox+300,oy+600]],{color:BLUE,width:8})],t(23,.12),1.6,BLUE)
  text('offload-answer','the answer','offload',425,485,t(23,.36),{h:91,align:'center',color:BLUE})
  thinker('offload-person','offload',1260,260,t(23,.58),ORANGE,'right',1.25)
  arr('offload-choice','offload',[840,470],[1160,470],t(24,.08))
  text('offload-target','name the skill you want to practise','offload',900,880,t(24,.35),{h:64,align:'center',duration:2.2})
  text('meta-feedback','feedback on help-seeking changed behavior','offload',900,1030,t(25,.35),{h:49,align:'center',color:BLUE,duration:2.3})
  text('meta-scope','704 adults / arithmetic / recent preprint','offload',900,1140,t(26,.15),{h:49,align:'center',duration:2.1})
  S.erasers.push({start:frame(t(24,.72)),end:frame(t(24,.72)+1.8),x:ox+125,y:oy+325,w:600,h:245})
  S.cue('offload-erase',t(24,.72),{kind:'eraser',duration:1.8})
  text('meta-question','what can you choose without it?','offload',900,1310,t(26,.68),{h:60,align:'center',color:ORANGE,duration:2})

  // 07: A book first, then a partial worksheet, then an independent learner.
  heading('guidance','help that changes with you',27)
  const {x:gx,y:gy}=rmap.guidance
  d('guidance-book',book(gx+80,gy+300,430,290),t(27,.15),1.8)
  d('guidance-book-steps',[
    line(gx+115,gy+410,gx+255,gy+410,{color:BLUE,width:6}),
    line(gx+125,gy+450,gx+245,gy+450,{color:BLUE,width:6}),
    line(gx+135,gy+490,gx+230,gy+490,{color:BLUE,width:6}),
    ...arrow(gx+390,gy+400,gx+390,gy+495,{color:BLUE,width:6,head:16}),
    check(gx+390,gy+535,35,BLUE)],t(27,.40),1.5,BLUE)
  text('example-label','worked example','guidance',295,775,t(28,.18),{h:62,align:'center',color:BLUE})
  d('guidance-page',doc(gx+780,gy+320,250,290,BLUE),t(29,.12),1.6,BLUE)
  text('partial-label','complete a step','guidance',905,775,t(29,.48),{h:59,align:'center',color:BLUE})
  desk('guidance-learner','guidance',1340,290,t(30,.12),'paper',ORANGE,1)
  text('attempt-label','fresh attempt','guidance',1490,775,t(30,.50),{h:57,align:'center',color:ORANGE})
  arr('guidance-link-1','guidance',[570,475],[700,475],t(31,.10),BLUE)
  arr('guidance-link-2','guidance',[1110,475],[1260,475],t(31,.24),ORANGE)
  text('guidance-gap','find the specific gap','guidance',900,1010,t(30,.70),{h:76,align:'center',duration:2})
  text('guidance-scope','a practical synthesis / no universal schedule','guidance',900,1250,t(31,.64),{h:48,align:'center',duration:2.2})

  // 08: Cover, attempt, check and correct. The figure makes the retrieval action visible.
  heading('retrieval','hide it. explain it. check it.',32)
  const {x:rx,y:ry}=rmap.retrieval
  d('retrieval-solution',doc(rx+130,ry+300,320,350,BLUE),t(32,.10),1.6,BLUE)
  underline('retrieval-hide','retrieval',[130,300],[450,650],t(32,.35))
  underline('retrieval-hide-2','retrieval',[130,650],[450,300],t(32,.45))
  desk('retrieval-person','retrieval',740,320,t(32,.55),'paper',INK,1)
  d('retrieval-checked-page',doc(rx+1330,ry+300,300,350,ORANGE),t(33,.15),1.6,ORANGE)
  d('retrieval-check',check(rx+1480,ry+700,50,ORANGE),t(34,.08),.7,ORANGE)
  arr('retrieval-link-1','retrieval',[490,480],[670,480],t(33,.56))
  arr('retrieval-link-2','retrieval',[1110,480],[1270,480],t(34,.30))
  text('retrieval-feedback','corrective feedback matters','retrieval',900,965,t(34,.5),{h:72,align:'center',color:ORANGE,duration:2.1})
  text('retrieval-mistake','record the operation you missed','retrieval',900,1160,t(35,.25),{h:64,align:'center',duration:2.1})
  text('retrieval-review','44-study review / comparator matters','retrieval',900,1300,t(35,.63),{h:49,align:'center',duration:2})

  // 09: Exact mathematics, with a deliberately wrong expansion explicitly crossed.
  heading('example','one small worked example',36)
  text('example-equation','2(x + 3) = 14','example',700,300,t(36,.25),{h:125,align:'center',duration:2.2})
  desk('example-person','example',1350,220,t(36,.60),'paper',ORANGE,1)
  text('example-step-1','x + 3 = 7','example',700,530,t(37,.20),{h:100,align:'center',color:BLUE})
  text('example-step-2','x = 4','example',700,730,t(37,.52),{h:112,align:'center',color:ORANGE})
  text('example-check','check: 2(4 + 3) = 14','example',700,930,t(37,.78),{h:64,align:'center'})
  text('hint-question','which operation removes the factor?','example',900,1080,t(38,.40),{h:54,align:'center',color:BLUE,duration:2.2})
  text('wrong-expansion','2x + 3','example',260,1250,t(39,.04),{h:71,color:ORANGE})
  underline('wrong-cross','example',[240,1180],[580,1280],t(39,.34),ORANGE)
  arr('fix-expansion','example',[640,1230],[800,1230],t(39,.46))
  text('right-expansion','2x + 6','example',880,1250,t(39,.58),{h:71,color:BLUE})
  text('example-why','multiply BOTH terms','example',1370,1270,t(39,.74),{h:41,align:'center'})
  S.erasers.push({start:frame(t(40,.12)),end:frame(t(40,.12)+5.2),x:rmap.example.x+300,y:rmap.example.y+380,w:800,h:620,rows:8})
  S.cue('example-hide',t(40,.12),{kind:'eraser',duration:5.2})

  // 10: Near transfer and a delayed fresh attempt have different labels.
  heading('transfer','change it. return later.',41)
  text('transfer-equation','3(y - 2) = 15','transfer',900,290,t(41,.10),{h:120,align:'center',duration:2})
  text('transfer-step','y - 2 = 5','transfer',900,490,t(41,.40),{h:95,align:'center',color:BLUE})
  text('transfer-answer','y = 7','transfer',900,680,t(41,.62),{h:106,align:'center',color:ORANGE,duration:1.2})
  text('near-transfer','near transfer / not every equation','transfer',900,855,t(42,.28),{h:54,align:'center',duration:2.2})
  text('delay-new','later: 4(z + 1) = 20','transfer',900,1050,t(43,.30),{h:80,align:'center',duration:2})
  text('delay-answer','z = 4; check: 4 x 5 = 20','transfer',900,1240,t(44,.20),{h:70,align:'center',color:ORANGE,duration:2.2})

  // 11: Different help styles remain choices, not an invented league table.
  heading('labels','a label is not a learning test',45)
  const {x:lx,y:ly}=rmap.labels
  thinker('labels-thinker','labels',130,280,t(45,.12),BLUE,'right',1.35)
  const menu=[['answer',BLUE],['hint',BLUE],['question',ORANGE]]
  menu.forEach(([word,color],i)=>{
    d(`help-choice-${i}`,rect(lx+690,ly+240+i*210,880,150,{color,width:7}),t(45,.25+i*.20),.7,color)
    text(`help-word-${i}`,word,'labels',1130,345+i*210,t(45,.31+i*.20),{h:75,align:'center',color})
  })
  text('small-study','50 participants / immediate test','labels',900,1010,t(46,.32),{h:60,align:'center',duration:2})
  text('ask-specific','show the attempt; name the stuck step','labels',900,1150,t(47,.30),{h:57,align:'center',color:BLUE,duration:2.2})
  text('check-hint','check the feedback before rehearsing it','labels',900,1300,t(48,.40),{h:54,align:'center',color:ORANGE,duration:2.2})

  // 12: A notebook and a final learner connect back to the opening worker.
  heading('closing','make the next attempt better',49)
  const {x:fx,y:fy}=rmap.closing
  d('learning-log',rect(fx+100,fy+260,1580,440,{width:7}),t(49,.10),1.2)
  for(let i=1;i<3;i++)d(`log-column-${i}`,line(fx+100+i*526,fy+260,fx+100+i*526,fy+700,{width:5}),t(49,.24+i*.08),.5)
  ;['attempt','help used','alone afterward'].forEach((word,i)=>text(`log-heading-${i}`,word,'closing',360+i*526,370,t(49,.30+i*.13),{h:53,align:'center',color:i===1?BLUE:ORANGE}))
  ;['first try','one hint','solved + checked'].forEach((word,i)=>text(`log-entry-${i}`,word,'closing',360+i*526,555,t(49,.48+i*.12),{h:47,align:'center',color:i===1?BLUE:INK}))
  text('log-scope','a personal check / not a controlled experiment','closing',900,790,t(49,.75),{h:43,align:'center',duration:2})
  desk('closing-learner','closing',120,900,t(50,.15),'paper',ORANGE,.85)
  text('closing-method','attempt / explain / correct','closing',1110,980,t(50,.40),{h:63,align:'center',duration:2})
  text('closing-return','change the problem; return later','closing',1110,1095,t(51,.28),{h:52,align:'center',duration:2})
  text('closing-question','what can you do when the answer is gone?','closing',900,1340,t(52,.30),{h:53,align:'center',duration:2.5})
  const ellipse=Array.from({length:65},(_,i)=>[fx+900+870*Math.cos(i/64*Math.PI*2),fy+1320+90*Math.sin(i/64*Math.PI*2)])
  d('closing-ellipse',poly(ellipse,{color:ORANGE,width:7}),t(52,.70),1.6,ORANGE)

  // Local handoffs identified by frame review and conservative motion triage.
  after('measure-laptop','measure-help')
  after('measure-alone-body','measure-alone-label')
  after('turkey-pole','turkey-flag')
  after('turkey-flag','turkey-context')
  after('turkey-assisted-task','turkey-unaided-body')
  after('turkey-assisted-task','turkey-practice')
  after('turkey-unaided-task','turkey-practice')
  after('turkey-unaided-task','turkey-exam')
  after('turkey-practice','turkey-exam')
  after('turkey-exam','relative')
  after('relative','guarded')
  after('guarded','guarded-scope')
  after('physics-book','physics-equation')
  after('delayed-practice-task','week-calendar')
  after('week-study','week-result')
  after('guidance-book','guidance-book-steps')
  after('attempt-label','guidance-gap')
  after('retrieval-heading','retrieval-solution')
  after('retrieval-solution','retrieval-hide')
  after('retrieval-hide-2','retrieval-person-body')
  after('retrieval-person-task','retrieval-checked-page')
  after('wrong-cross','fix-expansion')
  after('fix-expansion','right-expansion')
  after('right-expansion','example-why')
  after('transfer-step','transfer-answer')
  after('help-word-1','help-choice-2')
  after('closing-learner-task','closing-return')
  const logOrder=['log-column-2','log-heading-0','log-heading-1','log-heading-2',
    'log-entry-0','log-entry-1','log-entry-2']
  logOrder.slice(1).forEach((id,i)=>after(logOrder[i],id))

  // Leave a quiet route between chapters so the final board reads as an argument.
  regions.slice(1).forEach(([region,x,y],index)=>{
    const [,px,py]=regions[index]
    const first=timeline.lines.find(r=>r.region===region)
    const a=y===py?[px+(x>px?1970:-170),py+650]:[px+900,py+1490]
    const b=y===py?[x+(x>px?-170:1970),y+650]:[x+900,y-120]
    d(`chapter-link-${region}`,arrow(...a,...b,{color:INK,width:5,head:24}),
      first.start-.7,.65)
  })

  const keys=[]
  const visibleBottoms={
    hook:[760,760,1000,1050],measures:[700,1200,1200,1380],
    turkey:[710,870,1110,1230,1360],physics:[760,865,1125,1260,1370],
    delay:[740,1010,1140,1340],offload:[780,940,1090,1370],
    guidance:[680,840,840,1070,1310],retrieval:[750,750,1030,1360],
    example:[620,990,1140,1330,1330],transfer:[740,915,1110,1310],
    labels:[840,1070,1210,1360],closing:[850,1210,1210,1430],
  }
  let priorPose=null
  for(const [region,x,y] of regions){
    const rows=timeline.lines.filter(r=>r.region===region)
    for(const [index,r] of rows.entries()){
      const bottom=visibleBottoms[region][index]
      const pose={x:x+900,y:y+bottom/2+30,z:Math.min(.95,840/(bottom+160)),roll:0}
      if(!priorPose)keys.push({t:0,...pose})
      else if(pose.y!==priorPose.y||pose.x!==priorPose.x){
        keys.push({t:r.start-.9,...priorPose},{t:r.start+.05,...pose})
      }
      keys.push({t:r.end-.2,...pose})
      priorPose=pose
    }
  }
  const last=timeline.lines.at(-1)
  keys.push({t:last.end+3.0,x:5900,y:2850,z:.145,roll:0},
    {t:timeline.duration,x:5900,y:2850,z:.145,roll:0})
  S.cue('closing-cap',last.end+4,{kind:'cap'})
  compileSequence(S,handoffs)
  const camera=new Camera(keys)
  const props=(ctx,time)=>{
    if(time>last.end+3.8){
      for(const [i,color] of [BLUE,ORANGE,INK].entries())
        marker(ctx,4650+i*450,5750,color,{scale:.6,angle:Math.PI/2})
    }
  }
  return {timeline,score:S,camera,renderer:new BoardRenderer({
    createCanvas,score:S,camera,lettering:L,props,captions:timeline.captions,
    boardWidth:11800,boardHeight:5700})}
}
