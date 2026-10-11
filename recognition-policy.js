/** CLIP softmax scores are relative similarities to the CURRENT label set, NOT calibrated probabilities. */
export function rankSuggestion(results, labels, {automatic=false}={}){
 const byLabel=new Map((results||[]).map(r=>[r.label,Number(r.score)||0]));
 const scored=(labels||[]).map(s=>({sign:s,score:byLabel.get(s.prompt)||0})).sort((a,b)=>b.score-a.score);
 const top=scored[0],runner=scored[1];
 const background=Math.max(0,...(results||[]).filter(r=>!labels.some(s=>s.prompt===r.label)).map(r=>Number(r.score)||0));
 if(!top?.sign)return {suggestion:null,reason:'no-sign'};
 const margin=top.score-Math.max(runner?.score||0,background);
 // Automatic logging requires substantially stronger evidence than manual Analyze Now.
 const minScore=automatic ? 0.17 : 0.11, minMargin=automatic ? 0.045 : 0.018;
 if(top.score<minScore)return {suggestion:null,reason:'weak-score',topScore:top.score,margin};
 if(margin<minMargin)return {suggestion:null,reason:background>=(runner?.score||0)?'background':'ambiguous',topScore:top.score,margin};
 return {suggestion:{sign:top.sign,score:top.score,margin},reason:'accepted',topScore:top.score,margin};
}
/** Two RECENT agreeing checks, with a bounded time gap. Do not combine old sightings. */
export function stableAgreement(votes,now=Date.now()){
 const recent=(votes||[]).filter(v=>now-v.at<=18000).slice(-4);
 if(recent.length<2)return null;
 const last=recent[recent.length-1],before=recent[recent.length-2];
 if(last.id!==before.id||last.at-before.at>16000||last.at<before.at)return null;
 if(Math.min(last.score,before.score)<.17)return null;
 return {id:last.id,score:(last.score+before.score)/2,votes:2,lastAt:last.at};
}
export function verificationSummary(records){
 const reviewed=(records||[]).filter(r=>r.status==='reviewed'&&r.aiSuggestedId);
 const accepted=reviewed.filter(r=>r.id===r.aiSuggestedId).length;
 return {reviewed:reviewed.length,accepted,corrected:reviewed.length-accepted,agreement:reviewed.length?accepted/reviewed.length:null};
}
