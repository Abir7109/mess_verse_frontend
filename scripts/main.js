(function(){
  const root = document.documentElement;
  const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReduced = mediaReduced.matches;
  const ls = window.localStorage;

  // Preferences (motion/contrast/type)
  let userMotion = ls.getItem('mv_motion') ?? 'on'; // 'on' | 'off'
  let userContrast = ls.getItem('mv_contrast') === 'on';
  let userType = ls.getItem('mv_type') ?? 'normal'; // 'normal' | 'large'
  applyPrefs();

  function motionOn(){ return !prefersReduced && userMotion === 'on'; }
  function applyPrefs(){
    root.classList.toggle('contrast-high', !!userContrast);
    root.classList.toggle('type-large', userType === 'large');
  }

  // Controls UI
  const btnCtl = document.getElementById('btnControls');
  const panel = document.getElementById('controlsPanel');
  const tMotion = document.getElementById('toggleMotion');
  const tContrast = document.getElementById('toggleContrast');
  const sType = document.getElementById('selectType');
  if(btnCtl){
    btnCtl.addEventListener('click',()=>{
      const open = panel.hasAttribute('hidden') ? false : true;
      panel.toggleAttribute('hidden');
      btnCtl.setAttribute('aria-expanded', String(!open));
      // sync toggles on open
      tMotion.checked = (userMotion === 'off');
      tContrast.checked = userContrast;
      sType.value = userType;
    });
    tMotion?.addEventListener('change',()=>{
      userMotion = tMotion.checked ? 'off' : 'on';
      ls.setItem('mv_motion', userMotion);
      if(!motionOn()) stopDrifts();
    });
    tContrast?.addEventListener('change',()=>{
      userContrast = tContrast.checked; ls.setItem('mv_contrast', userContrast?'on':'off'); applyPrefs();
    });
    sType?.addEventListener('change',()=>{
      userType = sType.value; ls.setItem('mv_type', userType); applyPrefs();
    });
  }

  // Intersection Observer: add .is-inview for [data-reveal]
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting && e.intersectionRatio>=0.25){ e.target.classList.add('is-inview'); }
    })
  },{threshold:[0,0.25,0.6,1]});
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));

  // Read embedded data
  const dataEl = document.getElementById('members-data');
  const DATA = JSON.parse(dataEl.textContent);
  const members = DATA.members;
  const membersTimeline = members.slice(0,10);

  // Utility: initials and seeded random
  const initials = (name)=> name.split(/\s+/).map(w=>w[0]?.toUpperCase()||'').slice(0,2).join('');
  const hash = (s)=>{ let h=1779033703^s.length; for(let i=0;i<s.length;i++){ h = Math.imul(h^s.charCodeAt(i),3432918353); h = h<<13 | h>>>19; } return (h>>>0); };
  const mulberry32 = (a)=>{ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; } };

  // Build hero mosaic (3-4-3)
  const mosaic = document.getElementById('mosaic');
  const positions = members.map(m => ({...m})).sort((a,b)=>{
    if(a.mosaic?.row !== b.mosaic?.row) return (a.mosaic?.row||0) - (b.mosaic?.row||0);
    return (a.mosaic?.pos||0) - (b.mosaic?.pos||0);
  });
  positions.forEach((m)=>{
    const tile = document.createElement('button');
    tile.className = 'tile'; tile.setAttribute('data-depth', m.mosaic?.row===2?1:0.5);
    tile.style.setProperty('--tilt', `${m.mosaic?.tiltDeg||0}deg`);
    tile.setAttribute('aria-label', `${m.name}`);
    tile.innerHTML = `
      <div class=\"tile__portrait\" role=\"img\" aria-label=\"${m.name}\">${initials(m.name)}</div>
      <span class=\"tile__name\">${m.name}</span>
    `;
    mosaic.appendChild(tile);
  });

  // CTA scroll
  document.getElementById('ctaMeet').addEventListener('click',()=>{
    document.getElementById('members').scrollIntoView({behavior: motionOn()? 'smooth':'auto'});
  });

  // Bands (A-D) with generative accents
  function renderBand(bandId, filter){
    const host = document.getElementById(bandId);
    host.innerHTML='';
    const leading = host.classList.contains('right-leading') ? 'right' : (host.classList.contains('center-leading')?'center':'left');
    members.filter(filter).forEach(m=>{
      const el = document.createElement('div'); el.className='member'; el.tabIndex=0;
      const display = m.i18n?.bn && (m.name==='Mita') ? `${m.name} / ${m.i18n.bn}` : m.name;
      el.innerHTML = `
        <div class=\"portrait\">${initials(m.name)}</div>
        <div>
          <div class=\"name\">${display}</div>
          <div class=\"role\">${m.role||''}</div>
        </div>
        <div class=\"quote\">${m.quote||''}</div>
      `;
      // Accent
      const accent = document.createElement('div');
      accent.className = `accent accent--${m.accent}`;
      const seed = mulberry32(hash(m.id));
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS,'svg'); svg.setAttribute('width','140'); svg.setAttribute('height','90');
      const path = document.createElementNS(svgNS,'path');
      if(m.accent === 'blob'){
        path.setAttribute('d', blobPath(seed, 70, 45, 32, 8));
      }else{ // neon line or icon-style line
        path.setAttribute('d', neonPath(seed, 140, 90));
      }
      svg.appendChild(path); accent.appendChild(svg);
      accent.style.top = leading==='right' ? '8px' : '0px';
      accent.style.left = leading==='right' ? 'unset' : '0px';
      accent.style.right = leading==='right' ? '0px' : 'unset';
      el.prepend(accent);
      host.appendChild(el);
    });
  }
  function blobPath(rand, cx, cy, r, k){
    const pts=[]; for(let i=0;i<k;i++){ const a=i/k*2*Math.PI; const rr=r*(0.8+rand()*0.4); pts.push([cx+Math.cos(a)*rr, cy+Math.sin(a)*rr]); }
    let d=`M ${pts[0][0]} ${pts[0][1]}`; for(let i=1;i<pts.length;i++){ const p=pts[i]; d+=` Q ${(pts[i-1][0]+p[0])/2} ${(pts[i-1][1]+p[1])/2}, ${p[0]} ${p[1]}`; } d+=` Z`; return d;
  }
  function neonPath(rand, w, h){
    const y1 = h*(0.2+rand()*0.6), y2 = h*(0.2+rand()*0.6); const c1=h*(0.2+rand()*0.6), c2=h*(0.2+rand()*0.6);
    return `M 0 ${y1} C ${w*0.33} ${c1}, ${w*0.66} ${c2}, ${w} ${y2}`;
  }
  renderBand('bandA', m=>m.band==='A');
  renderBand('bandB', m=>m.band==='B');
  renderBand('bandC', m=>m.band==='C');
  renderBand('bandD', m=>m.band==='D');

  // Parallax engine (optimized)
  const layers=[...document.querySelectorAll('[data-depth]')];
  function parallax(){
    if(!motionOn()){ layers.forEach(el=>{ el.style.transform = `rotate(var(--tilt,0deg))`; }); return; }
    const vpH=window.innerHeight;
    layers.forEach(el=>{
      const r=el.getBoundingClientRect();
      const p=(r.top + r.height*0.5 - vpH*0.5)/vpH;
      const d=parseFloat(el.dataset.depth||0);
      const max = window.matchMedia('(max-width:640px)').matches ? parseFloat(getComputedStyle(root).getPropertyValue('--parallax-max-mobile')) : parseFloat(getComputedStyle(root).getPropertyValue('--parallax-max'));
      const y = p*d*max;
      el.style.transform = `translate3d(0, ${y}px, 0) rotate(var(--tilt,0deg))`;
    })
  }
  let rafId = null;
  function onScroll(){ if(rafId) cancelAnimationFrame(rafId); rafId = requestAnimationFrame(parallax); }
  window.addEventListener('scroll', onScroll, {passive:true}); parallax();

  // Timeline nodes and draw + keyboard + tooltip
  const path = document.getElementById('timelinePath');
  const nodesGroup = document.getElementById('timelineNodes');
  const tooltip = document.getElementById('timelineTooltip');
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len}`;
  const tlIO=new IntersectionObserver(([e])=>{
    if(e.isIntersecting){ path.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:1200,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'}); tlIO.disconnect(); }
  },{threshold:0.4}); tlIO.observe(path);

  const nodeEls=[]; const N = 10; for(let i=0;i<N;i++){
    const t = i/(N-1); const p = pointAt(t);
    const node = document.createElementNS('http://www.w3.org/2000/svg','circle');
    node.setAttribute('cx', p.x); node.setAttribute('cy', p.y); node.setAttribute('r','6');
    node.setAttribute('tabindex','0'); node.dataset.index = String(i);
    const member = membersTimeline[i]; if(member){ node.setAttribute('role','button'); node.setAttribute('aria-label', `${member.name}`); node.dataset.memberId = member.id; }
    nodesGroup.appendChild(node); nodeEls.push(node);
    node.addEventListener('mouseenter', ()=> showTip(node));
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('focus', ()=> showTip(node));
    node.addEventListener('blur', hideTip);
  }
  function pointAt(t){ const l = len * t; return path.getPointAtLength(l); }
  function showTip(node){
    const id = node.dataset.memberId; const m = members.find(mm=>mm.id===id) || {}; const label = m.name || `Node ${node.dataset.index}`;
    const r = node.getBoundingClientRect(); const hostR = document.getElementById('timeline').getBoundingClientRect();
    tooltip.textContent = label; tooltip.style.left = `${r.left - hostR.left + r.width/2}px`; tooltip.style.top = `${r.top - hostR.top}px`; tooltip.hidden = false;
  }
  function hideTip(){ tooltip.hidden = true; }
  document.getElementById('timeline').addEventListener('keydown',(e)=>{
    const active = document.activeElement; const idx = nodeEls.indexOf(active); if(idx<0) return;
    if(e.key==='ArrowRight'){ e.preventDefault(); const n = nodeEls[Math.min(nodeEls.length-1, idx+1)]; n?.focus(); }
    if(e.key==='ArrowLeft'){ e.preventDefault(); const p = nodeEls[Math.max(0, idx-1)]; p?.focus(); }
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); showTip(active); }
  });

  // Quotes field: show 6, drift, shuffle (pauses with motion off)
  const showIds = DATA.quotesInitialShow; const poolIds = DATA.quotesShufflePool;
  const qField = document.getElementById('quotesField');
  const driftAnims = new Set();
  function renderQuotes(ids){ qField.innerHTML=''; ids.forEach(id=>{
      const m = members.find(mm=>mm.id===id); if(!m) return;
      const card = document.createElement('button'); card.className='quoteCard'; card.tabIndex=0;
      card.innerHTML = `<span class=\"quoteBadge\">${m.name}</span>${m.quote||'…'}`;
      qField.appendChild(card);
      if(motionOn()) drift(card);
    });
  }
  function drift(el){ const amp = 6 + Math.random()*6; const dur = 6000 + Math.random()*4000; const anim = el.animate([
      {transform:'translate(0,0)'}, {transform:`translate(${amp}px, ${-amp}px)`}, {transform:'translate(0,0)'}
    ],{duration:dur,iterations:Infinity,easing:'ease-in-out'}); driftAnims.add(anim); anim.addEventListener?.('finish',()=>driftAnims.delete(anim)); }
  function stopDrifts(){ driftAnims.forEach(a=>a.cancel()); driftAnims.clear(); }
  renderQuotes(showIds);
  document.getElementById('btnShuffle').addEventListener('click',()=>{
    if(!motionOn()){ renderQuotes(poolIds); return; }
    qField.animate([{opacity:1},{opacity:0},{opacity:1}],{duration:480,easing:'ease',fill:'none'});
    setTimeout(()=>renderQuotes(poolIds), 220);
  });

  // Group threads (decorative)
  const gsvg = document.querySelector('.group__threads');
  if(gsvg){ const W=1000,H=220; const center=[W*0.5, H*0.5]; const svgNS='http://www.w3.org/2000/svg';
    members.forEach((m,i)=>{ const rgen = mulberry32(hash(m.id)); const ax = 60 + rgen()* (W-120); const ay = 40 + rgen()* (H-80);
      const path = document.createElementNS(svgNS,'path'); const mx = (ax+center[0])/2 + (rgen()-0.5)*60; const my = (ay+center[1])/2 + (rgen()-0.5)*40;
      path.setAttribute('d', `M ${ax} ${ay} Q ${mx} ${my}, ${center[0]} ${center[1]}`); gsvg.appendChild(path); });
  }

  // PWA (only over http/https)
  if('serviceWorker' in navigator && /^https?:/.test(location.protocol)){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
})();
