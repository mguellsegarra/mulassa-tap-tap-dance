import assert from 'node:assert/strict';
import {makePhrases,sourceTime,sourceRate,validBounds,scriptText,duration} from '../src/dev/bou-review/phrases.js';
const phrases=makePhrases();
assert.equal(phrases[0].start,0);assert.equal(phrases.at(-1).end,duration);
for(let i=0;i<phrases.length;i++){
 const p=phrases[i];assert.ok(p.observed.length>20);assert.ok(p.wanted.length>20);assert.ok(p.alignmentNote);assert.equal(p.draftRevision,2);assert.ok(p.end>p.start);assert.ok(validBounds(p.sourceStart,p.sourceEnd));
 if(i)assert.equal(p.start,phrases[i-1].end);
 assert.equal(sourceTime(p,p.start),p.sourceStart);assert.equal(sourceTime(p,p.end),p.sourceEnd);
 for(const [time,reference] of p.anchors)assert.ok(Math.abs(sourceTime(p,time)-reference)<1e-8);
 for(let t=p.start;t<p.end;t+=.1)assert.ok(sourceRate(p,t)>.125&&sourceRate(p,t)<8);
}
// The removed central return must jump in source time, not compress the omitted dance into one phrase.
const beforeCut=phrases.find(p=>p.id==='bar-47'),afterCut=phrases.find(p=>p.id==='bar-60');
assert.equal(beforeCut.end,afterCut.start);assert.ok(afterCut.sourceStart-beforeCut.sourceEnd>15);
assert.equal(validBounds(NaN,20),false);assert.equal(validBounds(20,19),false);assert.equal(validBounds(20,9999),false);
phrases[4].wanted='Va cap al N; fa 3 tombs.';assert.match(scriptText(phrases,'test.mp3'),/PROPOSTA: Va cap al N; fa 3 tombs\./);
console.log('bou review ok: coverage, source cuts, mapping endpoints and copyable corrections');
