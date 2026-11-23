// A production adapter returns the distances or clearances measured by its
// real pose evaluation, in named units, at each rendered frame time.
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const [adapter,output]=process.argv.slice(2);
if(!adapter)throw new Error('Usage: node scripts/check_contacts.mjs ADAPTER.mjs [REPORT.json]');
const {createReview}=await import(pathToFileURL(path.resolve(adapter)).href);
const {frames,fps,sample}=await createReview();
if(!Number.isInteger(frames)||frames<1||!Number.isFinite(fps)||fps<=0)throw new Error('Invalid film clock');
const measures=new Map(),failures=[];
let covered=0,totalFailures=0;
for(let i=0;i<frames;i++){
  const rows=await sample(i,i/fps);
  if(!Array.isArray(rows))throw new Error('A sample must return an array');
  if(rows.length)covered++;
  for(const {id,unit,value,min=-Infinity,max=Infinity} of rows){
    if(!id||!unit||typeof min!=='number'||typeof max!=='number'||Number.isNaN(min)||Number.isNaN(max)||min>max ||
      (min===-Infinity&&max===Infinity))throw new Error('Missing contact name, unit or bounds');
    let entry=measures.get(id);
    if(!entry){entry={unit,min:null,max:null,samples:0,violations:0};measures.set(id,entry);}
    if(entry.unit!==unit)throw new Error('Inconsistent units for '+id);
    entry.samples++;
    if(Number.isFinite(value)){
      if(entry.min===null||value<entry.min)entry.min=value;
      if(entry.max===null||value>entry.max)entry.max=value;
    }
    if(!Number.isFinite(value)||value<min||value>max){
      entry.violations++;totalFailures++;
      if(failures.length<80)failures.push({frame:i,seconds:i/fps,id,unit,value,min,max});
    }
  }
}
if(!measures.size)throw new Error('No physical relationship was measured in this film');
const report={frames,fps,framesWithChecks:covered,totalFailures,ranges:Object.fromEntries(measures),failures};
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(frames+' frames visited; '+covered+' with physical checks; '+totalFailures+' violations');
if(totalFailures)process.exitCode=1;
