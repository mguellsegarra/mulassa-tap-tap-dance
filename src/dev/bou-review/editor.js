import {storageKey,validBounds,scriptText,source} from './phrases.js';
export function createEditor(phrases,audioName,onBounds) {
  const el=id=>document.getElementById(id),status=el('status');let selected=0;
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(Array.isArray(saved))for(const p of phrases){const s=saved.find(s=>s.id===p.id);
      if(s&&validBounds(s.sourceStart,s.sourceEnd)){p.sourceStart=s.sourceStart;p.sourceEnd=s.sourceEnd;}
      if(typeof s?.observed==='string')p.observed=s.observed;
      if(typeof s?.wanted==='string')p.wanted=s.wanted;
    }
  }catch{status.textContent="No s'han pogut recuperar les notes. Pots copiar el guió per conservar-lo.";}
  function refresh(){el('export').value=scriptText(phrases,audioName);}
  function save(){refresh();try{localStorage.setItem(storageKey,JSON.stringify(phrases));status.textContent='Desat en aquest navegador. Copia el guió quan vulguis.';}catch{status.textContent="No s'ha pogut desar. Copia el guió abans de sortir.";}}
  function select(index){selected=index;const p=phrases[index];el('observed').value=p.observed;el('wanted').value=p.wanted;el('source-start').value=p.sourceStart;el('source-end').value=p.sourceEnd;el('source-start').setCustomValidity('');el('source-end').setCustomValidity('');el('model-description').textContent=p.model;refresh();}
  for(const id of ['observed','wanted'])el(id).addEventListener('input',()=>{phrases[selected][id]=el(id).value;save();});
  for(const id of ['source-start','source-end'])el(id).addEventListener('change',()=>{
    const start=el('source-start').valueAsNumber,end=el('source-end').valueAsNumber;
    if(!validBounds(start,end)){el(id).setCustomValidity(`Cal un interval entre 0 i ${source.previewDuration} s, amb el final després de l'inici.`);el(id).reportValidity();return;}
    el('source-start').setCustomValidity('');el('source-end').setCustomValidity('');
    Object.assign(phrases[selected],{sourceStart:start,sourceEnd:end});save();onBounds();
  });
  el('copy').addEventListener('click',async()=>{refresh();try{await navigator.clipboard.writeText(el('export').value);status.textContent='Guió copiat. Ja me’l pots enganxar al xat.';}catch{el('export').focus();el('export').select();status.textContent='Text seleccionat. Copia’l amb el menú del navegador.';}});
  el('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([scriptText(phrases,audioName)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ball-bou-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  return {select};
}
