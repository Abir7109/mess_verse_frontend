(function(){
  const $ = (sel, el=document)=> el.querySelector(sel);
  const $$ = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

  const dataEl = document.getElementById('mv-data');
  if(!dataEl) return;

  const DATA = JSON.parse(dataEl.textContent);

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

  function renderMemberCard(m){
    const btn = document.createElement('button');
    btn.className = 'member-card';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Open profile: ${m.name}`);

    const tags = (m.identityTags || []).slice(0, 3).map(t=>`<span class="tag ${t.isAccent? 'tag--accent':''}">${escapeHtml(t.label)}</span>`).join('');

    btn.innerHTML = `
      <div class="member-card__img">
        <img src="${escapeAttr(m.portrait)}" alt="Portrait of ${escapeAttr(m.name)}" loading="lazy" />
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
        ], { duration: 520, easing: 'ease-out', fill: 'forwards' }).finished.finally(()=>el.remove());
        return;
      }

      const dx = (Math.random()-0.5) * (kind === 'sticker' ? 120 : 90);
      const dy = - (kind === 'sticker' ? (60 + Math.random()*110) : (40 + Math.random()*70));
      const rot = (Math.random()-0.5) * (kind === 'sticker' ? 90 : 40);
      const dur = (kind === 'sticker' ? 820 : 650) + Math.random()*250;
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

  function openMember(m){
    memberImg.src = m.portrait;
    memberImg.alt = `Portrait of ${m.name}`;
    memberName.textContent = m.name;
    memberTitle.textContent = m.title || '';
    memberBio.textContent = m.bio || '';

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

  if(membersGrid){
    (DATA.members || []).forEach(m=> membersGrid.appendChild(renderMemberCard(m)));

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

  function openLightbox(item){
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || 'Gallery image';
    lightboxCaption.textContent = item.caption || '';
    openOverlay(lightbox);
  }

  if(galleryHost){
    (DATA.gallery || []).forEach(item=>{
      const fig = document.createElement('figure');
      fig.className = 'figure';
      fig.tabIndex = 0;
      fig.setAttribute('role','button');
      fig.setAttribute('aria-label', `Open gallery item: ${item.caption || 'image'}`);
      fig.innerHTML = `
        <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt || '')}" loading="lazy" />
        <figcaption>${escapeHtml(item.caption || '')}</figcaption>
      `;
      fig.addEventListener('click', ()=> openLightbox(item));
      fig.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          openLightbox(item);
        }
      });
      galleryHost.appendChild(fig);
    });
  }

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

  function renderQuotes(){
    if(!quotesHost) return;
    quotesHost.innerHTML = '';
    const chosen = pickN(DATA.quotes || [], 4);
    chosen.forEach(q=>{
      const el = document.createElement('div');
      el.className = 'quote';
      el.innerHTML = `
        <p>“${escapeHtml(q.text)}”</p>
        <footer>— ${escapeHtml(q.by)}</footer>
      `;
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
