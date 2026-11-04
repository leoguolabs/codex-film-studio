// Compare important ink completions with observed speech words.
// Late flags identify intervals to revise and inspect; this is not acceptance.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createCanvas} from '@napi-rs/canvas'
import {createFilm} from '../src/long-film.mjs'

const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const root=path.join(studio,'editions/long')
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'')
const narration=await read(path.join(root,'content/narration.json'))
const plan=await read(path.join(root,'content/speech-cues.json'))
const audio=existsSync(path.join(root,'media/audio/manifest.json'))?
  await read(path.join(root,'media/audio/manifest.json')):[]
const alignments=existsSync(path.join(root,'media/asr/review.json'))?
  await read(path.join(root,'media/asr/review.json')):[]
const {timeline,score}=createFilm({
  font:await read(path.join(studio,'fonts/ems-tech.json')),
  narration,audio,alignments,createCanvas,
})
const cues=plan.map(cue=>{
  const line=timeline.lines.find(row=>row.id===cue.line)
  const group=score.groups.find(group=>group.id===cue.group)
  if(!line||!group)throw Error(`Unknown speech cue: ${cue.line}/${cue.group}`)
  const words=line.text.split(/\s+/).map(normalize)
  const phrase=cue.phrase.split(/\s+/).map(normalize)
  const offsets=words.flatMap((_,i)=>phrase.every((w,j)=>words[i+j]===w)?[i]:[])
  if(offsets.length!==1)throw Error(`Cue phrase must occur exactly once: ${cue.phrase}`)
  const index=offsets[0],last=index+phrase.length-1
  const asr=alignments.find(r=>r.id===line.id&&r.audio_sha256===line.audio?.audio_sha256)
  const observed=asr&&!asr.normalized_changes.length&&asr.aligned_source_words
  const firstWord=observed?.[index],lastWord=observed?.[last]
  const common={...cue,drawing_start:group.start,drawing_end:group.end}
  if(!firstWord||!lastWord)return {...common,status:'awaiting_verified_word_timing'}
  const phraseStart=line.start+firstWord.start,phraseEnd=line.start+lastWord.end
  const lag=group.end-phraseEnd
  return {...common,status:lag>cue.max_lag?'late_candidate':'within_late_bound',
    audio_sha256:line.audio.audio_sha256,
    phrase_start:phraseStart,phrase_end:phraseEnd,completion_lag:lag,
    asr_model:asr.model}
})
const report={
  scope:'Ink completion relative to selected source phrases timed by matching unprompted ASR. Late candidates need review. Early reveals, composition, visibility, pronunciation, and subjective synchronization are not assessed.',
  complete_audio:timeline.complete_audio,
  timeline_sha256:sha(JSON.stringify(timeline)),
  composition_sha256:sha(await readFile(path.join(studio,'src/long-film.mjs'))),
  cue_plan_sha256:sha(JSON.stringify(plan)),
  cues,
}
await mkdir(path.join(root,'review'),{recursive:true})
await writeFile(path.join(root,'review/speech-cue-alignment.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({
  observed:cues.filter(c=>c.audio_sha256).length,
  pending:cues.filter(c=>!c.audio_sha256).length,
  late:cues.filter(c=>c.status==='late_candidate').map(c=>({group:c.group,seconds:c.completion_lag})),
}))
