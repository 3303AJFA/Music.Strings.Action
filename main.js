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

  /* ---------- style meter climbs on the beat (120 BPM) ---------- */
  const ranks = [...document.querySelectorAll(".rank-row li")];
  if (ranks.length) {
    let step = 0, timer = null;
    const tick = () => {
      ranks.forEach((li, i) => li.classList.toggle("lit", i === step % (ranks.length + 2)));
      step++;
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer && !reduced) timer = setInterval(tick, 500);
      if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    });
    io.observe(document.querySelector(".ranks"));
    if (reduced) ranks[ranks.length - 1].classList.add("lit");
  }

  /* ---------- characters ---------- */
  const CHARS = [
    { name: "Vivus", alias: "The Kid", age: "14", role: "Guitarist, son", voice: "TBA", img: "assets/vivus.png",
      pos: "18% 22%", line: "“Mom's just out on church business. She'll be back by supper. She always is.”" },
    { name: "Mother", alias: "The Nun", age: "?", role: "Sister of the White Hand", voice: "TBA", img: "assets/mother.png",
      pos: "88% 70%", line: "“The White Hand provides, little one. Eat your supper and don't ask where it comes from.”" },
    { name: "???", alias: "The White Hand", age: "—", role: "Unknown", voice: "—", img: "assets/vivus.png", silhouette: true,
      pos: "50% 50%", line: "“Population nominal. Supper is served. Proceed.”" },
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
        f("name").textContent = c.name; f("alias").textContent = c.alias;
        f("age").textContent = c.age; f("role").textContent = c.role; f("voice").textContent = c.voice;
        f("line").textContent = c.line;
        f("count").textContent = `${String(ci + 1).padStart(2, "0")}/${String(CHARS.length).padStart(2, "0")}`;
        f("bar").style.width = `${((ci + 1) / CHARS.length) * 100}%`;
        f("voiceImg").style.backgroundPosition = c.pos;
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

  /* ---------- newsletter (no backend yet) ---------- */
  window.msaSubscribe = e => {
    e.preventDefault();
    const msg = document.querySelector(".news-msg");
    msg.textContent = "The list opens soon. You're early. Good.";
    e.target.reset();
    return false;
  };
})();
