// ===== Shadowvale: multiplayer / auth / cloud save (Firebase, ES module) =====
// Exposes window.NET. Game code (classic scripts) only talks to window.NET and
// must work when NET.configured === false (offline mode).
const FB_VER = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${FB_VER}`;
const NET = window.NET = {
  configured:false, ready:false, online:false, user:null, error:null,
  players:{}, chat:[], boss:null,
  // stubs (offline)
  signInEmail:async()=>{throw new Error('offline');}, signUpEmail:async()=>{throw new Error('offline');}, signInGoogle:async()=>{throw new Error('offline');},
  signOut:async()=>{}, loadSave:async()=>null, writeSave:()=>{}, updatePresence:()=>{}, sendChat:()=>{}, bossDamage:()=>{}, resetBoss:()=>{},
};
const cfg = window.FIREBASE_CONFIG;
NET.configured = !!(cfg && cfg.apiKey && !/^YOUR_/.test(cfg.apiKey) && cfg.databaseURL && !/YOUR_/.test(cfg.databaseURL));
const ERRORS = {
  'auth/invalid-email':'That email address looks invalid.',
  'auth/missing-password':'Please enter a password.',
  'auth/user-not-found':'No account with that email. Try "Create account".',
  'auth/wrong-password':'Wrong password.',
  'auth/invalid-credential':'Email or password is incorrect.',
  'auth/invalid-login-credentials':'Email or password is incorrect.',
  'auth/email-already-in-use':'An account with that email already exists. Sign in instead.',
  'auth/weak-password':'Password must be at least 6 characters.',
  'auth/popup-closed-by-user':'Google sign-in was cancelled.',
  'auth/popup-blocked':'Your browser blocked the Google popup. Allow popups and retry.',
  'auth/unauthorized-domain':'This domain is not authorised in Firebase (Auth → Settings → Authorized domains).',
  'auth/operation-not-allowed':'This sign-in method is not enabled in the Firebase console.',
  'auth/network-request-failed':'Network error — check your connection.',
  'auth/too-many-requests':'Too many attempts. Wait a moment and try again.',
};
NET.errorText = e => ERRORS[e && e.code] || (e && e.code && e.code.startsWith('auth/api-key-not-valid') ? 'The Firebase config is invalid — check apiKey in js/firebase-config.js.' : null) || (e && e.message) || String(e);
const notify = () => window.onNetChange && window.onNetChange();

async function boot(){
  if(!NET.configured){ NET.ready=true; notify(); return; }
  try{
    const [{initializeApp},A,D] = await Promise.all([import(`${CDN}/firebase-app.js`),import(`${CDN}/firebase-auth.js`),import(`${CDN}/firebase-database.js`)]);
    const app=initializeApp(cfg), auth=A.getAuth(app), db=D.getDatabase(app);
    const {ref,set,get,push,onValue,onChildAdded,onDisconnect,serverTimestamp,query,orderByChild,limitToLast,remove,runTransaction}=D;
    let presRef=null, lastPres=null, lastSent=0, pending=null, timer=null, unsubs=[], saveTimer=null;

    NET.signInEmail = (email,pw)=>A.signInWithEmailAndPassword(auth,email,pw);
    NET.signUpEmail = async(email,pw,name)=>{ NET._pendingName=(name||'').trim().slice(0,20); const c=await A.createUserWithEmailAndPassword(auth,email,pw); await A.updateProfile(c.user,{displayName:(name||'').trim().slice(0,20)||email.split('@')[0]}); setUser(c.user); return c; };
    NET.signInGoogle = ()=>A.signInWithPopup(auth,new A.GoogleAuthProvider());
    NET.signOut = async()=>{ try{ if(presRef) await remove(presRef); }catch(e){} await A.signOut(auth); };
    NET.loadSave = async()=>{ if(!NET.user) return null; const s=await get(ref(db,`users/${NET.user.uid}/save`)); return s.exists()?s.val():null; };
    NET.writeSave = json=>{ if(!NET.user) return; clearTimeout(saveTimer); saveTimer=setTimeout(()=>set(ref(db,`users/${NET.user.uid}/save`),json).catch(e=>console.warn('cloud save failed',e.code||e)),800); };
    // presence, throttled to ~8/s
    const flush=()=>{ timer=null; if(!pending||!presRef) return; lastSent=performance.now(); lastPres=pending; pending=null;
      set(presRef,{...lastPres,ts:serverTimestamp()}).catch(e=>console.warn('presence',e.code||e)); };
    NET.updatePresence = data=>{ if(!presRef) return; pending={...data,name:NET.user.name};
      const wait=125-(performance.now()-lastSent); if(wait<=0) flush(); else if(!timer) timer=setTimeout(flush,wait); };
    NET.sendChat = text=>{ text=String(text).trim().slice(0,200); if(!text||!NET.user) return;
      push(ref(db,'chat'),{uid:NET.user.uid,name:NET.user.name,text,ts:serverTimestamp()}).catch(e=>{ NET.chat.push({name:'System',text:'Chat failed: '+(e.code||e.message),ts:Date.now(),sys:true}); }); };
    // shared world boss HP pool
    NET.bossDamage = n=>{ runTransaction(ref(db,'worldboss'),b=>{ if(!b||b.hp<=0) return b; b.hp=Math.max(0,b.hp-n); b.hits=(b.hits||0)+1; if(b.hp===0){ b.defeatedBy=NET.user.name; b.defeatedAt=Date.now(); } return b; }).catch(e=>console.warn('boss',e.code||e)); };
    NET.resetBoss = max=>{ runTransaction(ref(db,'worldboss'),b=>{ if(b && b.hp>0) return b; return {hp:max,max,hits:0,spawnedAt:Date.now()}; }).catch(e=>console.warn('boss reset',e.code||e)); };

    function setUser(u){ NET.user = u ? {uid:u.uid, name:(u.displayName||NET._pendingName||(u.email||'Tamer').split('@')[0]).slice(0,20), email:u.email} : null; if(u && window.G && G.player && G.mode!=='login') G.player.name=NET.user.name; }
    A.onAuthStateChanged(auth, u=>{
      unsubs.forEach(f=>f()); unsubs=[]; NET.players={}; NET.chat=[]; presRef=null; NET.online=false;
      setUser(u);
      if(u){
        presRef=ref(db,`presence/${u.uid}`);
        unsubs.push(onValue(ref(db,'.info/connected'),s=>{ NET.online=!!s.val(); if(s.val()){ onDisconnect(presRef).remove(); if(lastPres) set(presRef,{...lastPres,ts:serverTimestamp()}); } notify(); }));
        unsubs.push(onValue(ref(db,'presence'),s=>{ const v=s.val()||{}; delete v[u.uid]; NET.players=v; }, e=>console.warn('presence read',e.code)));
        unsubs.push(onChildAdded(query(ref(db,'chat'),orderByChild('ts'),limitToLast(50)),s=>{ NET.chat.push(s.val()); if(NET.chat.length>50) NET.chat.shift(); window.onChatMessage && window.onChatMessage(s.val()); }, e=>console.warn('chat read',e.code)));
        unsubs.push(onValue(ref(db,'worldboss'),s=>{ NET.boss=s.val(); }, e=>console.warn('boss read',e.code)));
      }
      NET.ready=true; notify();
    });
  }catch(e){ console.warn('Firebase failed to load',e); NET.error='Could not load multiplayer services: '+(e.message||e); NET.configured=false; NET.ready=true; notify(); }
}
boot();
