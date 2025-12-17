(function(){
  const $ = (sel, el=document)=> el.querySelector(sel);
  const $$ = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

  const dataEl = document.getElementById('mv-data');
  if(!dataEl) return;

  const DATA = JSON.parse(dataEl.textContent);

  // Backend API (Render) — set `window.MV_API_BASE` in index.html to enable uploads.
  const API_BASE = (window.MV_API_BASE ? String(window.MV_API_BASE) : '').replace(/\/+$/,'');
  const apiUrl = (p)=> API_BASE ? `${API_BASE}${p}` : null;

  // Admin key (used only if backend has MV_API_KEY set)
  const ADMIN_KEY_STORAGE = 'mv_admin_key';
  const getAdminKey = ()=> {
    try{ return sessionStorage.getItem(ADMIN_KEY_STORAGE) || ''; }catch{ return ''; }
  };
  const setAdminKey = (v)=>{
    try{
      if(v) sessionStorage.setItem(ADMIN_KEY_STORAGE, v);
      else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    }catch{}
  };

  const fetchWithAdmin = (url, opts={})=>{
    const o = { ...opts };
    o.headers = new Headers(o.headers || {});
    const key = getAdminKey();
    if(key) o.headers.set('X-MV-KEY', key);
    return fetch(url, o);
  };

  const portraitOverrides = new Map();

  // Reveal on scroll
  const revealIO = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add('is-inview');
        revealIO.unobserve(e.target);
      }
    }
  }, {threshold: 0.18});
  $$('[data-reveal]').forEach(el=>revealIO.observe(el));

  // Nav active section
  const navLinks = $$('.navlinks a[href^="#"]');
  const sectionIds = navLinks.map(a => a.getAttribute('href')?.slice(1)).filter(Boolean);
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  const setActive = (id)=>{
    navLinks.forEach(a => {
      const active = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', active);
      if(active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };

  const sectionIO = new IntersectionObserver((entries)=>{
    // pick most visible
    const visible = entries
      .filter(e=>e.isIntersecting)
      .sort((a,b)=> (b.intersectionRatio||0) - (a.intersectionRatio||0))[0];
    if(visible?.target?.id) setActive(visible.target.id);
  }, {threshold: [0.18,0.32,0.5,0.65]});

  sections.forEach(s=>sectionIO.observe(s));

  // Members
  const membersWrap = $('#membersWrap');
  const membersGrid = $('#membersGrid');
  const membersToggle = $('#membersToggle');

  const memberModal = $('#memberModal');
  const memberModalPanel = $('#memberModalPanel');
  const memberCloseBtn = $('#memberClose');
  const memberImg = $('#memberImg');
  const memberName = $('#memberName');
  const memberTitle = $('#memberTitle');
  const memberBio = $('#memberBio');
  const memberHighlights = $('#memberHighlights');
  const memberTags = $('#memberTags');
  const memberPortraitFile = $('#memberPortraitFile');
  const memberPortraitStatus = $('#memberPortraitStatus');

  // Admin UI
  const adminOpenBtn = $('#adminOpen');
  const adminState = $('#adminState');
  const adminModal = $('#adminModal');
  const adminCloseBtn = $('#adminClose');
  const adminKeyInput = $('#adminKeyInput');
  const adminSaveBtn = $('#adminSave');
  const adminClearBtn = $('#adminClear');
  const adminStatus = $('#adminStatus');

  let lastFocus = null;

  const openOverlay = (overlay)=>{
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusTarget = overlay.querySelector('[data-initial-focus]') || overlay.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
    focusTarget?.focus();
  };

  const closeOverlay = (overlay)=>{
    overlay.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus?.();
    lastFocus = null;
  };

  const trapTab = (overlay, e)=>{
    if(e.key !== 'Tab') return;
    const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', overlay)
      .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    if(focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    }else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  };

  function getPortraitForMember(m){
    return portraitOverrides.get(m.id) || m.portrait;
  }

  function renderMemberCard(m){
    const btn = document.createElement('button');
    btn.className = 'member-card';
    btn.type = 'button';
    btn.dataset.memberId = m.id;
    btn.setAttribute('aria-label', `Open profile: ${m.name}`);

    const tags = (m.identityTags || []).slice(0, 3).map(t=>`<span class="tag ${t.isAccent? 'tag--accent':''}">${escapeHtml(t.label)}</span>`).join('');

    btn.innerHTML = `
      <div class="member-card__img">
        <img data-member-portrait src="${escapeAttr(getPortraitForMember(m))}" alt="Portrait of ${escapeAttr(m.name)}" loading="lazy" />
      </div>
      <div class="member-card__meta">
        <p class="member-card__name">${escapeHtml(m.name)}</p>
        <p class="member-card__title">${escapeHtml(m.title || '')}</p>
        <div class="tags">${tags}</div>
      </div>
    `;

    btn.addEventListener('click', ()=> openMember(m));
    return btn;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TAG_EMOJI_MAP = {
    // roles / vibes
    'creator': ['🧑‍💻','🛠️','✨','📌'],
    'tech': ['💻','🧠','🔧','⚡'],
    'leadership': ['👑','🧭','🦁'],
    'chef': ['👨‍🍳','🍳','🍜','🔥'],
    'warmth': ['🫶','☀️','🥹'],
    'routine': ['🗓️','✅','⏰'],
    'strategy': ['♟️','🧠','🎯'],
    'money': ['💸','💰','📈'],
    'gaming': ['🎮','🕹️','🏆'],
    'plot twist': ['😈','🌀','🎭'],
    'chaos': ['💥','🌪️','😵‍💫'],
    'charm': ['😎','✨','🕶️'],
    'silent': ['🤫','🫥','🌙'],
    'presence': ['🧍','🌿','🫡'],
    'consistency': ['📌','✅','📖'],
    'mita': ['🤝','🫶','🧿'],
    'bond': ['🫂','🔗','💛'],
    'inside-joke': ['🤣','🤭','🗯️'],
    'naughty': ['😜','😈','🔥'],
    'energy': ['⚡','🔥','🚀'],
    'fun': ['🎉','😄','🎈'],
    'innocent': ['😇','🕊️','🌸'],
    'calm': ['🧘','🌿','🫧'],
    'trust': ['🤞','🛡️','✅'],
    'reserved': ['🫥','🔒','📝'],
    'tbd': ['⏳','🧩','❔']
  };

  function normalizeTagLabel(label){
    return String(label || '').trim().toLowerCase();
  }

  function getEmojiPoolForTag(tag){
    // Allow per-tag override in data:
    // { label: 'Creator', emojis: ['🧑‍💻','✨'] }
    const custom = Array.isArray(tag?.emojis) ? tag.emojis : (typeof tag?.emoji === 'string' ? [tag.emoji] : null);
    const label = normalizeTagLabel(tag?.label);
    return (custom && custom.length) ? custom : (TAG_EMOJI_MAP[label] || ['✨','🪄','⭐']);
  }

  function pickEmojiForTag(tag){
    const pool = getEmojiPoolForTag(tag);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnTagBurst(anchorEl, tag){
    const r = anchorEl.getBoundingClientRect();
    const baseX = r.left + r.width/2;
    const baseY = r.top + r.height/2;

    // More “fun” = mixture of tiny emoji particles + 1-2 sticker-like pops
    const emojiCount = prefersReducedMotion ? 1 : 8;
    const stickerCount = prefersReducedMotion ? 0 : 2;

    const pool = getEmojiPoolForTag(tag);

    const spawn = (kind)=>{
      const el = document.createElement('span');
      el.className = kind === 'sticker' ? 'sticker-pop' : 'emoji-pop';
      el.textContent = pool[Math.floor(Math.random() * pool.length)];
      el.style.left = `${baseX}px`;
      el.style.top = `${baseY}px`;
      document.body.appendChild(el);

      if(prefersReducedMotion){
        el.animate([
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: 'translate(-50%, -78%) scale(1)', opacity: 0 }
        ], { duration: 820, easing: 'ease-out', fill: 'forwards' }).finished.finally(()=>el.remove());
        return;
      }

      const dx = (Math.random()-0.5) * (kind === 'sticker' ? 120 : 90);
      const dy = - (kind === 'sticker' ? (60 + Math.random()*110) : (40 + Math.random()*70));
      const rot = (Math.random()-0.5) * (kind === 'sticker' ? 90 : 40);
      // Slower, more readable burst
      const dur = (kind === 'sticker' ? 1300 : 1100) + Math.random()*350;
      const scale0 = kind === 'sticker' ? 0.85 : 0.9;
      const scale1 = kind === 'sticker' ? 1.05 : 1.05;

      el.animate([
        { transform: `translate(-50%, -50%) scale(${scale0}) rotate(0deg)`, opacity: 0.0 },
        { transform: `translate(-50%, -50%) scale(${scale1}) rotate(0deg)`, opacity: 1.0, offset: 0.12 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${rot}deg)`, opacity: 0.0 }
      ], { duration: dur, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' }).finished.finally(()=>el.remove());
    };

    for(let i=0;i<emojiCount;i++) spawn('emoji');
    for(let i=0;i<stickerCount;i++) spawn('sticker');
  }

  let currentMember = null;

  function setStatus(el, msg){
    if(!el) return;
    el.textContent = msg || '';
  }

  async function loadPortraitOverrides(){
    const url = apiUrl('/api/member-portraits');
    if(!url) return;
    try{
      const res = await fetch(url);
      if(!res.ok) return;
      const json = await res.json();
      const portraits = json?.portraits || {};
      Object.keys(portraits).forEach(id=> portraitOverrides.set(id, portraits[id]));
    }catch{}
  }

  function refreshMemberCardPortrait(memberId){
    const btn = document.querySelector(`.member-card[data-member-id="${CSS.escape(memberId)}"]`);
    const img = btn?.querySelector('img[data-member-portrait]');
    const m = (DATA.members || []).find(x=>x.id === memberId);
    if(img && m) img.src = getPortraitForMember(m);
  }

  function openMember(m){
    currentMember = m;
    memberImg.src = getPortraitForMember(m);
    memberImg.alt = `Portrait of ${m.name}`;
    memberName.textContent = m.name;
    memberTitle.textContent = m.title || '';
    memberBio.textContent = m.bio || '';

    // reset portrait upload UI
    if(memberPortraitFile) memberPortraitFile.value = '';
    setStatus(memberPortraitStatus, API_BASE ? '' : 'Backend not configured (set window.MV_API_BASE).');

    memberHighlights.innerHTML = '';
    (m.highlights || []).forEach(h=>{
      const li = document.createElement('li');
      li.textContent = h;
      memberHighlights.appendChild(li);
    });

    memberTags.innerHTML = '';
    (m.identityTags || []).forEach(t=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tag tag-btn ${t.isAccent? 'tag--accent':''}`;
      btn.textContent = t.label;
      btn.setAttribute('aria-label', `Tag: ${t.label}. Tap for a fun burst.`);

      btn.addEventListener('click', ()=>{
        spawnTagBurst(btn, t);
      });

      memberTags.appendChild(btn);
    });

    openOverlay(memberModal);
  }

  async function uploadMemberPortrait(file){
    const url = apiUrl('/api/member-portraits');
    if(!url){
      setStatus(memberPortraitStatus, 'Backend not configured (set window.MV_API_BASE).');
      return;
    }
    if(!currentMember?.id){
      setStatus(memberPortraitStatus, 'Open a member profile first.');
      return;
    }
    if(!file){
      setStatus(memberPortraitStatus, 'Choose a photo first.');
      return;
    }

    setStatus(memberPortraitStatus, 'Uploading…');

    const fd = new FormData();
    fd.append('memberId', currentMember.id);
    fd.append('file', file);

    try{
      const res = await fetchWithAdmin(url, { method: 'POST', body: fd });
      const json = await res.json().catch(()=>null);
      if(!res.ok) throw new Error(json?.error || 'Upload failed');

      const portrait = json?.portrait;
      if(portrait?.url){
        portraitOverrides.set(currentMember.id, portrait.url);
        memberImg.src = portrait.url;
        refreshMemberCardPortrait(currentMember.id);
      }
      setStatus(memberPortraitStatus, 'Updated.');
    }catch(e){
      setStatus(memberPortraitStatus, String(e?.message || e || 'Upload failed'));
    }
  }

  memberPortraitFile?.addEventListener('change', ()=>{
    const f = memberPortraitFile.files?.[0];
    uploadMemberPortrait(f);
  });

  if(membersGrid){
    // Load portrait overrides from backend (if configured), then render.
    loadPortraitOverrides().finally(()=>{
      (DATA.members || []).forEach(m=> membersGrid.appendChild(renderMemberCard(m)));
    });

    // Android/small-screen members collapse: show only ~2 cards by default
    const mql = window.matchMedia('(max-width: 520px)');
    let expanded = false;

    const syncMembersCollapseUI = ()=>{
      if(!membersWrap || !membersToggle) return;

      const isSmall = mql.matches;
      // Only enable the feature on small screens and when there are enough members.
      const enabled = isSmall && (DATA.members || []).length > 2;

      membersToggle.hidden = !enabled;
      if(!enabled){
        membersWrap.classList.remove('is-collapsed');
        membersToggle.setAttribute('aria-expanded', 'true');
        expanded = true;
        return;
      }

      membersWrap.classList.toggle('is-collapsed', !expanded);
      membersToggle.setAttribute('aria-expanded', String(expanded));
      membersToggle.textContent = expanded ? 'Show fewer members' : 'Show all members';
    };

    membersToggle?.addEventListener('click', ()=>{
      expanded = !expanded;
      syncMembersCollapseUI();
    });

    mql.addEventListener?.('change', ()=>{
      // When entering small-screen mode, default to collapsed.
      if(mql.matches) expanded = false;
      syncMembersCollapseUI();
    });

    // Initial
    if(mql.matches) expanded = false;
    syncMembersCollapseUI();
  }

  // Timeline
  const timelineHost = $('#timelineList');
  if(timelineHost){
    (DATA.timeline || []).forEach(item=>{
      const row = document.createElement('div');
      row.className = 'card tl-item';
      row.innerHTML = `
        <div class="tl-year">${escapeHtml(item.year)}</div>
        <div>
          <h3 class="tl-title">${escapeHtml(item.title)}</h3>
          <p class="tl-text">${escapeHtml(item.text)}</p>
        </div>
      `;
      timelineHost.appendChild(row);
    });
  }

  // Gallery + lightbox
  const galleryHost = $('#galleryGrid');
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxCloseBtn = $('#lightboxClose');
  const lightboxDownload = $('#lightboxDownload');
  const lightboxShare = $('#lightboxShare');

  const memoryUploadForm = $('#memoryUploadForm');
  const memoryFile = $('#memoryFile');
  const memoryCaption = $('#memoryCaption');
  const memorySearch = $('#memorySearch');
  const memoryUploadStatus = $('#memoryUploadStatus');

  function normalizeGalleryItem(item){
    // unify shape for both embedded and backend memories
    return {
      id: item.id || item._id || null,
      src: item.src || item.url,
      alt: item.alt || item.caption || 'MessVerse memory',
      caption: item.caption || item.captionText || ''
    };
  }

  let galleryItemsAll = (DATA.gallery || []).map(normalizeGalleryItem);
  let galleryItems = galleryItemsAll.slice();
  let currentLightboxItem = null;

  function openLightbox(item){
    currentLightboxItem = item;
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || 'Gallery image';
    lightboxCaption.textContent = item.caption || '';

    if(lightboxDownload){
      lightboxDownload.href = item.src;
    }

    openOverlay(lightbox);
  }

  lightboxShare?.addEventListener('click', async ()=>{
    if(!currentLightboxItem?.src) return;
    const url = currentLightboxItem.src;
    try{
      if(navigator.share){
        await navigator.share({ title: 'MessVerse memory', text: currentLightboxItem.caption || '', url });
        return;
      }
    }catch{}

    try{
      await navigator.clipboard.writeText(url);
      setStatus(memoryUploadStatus, 'Link copied.');
    }catch{
      setStatus(memoryUploadStatus, url);
    }
  });

  async function deleteMemory(item){
    const url = item?.id ? apiUrl(`/api/memories/${encodeURIComponent(item.id)}`) : null;
    if(!url){
      setStatus(memoryUploadStatus, 'This memory cannot be removed (no backend id).');
      return;
    }

    const ok = window.confirm('Remove this memory?');
    if(!ok) return;

    setStatus(memoryUploadStatus, 'Removing…');
    try{
      const res = await fetchWithAdmin(url, { method: 'DELETE' });
      const json = await res.json().catch(()=>null);
      if(!res.ok) throw new Error(json?.error || 'Remove failed');

      galleryItems = galleryItems.filter(x => x !== item);
      renderGallery();
      setStatus(memoryUploadStatus, 'Removed.');
    }catch(e){
      setStatus(memoryUploadStatus, String(e?.message || e || 'Remove failed'));
    }
  }

  function renderGallery(){
    if(!galleryHost) return;
    galleryHost.innerHTML = '';
    galleryItems.forEach(item=>{
      const fig = document.createElement('figure');
      fig.className = 'figure';
      fig.tabIndex = 0;
      fig.setAttribute('role','button');
      fig.setAttribute('aria-label', `Open gallery item: ${item.caption || 'image'}`);

      const captionText = escapeHtml(item.caption || '');
      const canRemove = Boolean(item.id);

      fig.innerHTML = `
        <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt || '')}" loading="lazy" />
        <figcaption class="figcap">
          <span class="figcap__text">${captionText}</span>
          ${canRemove ? '<button class="mem-del" type="button" aria-label="Remove memory">Remove</button>' : ''}
        </figcaption>
      `;

      fig.addEventListener('click', ()=> openLightbox(item));
      fig.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          openLightbox(item);
        }
      });

      const delBtn = fig.querySelector('.mem-del');
      delBtn?.addEventListener('click', (e)=>{
        e.preventDefault();
        e.stopPropagation();
        deleteMemory(item);
      });

      galleryHost.appendChild(fig);
    });
  }

  async function loadMemoriesFromBackend(){
    const url = apiUrl('/api/memories?limit=80');
    if(!url) return;
    try{
      const res = await fetch(url);
      if(!res.ok) return;
      const json = await res.json();
      const memories = Array.isArray(json?.memories) ? json.memories : [];
      const mapped = memories.map(m => ({ id: m._id || m.id || null, src: m.url, alt: m.alt || '', caption: m.caption || '' }));
      // put newest first (backend already returns desc)
      const existingSrc = new Set(galleryItemsAll.map(x=>x.src));
      mapped.forEach(m=>{
        if(m?.src && !existingSrc.has(m.src)) galleryItemsAll.unshift(m);
      });
      applyGalleryFilter();
    }catch{}
  }

  if(galleryHost){
    loadMemoriesFromBackend().finally(renderGallery);
  }

  async function uploadMemory(){
    const url = apiUrl('/api/memories');
    if(!url){
      setStatus(memoryUploadStatus, 'Backend not configured (set window.MV_API_BASE).');
      return;
    }

    const file = memoryFile?.files?.[0];
    if(!file){
      setStatus(memoryUploadStatus, 'Choose a photo first.');
      return;
    }

    setStatus(memoryUploadStatus, 'Uploading…');

    const fd = new FormData();
    fd.append('file', file);
    if(memoryCaption?.value) fd.append('caption', memoryCaption.value);

    try{
      const res = await fetchWithAdmin(url, { method: 'POST', body: fd });
      const json = await res.json().catch(()=>null);
      if(!res.ok) throw new Error(json?.error || 'Upload failed');

      const m = json?.memory;
      const item = { id: m?._id || m?.id || null, src: m.url, alt: m.alt || '', caption: m.caption || '' };
      galleryItemsAll.unshift(item);
      applyGalleryFilter();

      if(memoryFile) memoryFile.value = '';
      if(memoryCaption) memoryCaption.value = '';
      setStatus(memoryUploadStatus, 'Uploaded.');
    }catch(e){
      setStatus(memoryUploadStatus, String(e?.message || e || 'Upload failed'));
    }
  }

  function applyGalleryFilter(){
    const q = String(memorySearch?.value || '').trim().toLowerCase();
    if(!q){
      galleryItems = galleryItemsAll.slice();
      renderGallery();
      return;
    }

    galleryItems = galleryItemsAll.filter(item => {
      const cap = String(item.caption || '').toLowerCase();
      const alt = String(item.alt || '').toLowerCase();
      return cap.includes(q) || alt.includes(q);
    });
    renderGallery();
  }

  memorySearch?.addEventListener('input', ()=>{
    applyGalleryFilter();
  });

  memoryUploadForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    uploadMemory();
  });

  function syncAdminUI(){
    const key = getAdminKey();
    const unlocked = Boolean(key);

    if(adminState){
      adminState.textContent = unlocked ? 'Unlocked' : 'Locked';
      adminState.classList.toggle('is-on', unlocked);
    }

    if(adminOpenBtn){
      adminOpenBtn.textContent = unlocked ? 'Admin lock' : 'Admin unlock';
      adminOpenBtn.setAttribute('aria-pressed', String(unlocked));
    }
  }

  // Toggle: click to unlock (opens modal), click again to lock (clears key).
  // Tip: hold Shift while unlocked to open the modal and change/view the key.
  adminOpenBtn?.addEventListener('click', (e)=>{
    if(!adminModal) return;

    const key = getAdminKey();
    const unlocked = Boolean(key);

    if(unlocked && !e?.shiftKey){
      setAdminKey('');
      syncAdminUI();
      return;
    }

    if(adminKeyInput) adminKeyInput.value = getAdminKey();
    setStatus(adminStatus, '');
    openOverlay(adminModal);
  });

  const closeAdmin = ()=> adminModal && closeOverlay(adminModal);
  adminCloseBtn?.addEventListener('click', closeAdmin);

  adminSaveBtn?.addEventListener('click', ()=>{
    const v = String(adminKeyInput?.value || '').trim();
    if(!v){
      setStatus(adminStatus, 'Enter a key.');
      return;
    }
    setAdminKey(v);
    syncAdminUI();
    setStatus(adminStatus, 'Saved for this session.');
    closeAdmin();
  });

  adminClearBtn?.addEventListener('click', ()=>{
    setAdminKey('');
    if(adminKeyInput) adminKeyInput.value = '';
    syncAdminUI();
    setStatus(adminStatus, 'Cleared.');
  });

  // Initialize
  syncAdminUI();

  // Quotes
  const quotesHost = $('#quotesGrid');
  const shuffleBtn = $('#shuffleQuotes');

  const pickN = (arr, n)=>{
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  };

  // Text-to-speech for quote cards
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  function speakQuote(by, text){
    if(!canSpeak) return;

    // stop any ongoing speech first
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(`${by} says: ${text}`);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.lang = 'en-US';

    // Try to pick an English voice if available
    const pickVoice = ()=>{
      const voices = window.speechSynthesis.getVoices?.() || [];
      const v = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
      if(v) u.voice = v;
      window.speechSynthesis.speak(u);
    };

    // Some browsers load voices async
    if((window.speechSynthesis.getVoices?.() || []).length === 0){
      window.speechSynthesis.onvoiceschanged = ()=>{
        window.speechSynthesis.onvoiceschanged = null;
        pickVoice();
      };
    }else{
      pickVoice();
    }
  }

  function renderQuotes(){
    if(!quotesHost) return;
    quotesHost.innerHTML = '';
    const chosen = pickN(DATA.quotes || [], 4);
    chosen.forEach(q=>{
      const el = document.createElement('div');
      el.className = 'quote quote--speak';
      el.tabIndex = 0;
      el.setAttribute('role','button');
      el.setAttribute('aria-label', canSpeak
        ? `Play quote by ${q.by}`
        : `Quote by ${q.by}`
      );

      const by = String(q.by || '').trim();
      const text = String(q.text || '').trim();

      el.innerHTML = `
        <div class="quote__top">
          <p>“${escapeHtml(text)}”</p>
          ${canSpeak ? '<button class="quote__speak" type="button" aria-label="Play voice">Listen</button>' : ''}
        </div>
        <footer>— ${escapeHtml(by)}</footer>
      `;

      const trigger = ()=>{
        if(!canSpeak) return;
        if(!text) return;
        speakQuote(by || 'Someone', text);
      };

      el.addEventListener('click', trigger);
      el.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          trigger();
        }
      });

      const btn = el.querySelector('.quote__speak');
      btn?.addEventListener('click', (e)=>{
        e.preventDefault();
        e.stopPropagation();
        trigger();
      });

      quotesHost.appendChild(el);
    });
  }

  shuffleBtn?.addEventListener('click', renderQuotes);
  renderQuotes();

  // Overlay events
  function bindOverlay(overlay, closeBtn){
    const backdrop = overlay.querySelector('[data-backdrop]');

    const onKeyDown = (e)=>{
      if(e.key === 'Escape') closeOverlay(overlay);
      trapTab(overlay, e);
    };

    closeBtn?.addEventListener('click', ()=> closeOverlay(overlay));
    backdrop?.addEventListener('click', ()=> closeOverlay(overlay));

    overlay.addEventListener('keydown', onKeyDown);
  }

  if(memberModal) bindOverlay(memberModal, memberCloseBtn);
  if(lightbox) bindOverlay(lightbox, lightboxCloseBtn);
  if(adminModal) bindOverlay(adminModal, adminCloseBtn);

  // PWA SW register
  if('serviceWorker' in navigator && /^https?:/.test(location.protocol)){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  function escapeHtml(s){
    return String(s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function escapeAttr(s){
    return escapeHtml(s);
  }
})();
