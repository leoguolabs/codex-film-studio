import {Score, Camera, BoardRenderer, createLettering, line, poly, rect, circle, curve,
  arrow, check, magnet, marker, clamp, smooth, mix, beginDrawing, INK, BLUE, ORANGE} from './board.mjs'
import {learnerAtDesk,thinkingLearner,turkishFlag} from './illustrations.mjs'

export const FPS=24
const frame=t=>Math.round(t*FPS)/FPS

export function captionsFor(lines,alignments=[]){
  const cues=[]
  for(const row of lines){
    const words=row.text.split(/\s+/)
    const matched=alignments.find(a=>a.id===row.id&&a.audio_sha256===row.audio?.audio_sha256)
    const aligned=matched?.aligned_source_words
    const sentences=[];let sentence=[]
    for(const word of words){
      sentence.push(word)
      if(/[.?;!]$/.test(word)){sentences.push(sentence);sentence=[]}
    }
    if(sentence.length)sentences.push(sentence)
    const chunks=[]
    for(const sentence of sentences){
      const parts=[];let current=[]
      for(const word of sentence){
        if((current.join(' ')+' '+word).trim().length>57&&current.length){parts.push(current);current=[]}
        current.push(word)
      }
      if(current.length)parts.push(current)
      if(parts.length>1){
        const last=parts.at(-1),before=parts.at(-2)
        while(last.join(' ').length<19&&before.length>2)last.unshift(before.pop())
      }
      chunks.push(...parts)
    }
    let offset=0
    for(const chunk of chunks){
      const count=chunk.length
      const start=row.start+(aligned?.[offset]?.start??row.duration*offset/words.length)
      const end=row.start+(aligned?.[offset+count-1]?.end??row.duration*(offset+count)/words.length)+.16
      cues.push({start:frame(start),end:frame(Math.min(row.end+.25,end)),lines:[chunk.join(' ')],
        alignment:aligned?'unprompted-ASR-to-source':'provisional-estimate'})
      offset+=count
    }
  }
  for(let i=0;i<cues.length-1;i++)cues[i].end=Math.min(cues[i].end,cues[i+1].start)
  return cues
}

export function makeTimeline(narration,audio=[],alignments=[],{
  targetDuration=180,minimumRoom=26,leadIn=1.25,tailOut=8.75,extraGaps={},
}={}){
  const eligibleGaps=new Set(narration.slice(0,-1).map(n=>n.id))
  for(const [id,seconds] of Object.entries(extraGaps)){
    if(!eligibleGaps.has(id)||!Number.isFinite(seconds)||seconds<0)
      throw new Error(`Invalid extra narration gap: ${id}`)
  }
  const extraRoom=Object.values(extraGaps).reduce((a,b)=>a+b,0)
  const audioMap=new Map(audio.filter(a=>narration.some(n=>n.id===a.id&&n.text===a.text)).map(a=>[a.id,a]))
  const complete=narration.every(n=>audioMap.has(n.id))
  const durations=narration.map(n=>audioMap.get(n.id)?.duration||n.text.split(/\s+/).length/2.85)
  const totalVoice=durations.reduce((a,b)=>a+b,0)
  const total=Math.max(targetDuration,Math.ceil(totalVoice+
    Math.max(minimumRoom,leadIn+tailOut+extraRoom)))
  const gap=(total-totalVoice-leadIn-tailOut-extraRoom)/Math.max(1,narration.length-1)
  let cursor=leadIn
  const lines=narration.map((n,i)=>{
    const start=frame(cursor),duration=durations[i],end=frame(start+duration)
    cursor=end+gap+(extraGaps[n.id]||0)
    return {...n,start,end,duration,audio:audioMap.get(n.id)||null}
  })
  const durationFrames=Math.ceil((lines.at(-1).end+tailOut)*FPS)
  return {fps:FPS,duration_frames:durationFrames,duration:durationFrames/FPS,complete_audio:complete,
    lines,captions:captionsFor(lines,alignments)}
}

export function createFilm({font,narration,audio,alignments=[],createCanvas}){
  beginDrawing()
  const timeline=makeTimeline(narration,audio,alignments)
  const L=createLettering(font),S=new Score()
  const at=id=>timeline.lines.find(x=>x.id===String(id).padStart(2,'0'))
  const t=(id,f=0)=>at(id).start+at(id).duration*f
  const draw=(id,shapes,start,dur=1,pen='black',label=null)=>S.draw(id,shapes,frame(start),frame(start+dur),{pen,label})
  const text=(id,words,x,y,h,start,dur=1,color=INK,align='left',width)=>
    draw(id,L.text(words,x,y,{h,color,align,width}),start,dur,color===BLUE?'blue':color===ORANGE?'orange':'black',words)
  const penFor=color=>color===BLUE?'blue':color===ORANGE?'orange':'black'
  const iconDoc=(x,y,w=220,h=270,color=INK)=>[
    ...rect(x,y,w,h,{color}),line(x+35,y+65,x+w-30,y+65,{color}),
    line(x+35,y+110,x+w-40,y+110,{color}),line(x+35,y+155,x+w-65,y+155,{color})]
  const laptop=(x,y,w=650,h=400)=>[
    ...rect(x,y,w,h,{width:9}),poly([[x,y+h],[x-70,y+h+70],[x+w+70,y+h+70],[x+w,y+h]],{width:9}),
    line(x+230,y+h+38,x+420,y+h+38,{width:5})]
  const bulb=(x,y,color=ORANGE)=>[
    circle(x,y,78,{color,width:8,start:Math.PI*.75,end:Math.PI*2.25}),
    poly([[x-55,y+55],[x-38,y+117],[x+38,y+117],[x+55,y+55]],{color,width:8}),
    line(x-33,y+133,x+33,y+133,{color,width:8}),line(x-22,y+149,x+22,y+149,{color,width:8}),
    ...[0,1,2,3,4].map(i=>{
      const a=Math.PI*1.1+i*Math.PI*.2
      return line(x+Math.cos(a)*105,y+Math.sin(a)*105,x+Math.cos(a)*133,y+Math.sin(a)*133,{color,width:7})
    })]

  // 1. A physical success magnet; the camera discovers the spreadsheet.
  text('hook-works','it works',1170,1180,78,.9,1.0)
  draw('laptop',laptop(780,1250,720,410),2.0,1.1)
  const grid=[]
  for(let i=1;i<5;i++)grid.push(line(810+i*125,1305,810+i*125,1615,{width:4.5}))
  for(let i=0;i<5;i++)grid.push(line(810,1310+i*65,1470,1310+i*65,{width:4.5}))
  draw('spreadsheet',grid,3.2,1.3)
  text('formula','= lookup(...)',850,1285,41,4.0,1.2,BLUE)
  draw('result-cell',rect(1310,1440,125,65,{color:BLUE,width:7}),4.7,.55,'blue')
  text('without-answer','without the answer?',1570,1470,62,t(1,.64),1.3,ORANGE)
  draw('hook-question',L.text('?',1770,1680,{h:170,color:ORANGE}),t(1,.80),.7,'orange')
  S.cue('magnet-drop',.65,{kind:'magnet'})

  // 2. A genuine handwritten title, placed on the same physical board.
  text('title-top','AI: LEARN',2700,470,360,t(2)-.3,1.7,INK,'left',20)
  text('title-main','OR JUST FINISH?',2700,775,210,t(2)+1.5,2.2,INK,'left',12)
  draw('title-underline',line(2700,850,4680,850,{color:ORANGE,width:10}),t(2)+3.8,.65,'orange')
  text('title-deck','what remains when the help goes away?',2730,960,55,t(2)+3.9,1.2)

  // 3. Four measurements, assembled one by one, read as a spatial sequence.
  const mx=5200,my=1000
  text('four-questions','four different questions',mx+780,my-100,92,t(3)-.1,1.4,INK,'center')
  const boxes=[['with help',BLUE],['alone',ORANGE],['later',ORANGE],['new problem',ORANGE]]
  boxes.forEach(([label,color],i)=>{
    const x=mx+i*470,start=t(3,.15+i*.20)
    draw(`measure-box-${i}`,rect(x,my+40,340,260,{width:8,color}),start,.6,penFor(color))
    if(i===0){
      draw('help-card',[...rect(x+50,my+85,240,120,{color:BLUE}),poly([[x+80,my+205],[x+80,my+240],[x+120,my+205]],{color:BLUE})],start+.55,.6,'blue')
    }else if(i===1){
      draw('alone-pencil',[line(x+105,my+215,x+220,my+95,{color:ORANGE,width:11}),poly([[x+105,my+215],[x+95,my+240],[x+120,my+225]],{color:ORANGE})],start+.55,.5,'orange')
    }else if(i===2){
      draw('calendar',[...rect(x+65,my+90,210,150,{color:ORANGE}),line(x+65,my+125,x+275,my+125,{color:ORANGE}),
        line(x+110,my+65,x+110,my+110,{color:ORANGE}),line(x+230,my+65,x+230,my+110,{color:ORANGE})],start+.55,.6,'orange')
    }else draw('new-puzzle',[poly([[x+70,my+235],[x+70,my+115],[x+145,my+115],[x+145,my+75],[x+215,my+75],[x+215,my+155],[x+275,my+155],[x+275,my+235],[x+70,my+235]],{color:ORANGE,width:9})],start+.55,.6,'orange')
    text(`measure-label-${i}`,label,x+170,my+395,64,start+1.1,.8,color,'center')
    if(i<3)draw(`measure-arrow-${i}`,arrow(x+355,my+170,x+450,my+170,{width:7,head:24}),start+1.2,.4)
  })
  ;['performance','independence','retention','transfer'].forEach((word,i)=>{
    text(`measure-name-${i}`,word,mx+i*470+170,my+550,44,t(4,.06)+i*.55,.5,INK,'center')
  })
  draw('measure-brace',poly([[mx+40,my+610],[mx+40,my+650],[mx+1790,my+650],[mx+1790,my+610]],{color:BLUE,width:7}),t(4,.48),1,'blue')
  text('one-session','one session cannot measure all four',mx+890,my+760,65,t(4,.7),1.5,INK,'center')

  // 4. The controlled study has two scoreboards; percentages are relative changes.
  const sx=570,sy=2350
  text('study-title','one study, two scoreboards',sx+750,sy-240,94,t(5)-.1,1.8,INK,'center')
  text('study-context','nearly 1,000 students / mathematics / Turkey',sx+750,sy-125,48,t(5,.15),1.8,INK,'center')
  const flag=turkishFlag(sx-125,sy-180,{height:120})
  draw('turkey-flag-pole',flag.pole,t(5,.40),.4)
  draw('turkey-flag',flag.field,t(5,.08),2.7,'red')
  text('study-practice-title','practice with AI',sx+325,sy+15,67,t(5,.30),1.0,BLUE,'center')
  text('exam-title','exam without AI',sx+1180,sy+15,67,t(6)-.3,1.0,ORANGE,'center')
  draw('study-division',line(sx+750,sy+80,sx+750,sy+475,{width:5}),t(5,.42),.6)
  const assistedLearner=learnerAtDesk(sx-65,sy+105,{scale:1.05,accent:BLUE})
  draw('assisted-learner',[...assistedLearner.body,...assistedLearner.desk],t(5,.43),2.15)
  draw('assisted-laptop',assistedLearner.task,t(5,.59),1.05,'blue')
  text('practice-gain','+48%',sx+360,sy+330,145,t(5,.64),1.1,BLUE)
  draw('practice-up',arrow(sx+335,sy+410,sx+335,sy+90,{color:BLUE,width:10}),t(5,.81),.7,'blue')
  const examLearner=learnerAtDesk(sx+765,sy+105,{scale:1.05,accent:ORANGE,mode:'paper'})
  draw('independent-learner',[...examLearner.body,...examLearner.desk],t(6,.12),2.15)
  draw('independent-paper',examLearner.task,t(6,.34),.8,'orange')
  text('exam-loss','-17%',sx+1220,sy+330,145,t(6,.35),1.0,ORANGE)
  draw('exam-down',arrow(sx+1160,sy+90,sx+1160,sy+430,{color:ORANGE,width:10}),t(6,.55),.7,'orange')
  text('relative-control','relative to the no-AI control',sx+750,sy+535,48,t(6,.69),1.6,INK,'center')
  draw('tutor-arrow',arrow(sx+220,sy+665,sx+680,sy+665,{color:BLUE,width:8}),t(7,.18),.7,'blue')
  text('tutor-label','guarded tutor',sx+20,sy+625,62,t(7),1.0,BLUE)
  text('penalty-removed','penalty largely removed',sx+760,sy+690,61,t(7,.23),1.2,ORANGE)
  text('not-exam-gain','no significant positive exam gain',sx+750,sy+800,49,t(7,.61),1.7,INK,'center')
  text('study-source','Bastani et al. / PNAS / 2025',sx+750,sy+910,39,t(7,.84),1.1,INK,'center')
  S.cue('turn-silence',t(6)-.45,{kind:'silence',duration:1.2})

  // 5. A counterexample shares the board: structured teaching can work.
  const cx=3020,cy=2190
  text('scope-title','design changes the result',cx+800,cy-180,90,t(8)+.3,1.7,INK,'center')
  text('scope-note','short-term evidence / not permanent damage',cx+800,cy-55,51,t(8,.50),1.8,INK,'center')
  draw('physics-book',[poly([[cx+100,cy+260],[cx+100,cy+95],[cx+390,cy+140],[cx+680,cy+95],[cx+680,cy+410],[cx+390,cy+455],[cx+100,cy+410],[cx+100,cy+260]],{width:9}),
    line(cx+390,cy+140,cx+390,cy+455,{width:7})],t(8,.60),1.1)
  draw('physics-equation',L.text('F = ma',cx+170,cy+250,{h:61,color:BLUE}),t(9)+1.1,.9,'blue')
  draw('physics-light',bulb(cx+1100,cy+215),t(9,.34),1.2,'orange')
  draw('book-to-light',arrow(cx+720,cy+270,cx+930,cy+270,{color:BLUE,width:9}),t(9,.48),.65,'blue')
  const physicsLearner=thinkingLearner(cx+1300,cy+55,{scale:.95,accent:BLUE,facing:'left'})
  draw('physics-learner',physicsLearner.body,t(9,.10),2.1)
  draw('physics-notebook',physicsLearner.notebook,t(9,.62),.6,'blue')
  text('physics-result','better immediate learning',cx+820,cy+565,68,t(9,.65),1.6,ORANGE,'center')
  const words=['questions','feedback','expert material']
  words.forEach((word,i)=>{
    text(`tutor-step-${i}`,word,cx+100+i*580,cy+740,58,t(10,.07+i*.19),.9,BLUE)
    draw(`tutor-check-${i}`,check(cx+55+i*580,cy+708,22,BLUE),t(10,.15+i*.19),.3,'blue')
  })
  text('physics-scope','immediate test does not establish months of retention',cx+800,cy+870,41,t(10,.63),1.8,INK,'center')
  text('physics-source','Kestin et al. / Scientific Reports / 2025',cx+800,cy+960,36,t(10,.84),1.1,INK,'center')

  // 6. Offloading: a removable answer overlays the learner's opportunity to act.
  const ox=5900,oy=2450
  text('offload-title','what thinking remains yours?',ox+800,oy-140,85,t(11),1.7,INK,'center')
  draw('offload-cloud',[...rect(ox+50,oy+60,570,310,{color:BLUE,width:10}),
    poly([[ox+130,oy+370],[ox+130,oy+440],[ox+220,oy+370]],{color:BLUE,width:9})],t(11,.18),1,'blue')
  text('answer-label','the answer',ox+335,oy+205,82,t(11,.29),1.0,BLUE,'center')
  draw('offload-arrow',arrow(ox+710,oy+220,ox+960,oy+220,{width:8}),t(11,.42),.65)
  const choosingLearner=thinkingLearner(ox+1100,oy+45,{scale:1.08,accent:ORANGE})
  draw('choosing-learner',choosingLearner.body,t(11,.49),1.75)
  draw('choosing-notebook',choosingLearner.notebook,t(11,.65),.55,'orange')
  text('offload-choice','choose the method',ox+1230,oy+550,63,t(11,.68),1.2,ORANGE,'center')
  text('recognize','recognize',ox+340,oy+620,82,t(12,.05),.85,BLUE,'center')
  text('produce','produce',ox+1230,oy+700,82,t(12,.34),.85,ORANGE,'center')
  draw('not-equal',[line(ox+725,oy+575,ox+865,oy+575,{width:9}),line(ox+725,oy+625,ox+865,oy+625,{width:9}),
    line(ox+755,oy+665,ox+835,oy+535,{color:ORANGE,width:9})],t(12,.54),.75,'orange')
  S.erasers.push({start:frame(t(12,.71)),end:frame(t(12,.71)+1.25),x:ox+75,y:oy+70,w:530,h:270})
  S.cue('erase-answer',t(12,.71),{kind:'eraser',duration:1.25})

  // 7. Scaffolding fades. A sequence of worked, partial and blank examples.
  const gx=5880,gy=4080
  text('guidance-title','help that changes with you',gx+850,gy-260,84,t(13),1.6,INK,'center')
  for(let i=0;i<3;i++){
    const x=gx+i*580
    draw(`guide-page-${i}`,rect(x+80,gy-120,330,350,{width:8}),t(13,.18+i*.17),.6)
    for(let j=0;j<3-i;j++)draw(`guide-line-${i}-${j}`,line(x+125,gy-40+j*70,x+355,gy-40+j*70,{color:BLUE,width:9}),t(13,.26+i*.17+j*.035),.25,'blue')
    if(i<2)draw(`guide-arrow-${i}`,arrow(x+430,gy+65,x+560,gy+65,{width:8}),t(13,.35+i*.17),.35)
    text(`guide-label-${i}`,['example','hint','your attempt'][i],x+245,gy+360,62,t(13,.50+i*.14),.9,i===2?ORANGE:BLUE,'center')
  }

  // 8. A concrete learning loop, not a list of slogans.
  const px=3040,py=4050
  text('practice-title','try / hide / explain / check',px+850,py-280,85,t(14)-.2,1.9,INK,'center')
  const attemptLearner=learnerAtDesk(px+5,py-100,{scale:1,accent:INK,mode:'paper'})
  draw('attempt-learner',[...attemptLearner.body,...attemptLearner.desk,...attemptLearner.task],t(14,.05),2.2)
  text('attempt-label','first attempt',px+190,py+345,60,t(14,.18),1,INK,'center')
  draw('hint-bubble',[...rect(px+590,py-100,390,230,{color:BLUE,width:9}),
    poly([[px+660,py+130],[px+650,py+180],[px+715,py+130]],{color:BLUE,width:8})],t(14,.4),.8,'blue')
  text('hint-word','one useful hint',px+785,py+15,48,t(14,.56),1,BLUE,'center')
  draw('practice-connect',arrow(px+365,py+60,px+550,py+60,{width:8}),t(14,.68),.5)
  draw('practice-recall',rect(px+1250,py-100,280,320,{color:ORANGE,width:8}),t(15,.05),.85,'orange')
  text('recall-question','?',px+1390,py+110,130,t(15,.17),.55,ORANGE,'center')
  text('recall-label','answer hidden',px+1390,py+345,60,t(15,.25),.95,ORANGE,'center')
  draw('hide-hint',[line(px+600,py-85,px+965,py+115,{color:ORANGE,width:10}),line(px+960,py-85,px+600,py+115,{color:ORANGE,width:10})],t(15,.07),.8,'orange')
  draw('recall-arrow',arrow(px+1015,py+60,px+1200,py+60,{width:8}),t(15,.34),.5)
  text('feedback-label','explain it, then check and correct',px+850,py+520,67,t(15,.48),1.7,INK,'center')
  draw('feedback-check',check(px+1680,py+450,46,ORANGE),t(15,.85),.6,'orange')

  // 9. Changed problem and later test are deliberately distinct.
  const tx=500,ty=4100
  text('transfer-title','change it. return later.',tx+900,ty-260,88,t(16),1.7,INK,'center')
  draw('transfer-one',iconDoc(tx+100,ty-80,290,320),t(16,.10),.8)
  draw('transfer-two',iconDoc(tx+790,ty-80,290,320,ORANGE),t(16,.25),.8,'orange')
  text('problem-a','A',tx+245,ty+180,105,t(16,.16),.55,INK,'center')
  text('problem-b','B',tx+935,ty+180,105,t(16,.35),.55,ORANGE,'center')
  draw('transfer-arrow',arrow(tx+430,ty+80,tx+735,ty+80,{color:ORANGE,width:9}),t(16,.36),.65,'orange')
  draw('later-clock',[circle(tx+1500,ty+70,150,{color:ORANGE,width:9}),
    line(tx+1500,ty+70,tx+1500,ty-28,{color:ORANGE,width:9}),
    line(tx+1500,ty+70,tx+1580,ty+110,{color:ORANGE,width:9})],t(16,.58),1.1,'orange')
  text('transfer-label','transfer',tx+600,ty+360,73,t(16,.46),.85,ORANGE,'center')
  text('retention-label','retention',tx+1500,ty+360,73,t(16,.74),.85,ORANGE,'center')
  text('transfer-alone','fresh problem / no help',tx+800,ty+470,64,t(16,.78),1.1,INK,'center')

  // 10. Camera returns to the opening and then reveals one coherent board.
  text('closing-principle','make the next independent attempt better',2620,1070,65,t(17),2.2,ORANGE)
  text('closing-question','what can you do when the answer is gone?',2580,1235,70,t(18,.18),2.5)
  draw('closing-circle',poly(Array.from({length:121},(_,i)=>{
    const a=-.12+i/120*Math.PI*2.07
    return [3690+1170*Math.cos(a),1220+105*Math.sin(a)]
  }),{color:ORANGE,width:8}),t(18,.54),1.2,'orange')
  S.cue('final-cap',at(18).end+5.2,{kind:'cap'})

  // Connecting lines live on the board and are drawn while the camera travels.
  const links=[
    [1,2,[1900,1120],[2600,800]],[2,3,[4750,780],[5200,940]],
    [4,5,[5200,1740],[2100,2070]],[7,8,[2250,2750],[3000,2400]],
    [10,11,[4800,2900],[5880,2680]],[12,13,[7200,3300],[7200,3740]],
    [13,14,[5810,4100],[4900,4100]],[15,16,[2980,4300],[2370,4300]]
  ]
  for(const [from,to,a,b] of links){
    const start=at(from).end+.2,end=at(to).start+.25
    draw(`connection-${from}`,curve([a,[mix(a[0],b[0],.35),a[1]],[mix(a[0],b[0],.7),b[1]],b],{color:BLUE,width:5}),start,Math.max(.3,end-start),'blue')
  }
  const regions={
    hook:{x:1340,y:1430,z:.95},title:{x:3670,y:700,z:.79},
    measures:{x:6040,y:1320,z:.80},study:{x:1450,y:2700,z:.70},
    counter:{x:3850,y:2590,z:.70},offload:{x:6710,y:2730,z:.91},
    guidance:{x:6720,y:4120,z:.88},practice:{x:3870,y:4150,z:.87},
    transfer:{x:1390,y:4160,z:.87},closing:{x:3700,y:900,z:.65}
  }
  const keys=[{t:0,x:1100,y:1170,z:2.1,roll:-.008},{t:1.6,x:1100,y:1170,z:2.1,roll:-.008},
    {t:5.8,...regions.hook},{t:at(1).end+.3,...regions.hook}]
  const reframes={
    '05':{x:1450,y:2470,z:.86},'06':{x:1450,y:2590,z:.81},'07':{x:1450,y:2700,z:.70},
    '08':{x:3850,y:2300,z:.80},'09':{x:3850,y:2470,z:.83},'10':{x:3850,y:2600,z:.70},
    '12':{x:6710,y:2770,z:.83}
  }
  let priorPose=regions.hook
  for(let i=1;i<timeline.lines.length;i++){
    const row=timeline.lines[i],pose=reframes[row.id]||regions[row.region]
    if(pose!==priorPose){
      keys.push({t:Math.max(at(i).end+.1,row.start-1.15),...priorPose})
      keys.push({t:row.start+.15,...pose})
      priorPose=pose
    }
  }
  keys.push({t:at(18).end-.2,...regions.closing},
    {t:at(18).end+2.5,x:4100,y:2450,z:.187,roll:0},
    {t:timeline.duration,x:4100,y:2450,z:.187,roll:0})
  const camera=new Camera(keys)
  // Props are the only moving board objects; the drawn ink remains fixed.
  const props=(ctx,time)=>{
    if(time>0){
      const lift=430*(1-smooth((time-.10)/.55))
      let x=1100,y=1160-lift
      if(time>at(1).end-.8){const u=smooth((time-(at(1).end-.8))/.8);x=mix(x,1410,u);y=mix(y,1500,u)}
      magnet(ctx,x,y,{r:48,lift})
    }
    if(time>at(18).end+3.8){
      marker(ctx,3250,4950,BLUE,{scale:.6,angle:Math.PI/2})
      marker(ctx,3700,4955,ORANGE,{scale:.6,angle:Math.PI/2})
      marker(ctx,4150,4952,INK,{scale:.6,angle:Math.PI/2})
    }
  }
  S.compile()
  const renderer=new BoardRenderer({createCanvas,score:S,camera,lettering:L,props,captions:timeline.captions})
  return {timeline,score:S,camera,renderer}
}
