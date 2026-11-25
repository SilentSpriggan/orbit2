/* Conversation-scoped approvals. Agent prose can never confirm an action. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrbitAssistantPermissions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create({getScope,now=()=>Date.now(),expiryMs=120000}){
    let pending=null,grant=null,sequence=0;
    const current=p=>p&&p.scope===getScope()&&now()<p.expires&&p.guard();
    function stage({kind='action',label,execute,guard=()=>true}){
      pending={id:++sequence,scope:getScope(),expires:now()+expiryMs,kind,label,execute,guard};return describe();
    }
    function describe(){if(!current(pending)){pending=null;return null;}return {id:pending.id,kind:pending.kind,label:pending.label,expires_at:new Date(pending.expires).toISOString()};}
    async function confirm(kind,{source}={}){
      if(source!=='user')return {status:'user_confirmation_required',message:'Only an explicit user confirmation can approve this action.'};
      if(!current(pending)){pending=null;return {status:'expired',message:'No current review is waiting. Request the action again.'};}
      if(kind!==pending.kind)return {status:'wrong_review',message:'That confirmation does not match the open review.'};
      const task=pending;pending=null;return await task.execute();
    }
    function grantRecords(){grant={scope:getScope()};}
    function hasRecords(){return Boolean(grant&&grant.scope===getScope());}
    function cancel(){pending=null;}
    function reset(){pending=null;grant=null;sequence++;}
    return {stage,describe,confirm,cancel,reset,grantRecords,hasRecords,revokeRecords(){grant=null;}};
  }
  function pageRecords(records,{offset=0,limit=20}={}){
    if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Use offset >= 0 and limit from 1 to 100.');
    return {total:records.length,offset,limit,records:records.slice(offset,offset+limit),next_offset:offset+limit<records.length?offset+limit:null};
  }
  function isSaveRequest(text){
    if(typeof text!=='string')return false;
    const s=text.toLowerCase().replace(/[’']/g,'').replace(/[.!?]+$/,'').trim().replace(/^(?:please |can you |could you |would you |i want you to |i would like you to )/,'').replace(/^please /,'');
    if(/\b(?:dont|do not|never)\b/.test(s)||/^(?:how|what|why|if|suppose|imagine)\b/.test(s))return false;
    return /^(?:save|submit)\b/.test(s)||/\b(?:and|then) (?:save|submit)(?: (?:it|this|this form|the form|this draft))?$/.test(s);
  }
  return {create,pageRecords,isSaveRequest};
});
