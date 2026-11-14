/* MSA site interactions. Plain JS, no build step. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- seeded random so edges look the same on every load ---------- */
  let seed = 25;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  /* ---------- painted -> dirty section edges ----------
     Each .edge hangs the PREVIOUS section's colour down into its own section.
     rough 0 = soft wet brush stroke, rough 1 = jagged, dripping, filthy. */
  function prevSection(el) {
    const sec = el.parentElement;
    let p = sec.previousElementSibling;
    if (p && p.tagName === "MAIN") p = p.lastElementChild;
    return p;
  }
  function buildEdge(el) {
    const prev = prevSection(el);
    if (!prev) return;
    const color = getComputedStyle(prev).backgroundColor;
    const rough = parseFloat(el.dataset.rough || "0");
    const drip = el.hasAttribute("data-drip");
    const W = 1000, steps = 120;
    const base = 10 + rough * 14;
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * W;
      const smooth = Math.sin(x / 140 + ph[0]) * 6 + Math.sin(x / 57 + ph[1]) * 3;
      const jag = (rnd() - 0.5) * 2 * (2 + rough * 16) + Math.sin(x / 23 + ph[2]) * rough * 5;
      pts.push([x, base + smooth * (1 - rough * 0.4) + jag * rough]);
    }
    let d = `M0,-2 L${W},-2 `;
    for (let i = pts.length - 1; i >= 0; i--) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} `;
    d += "Z";
    let extra = "";
    if (drip) {
      const n = Math.round(10 + rough * 12);
      for (let k = 0; k < n; k++) {
        const x = rnd() * W, w = 2 + rnd() * 6, len = 12 + rnd() * rnd() * 70;
        const y0 = base - 4;
        extra += `<path d="M${x - w},${y0} L${x - w * 0.6},${y0 + len} Q${x},${y0 + len + w * 1.6} ${x + w * 0.6},${y0 + len} L${x + w},${y0} Z"/>`;
        if (rnd() < 0.4) extra += `<ellipse cx="${x}" cy="${y0 + len + 10 + rnd() * 14}" rx="${w * 0.5}" ry="${w * 0.6}"/>`;
      }
    }
    // dry-brush streaks on the soft, painted edges
    let streaks = "";
    if (rough < 0.5) {
      for (let k = 0; k < 26; k++) {
        const x = rnd() * W, y = base + 2 + rnd() * 10, len = 20 + rnd() * 90;
        streaks += `<rect x="${x}" y="${y}" width="${len}" height="${0.8 + rnd() * 1.6}" rx="1" opacity="${0.25 + rnd() * 0.5}"/>`;
      }
    }
    el.innerHTML = `<svg viewBox="0 0 ${W} 90" preserveAspectRatio="none" fill="${color}"><path d="${d}"/>${extra}${streaks}</svg>`;
  }
  document.querySelectorAll(".edge").forEach(buildEdge);

  /* ---------- scroll: decay amount, manifest reveal, hero parallax ---------- */
  const manifest = document.querySelector("[data-reveal]");
  if (manifest) {
    manifest.innerHTML = manifest.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ");
  }
  const words = manifest ? [...manifest.querySelectorAll(".w")] : [];
  const para = [...document.querySelectorAll("[data-parallax]")];
  const nav = document.querySelector(".nav");

  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    const y = scrollY;
    const t = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    root.style.setProperty("--rot", t.toFixed(3));

    if (words.length) {
      const r = manifest.getBoundingClientRect();
      const p = (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35);
      const lit = Math.round(Math.min(1, Math.max(0, p)) * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < lit));
    }
    // nav colour follows whatever section is under it
    const under = document.elementFromPoint(innerWidth / 2, nav.offsetHeight + 6);
    const sec = under && under.closest(".s");
    nav.classList.toggle("on-dark", !!(sec && sec.hasAttribute("data-dark")));
    if (!reduced && y < innerHeight * 1.2) {
      para.forEach(el => { el.style.transform = `translateY(${(y * parseFloat(el.dataset.parallax)).toFixed(1)}px)`; });
    }
  }
  let ticking = false;
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
  }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ---------- flip buttons (two faces: the current one tips back, the red one rolls up) ----------
     Each face is a span carrying the button's own classes, so it keeps the button's look; the link itself becomes a bare frame. */
  document.querySelectorAll(".nav-links a, .nav-cta, .store, .btn-toxic").forEach(el => {
    const cls = [...el.classList].join(" ");
    const def = document.createElement("span");
    def.className = cls + " face def";
    while (el.firstChild) def.appendChild(el.firstChild);
    const hov = def.cloneNode(true);
    hov.className = cls + " face hov";
    hov.setAttribute("aria-hidden", "true");
    el.append(def, hov);
    el.classList.add("flip");
  });

  /* ---------- intro: MainMenuScreen.Leave() reversed (same timings and curves, time runs backwards) ----------
     Leave(): rot 0->1 over 1.1 s and vignette over 1.3 s (InQuad), Vivus shakes 6 px for 1.3 s, title 1 -> 1.04
     over 1.4 s, buttons and tagline out in 0.4 s, at 1.0 s black in over 0.45 s. Whole thing = 1.45 s.
     The curves are baked into CSS keyframes (styles.css, intro-*); here we only decide when to start. */
  if (root.classList.contains("intro-on")) {
    let started = false;
    const finish = () => {
      root.classList.remove("intro-on", "intro-run");
      document.querySelectorAll(".intro-l").forEach(el => el.remove());
    };
    const run = () => {
      root.classList.add("intro-run");
      setTimeout(finish, 1500);
    };
    // start once fonts and the hero pictures are ready (or after 1.5 s), then hold black a moment
    const go = () => {
      if (started) return;
      started = true;
      const imgs = [...document.querySelectorAll(".s-hero img")].map(im => im.decode ? im.decode().catch(() => {}) : null);
      Promise.all([document.fonts ? document.fonts.ready : null, ...imgs]).then(() => setTimeout(run, 300));
    };
    if (document.readyState === "complete") go();
    else { addEventListener("load", go, { once: true }); setTimeout(go, 1500); }
  }

  /* ---------- style meter: climbs on the beat (120 BPM), shakes on every change, SHRED burns ---------- */
  const row = document.querySelector(".rank-row");
  if (row) {
    const ranks = [...row.querySelectorAll("li")];
    const top = ranks.length - 1;
    // climb D..SHRED, hold SHRED for 4 beats, crash back to nothing
    const seq = [...ranks.keys(), top, top, top, -1];
    let step = 0, timer = null, lit = -2;
    const set = idx => {
      if (idx === lit) return;
      const crash = idx < lit;
      lit = idx;
      ranks.forEach((li, i) => li.classList.toggle("lit", i === idx));
      row.style.setProperty("--amp", `${crash ? 7 : 1 + Math.max(0, idx) * 1.1}px`);
      row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake");
    };
    const tick = () => { set(seq[step % seq.length]); step++; };

    // fire on the SHRED box
    const cv = row.querySelector(".fire"), ctx = cv.getContext("2d");
    const dpr = Math.min(2, devicePixelRatio || 1);
    const CW = 170, CH = 140;
    cv.width = CW * dpr; cv.height = CH * dpr; ctx.scale(dpr, dpr);
    const parts = []; let heat = 0.2, raf = null;
    const frame = () => {
      const target = lit === top ? 1 : 0.22;
      heat += (target - heat) * 0.08;
      const n = Math.round(heat * 9);
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.3;
        parts.push({ x: side ? CW / 2 + (Math.random() < 0.5 ? -1 : 1) * (32 + Math.random() * 6) : CW / 2 + (Math.random() - 0.5) * 60,
          y: side ? CH - 12 - Math.random() * 24 : CH - 38 - Math.random() * 6,
          vx: (Math.random() - 0.5) * 0.6, vy: -(1 + Math.random() * 1.8) * (0.7 + heat),
          r: 5 + Math.random() * 9 * (0.6 + heat), life: 0, max: 26 + Math.random() * 30 });
      }
      ctx.clearRect(0, 0, CW, CH);
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++; p.x += p.vx + Math.sin((p.life + p.y) * 0.15) * 0.4; p.y += p.vy; p.r *= 0.965;
        const t = p.life / p.max;
        if (t >= 1 || p.r < 0.6) { parts.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const a = (1 - t) * 0.42;
        const col = t < 0.25 ? "255,236,160" : t < 0.55 ? "255,150,40" : "200,40,20";
        g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduced) {
        if (!timer) timer = setInterval(tick, 500);
        if (!raf) raf = requestAnimationFrame(frame);
      } else if (!e.isIntersecting) {
        clearInterval(timer); timer = null;
        cancelAnimationFrame(raf); raf = null;
      }
    });
    io.observe(document.querySelector(".ranks"));
    if (reduced) set(top);
  }

  /* ---------- characters ---------- */
  const CHARS = [
    { name: "Vivus", alias: "The Kid", age: "14", role: "Guitarist, cool son", img: "assets/vivus_kid.png", aka: "hand",
      line: "“Mom's just out on church business. She'll be back by supper. She always is.”" },
    { name: "Mother", alias: "The Rock Nun", aliasHtml: 'The <span class="graffiti">Rock</span> Nun', age: "?", role: "Sister of the White Hand?", img: "assets/mother.png", aka: "hand",
      line: "“The Hand gave us supper. The Lord gave us distortion. Guess which one I thank.”" },
    { name: "???", alias: "The White Hand", age: "—", role: "Unknown", img: "assets/vivus.png", silhouette: true, aka: "hand",
      line: "“Population nominal. Supper is served. Proceed.”" },
  ];
  const charEl = document.querySelector("[data-char]");
  if (charEl) {
    const f = k => charEl.querySelector(`[data-f="${k}"]`);
    let ci = 0;
    const show = (i, animate = true) => {
      ci = (i + CHARS.length) % CHARS.length;
      const c = CHARS[ci], n = CHARS[(ci + 1) % CHARS.length], p = CHARS[(ci - 1 + CHARS.length) % CHARS.length];
      const img = f("img");
      const apply = () => {
        f("name").textContent = c.name;
        if (c.aliasHtml) f("alias").innerHTML = c.aliasHtml; else f("alias").textContent = c.alias;
        f("age").textContent = c.age; f("role").textContent = c.role;
        f("line").textContent = c.line;
        f("aka").className = `aka ${c.aka || "hand"}`;
        f("count").textContent = `${String(ci + 1).padStart(2, "0")}/${String(CHARS.length).padStart(2, "0")}`;
        f("bar").style.width = `${((ci + 1) / CHARS.length) * 100}%`;
        f("nextAlias").textContent = `${n.name} aka`; f("nextName").textContent = n.alias;
        f("prevAlias").textContent = `${p.name} aka`; f("prevName").textContent = p.alias;
        img.src = c.img; img.alt = `${c.name}, ${c.alias}`;
        img.classList.toggle("silhouette", !!c.silhouette);
        img.classList.remove("swap");
      };
      if (animate && !reduced) { img.classList.add("swap"); setTimeout(apply, 220); } else apply();
    };
    charEl.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => show(ci + parseInt(b.dataset.dir, 10))));
    show(0, false);
  }

  /* ---------- six strings table ---------- */
  const STRINGS = [
    { key: "Q", note: "E↓", role: "Damage Dealer", talk: "Hit hard, hit on the beat.",
      desc: "Hit hard, hit on the beat. On-beat notes deal bonus damage and charge Voltage." },
    { key: "W", note: "A", role: "Amplifier", talk: "Make everything else louder.",
      desc: "Buffs the next notes in the riff. The string that turns a combo into a chord." },
    { key: "E", note: "D", role: "Defender", talk: "A wall of sound. Literally.",
      desc: "Shields and blocks. Hold the line until the band kicks back in." },
    { key: "A", note: "G", role: "Debuffer", talk: "Bleed and Poison, one bend at a time.",
      desc: "Bleed, Poison and slow rot. Distortion makes them bleed every beat." },
    { key: "S", note: "B", role: "Controller", talk: "Stun it. Push it. Own the stage.",
      desc: "Stuns, knockback and Kill Switch cuts that stop a hit mid-windup." },
    { key: "D", note: "E↑", role: "Reaction / Special", talk: "The one that answers back.",
      desc: "Reactive tricks and specials. Echo repeats what you just played at half volume." },
  ];
  const table = document.querySelector(".strings-table");
  if (table) {
    const card = document.querySelector(".string-card");
    const s = k => card.querySelector(`[data-s="${k}"]`);
    STRINGS.forEach((st, i) => {
      const row = document.createElement("button");
      row.className = "st-row"; row.setAttribute("role", "listitem");
      row.innerHTML = `<span class="k">${String(i + 1).padStart(2, "0")}<b>${st.note}</b></span><span class="r">${st.role}</span><span class="mono">“${st.talk}” — key ${st.key}</span>`;
      row.addEventListener("click", () => pick(i));
      row.addEventListener("mouseenter", () => pick(i));
      table.appendChild(row);
    });
    const rows = [...table.querySelectorAll(".st-row")];
    function pick(i) {
      const st = STRINGS[i];
      s("key").textContent = st.key; s("note").textContent = st.note; s("idx").textContent = String(i + 1).padStart(2, "0");
      s("role").textContent = st.role; s("desc").textContent = st.desc;
      rows.forEach((r, j) => r.classList.toggle("on", j === i));
    }
    pick(0);
  }

  /* ---------- gallery: pairs get a light/dark compare slider ---------- */
  const ART = [
    { a: "assets/cma_3.jpg", b: "assets/cma_2.jpg", cap: "01 — The salon. Second reading on the right." },
    { a: "assets/cma_5.jpg", b: "assets/cma_4.jpg", cap: "02 — Spotlight." },
    { a: "assets/sheet.png", cap: "03 — Early mouse exploration." },
    { a: "assets/street.jpg", cap: "04 — The street, 1968." },
  ];
  const gal = document.querySelector(".gallery");
  if (gal) {
    const cmp = gal.querySelector(".compare"), A = gal.querySelector(".cmp-a"), B = gal.querySelector(".cmp-b");
    const range = gal.querySelector(".cmp-range"), cap = gal.querySelector("figcaption"), dl = gal.querySelector(".dl");
    const tPrev = gal.querySelector('[data-thumb="prev"]'), tNext = gal.querySelector('[data-thumb="next"]');
    let gi = 0;
    const setCut = v => cmp.style.setProperty("--cut", `${v}%`);
    range.addEventListener("input", () => setCut(range.value));
    const show = i => {
      gi = (i + ART.length) % ART.length;
      const it = ART[gi];
      A.src = it.a; A.alt = it.cap;
      cmp.classList.toggle("single", !it.b);
      if (it.b) { B.src = it.b; B.alt = it.cap + " (second reading)"; }
      range.value = 50; setCut(50);
      cap.textContent = it.cap;
      dl.href = it.b || it.a;
      tPrev.src = ART[(gi - 1 + ART.length) % ART.length].a;
      tNext.src = ART[(gi + 1) % ART.length].a;
    };
    gal.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => show(gi + parseInt(b.dataset.g, 10))));
    show(0);
  }

})();
