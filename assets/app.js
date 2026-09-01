// assets/app.js
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeJsonParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }
  function getStore(key, fallback) {
    return safeJsonParse(localStorage.getItem(key), fallback);
  }
  function setStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Toast
  function ensureToast() {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.innerHTML = `<span class="t-main"></span><span class="t-sub" style="color:#777"></span>`;
      document.body.appendChild(el);
    }
    return el;
  }

  let toastTimer = null;
  function showToast(main, sub = "") {
    const el = ensureToast();
    $(".t-main", el).textContent = main;
    $(".t-sub", el).textContent = sub ? ` ${sub}` : "";
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // Sparkles (A: subtle)
  function ensureSparklesCanvas() {
    let canvas = $("#sparkles");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "sparkles";
      canvas.className = "sparkles-layer";
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return { canvas, ctx };
  }

  function sparkleBurst(anchorEl) {
    const { ctx } = ensureSparklesCanvas();
    const r = anchorEl.getBoundingClientRect();
    const x = r.left + r.width * 0.75;
    const y = r.top + r.height * 0.5;

    const colors = ["rgba(255,111,165,.9)", "rgba(232,199,161,.95)", "rgba(255,159,192,.85)"];
    const particles = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2) * (i / count) + (Math.random() * 0.35);
      const speed = 0.8 + Math.random() * 1.4;
      particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (0.6 + Math.random() * 0.6),
        size: 1.6 + Math.random() * 1.8,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const start = performance.now();
    const dur = 650;

    function draw(t) {
      const p = Math.min(1, (t - start) / dur);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const s of particles) {
        const k = 1 - p;
        const px = x + s.vx * (p * 70);
        const py = y + s.vy * (p * 70) + p * p * 22;

        const alpha = Math.max(0, (k * 0.9));
        ctx.globalAlpha = alpha;

        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(px, py - s.size);
        ctx.lineTo(px + s.size, py);
        ctx.lineTo(px, py + s.size);
        ctx.lineTo(px - s.size, py);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (p < 1) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    requestAnimationFrame(draw);
  }

  async function loadMissions() {
    const res = await fetch("assets/missions.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load missions.json");
    return await res.json();
  }
// Missions page
async function initMissionsPage() {
  if (document.body.dataset.page !== "missions") return;

  const data = await loadMissions();
  const root = $("#daysRoot");
  if (!root) return;

  const unlocked = new Set(getStore(data.storageKeys.unlockedDays, []));
  const done = new Set(getStore(data.storageKeys.doneMissions, []));

  root.innerHTML = data.days.map(d => {
    const isUnlocked = unlocked.has(d.id);
    const total = d.sections.reduce((acc, s) => acc + s.missions.length, 0);
    const doneCount = d.sections.reduce((acc, s) => acc + s.missions.filter(m => done.has(m.id)).length, 0);

    return `
      <a class="card" href="day-${d.id}.html" style="display:block; text-decoration:none; color:inherit;">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div class="badge">${d.label}</div>
            <div style="height:8px"></div>
            <div class="h1" style="font-size:20px; margin:0;">${d.date}</div>
            <div class="sub">${d.city}</div>
          </div>
          <div style="text-align:right;">
            <div class="badge">${isUnlocked ? "✅ 已解鎖" : "🔒 未解鎖"}</div>
            <div style="height:10px"></div>
            <div class="sub">完成：${doneCount}/${total}</div>
          </div>
        </div>
      </a>
    `;
  }).join("");

  const resetBtn = $("#resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("真係要重置所有完成記錄？（同一部手機/瀏覽器）")) return;
      localStorage.removeItem(data.storageKeys.unlockedDays);
      localStorage.removeItem(data.storageKeys.doneMissions);
      location.reload();
    });
  }
}

// Day page (for later, if you create day-xxxx.html)
async function initDayPage() {
  const dayId = document.body.dataset.day;
  if (!dayId) return;

  const data = await loadMissions();
  const keys = data.storageKeys;
  const day = data.days.find(d => d.id === dayId);
  if (!day) throw new Error("Day not found: " + dayId);

  const titleEl = $("#dayTitle");
  const metaEl = $("#dayMeta");
  if (titleEl) titleEl.textContent = `${day.label}｜${day.date}`;
  if (metaEl) metaEl.textContent = `${day.city}`;

  const hintWrap = $("#hintList");
  if (hintWrap) {
    hintWrap.innerHTML = day.password.hints.map(h => `<div class="hint">• ${h}</div>`).join("");
  }

  const unlocked = new Set(getStore(keys.unlockedDays, []));
  const done = new Set(getStore(keys.doneMissions, []));

  const lockedPanel = $("#lockedPanel");
  const unlockedPanel = $("#unlockedPanel");
  const statusBadge = $("#statusBadge");

  function setLockedUI(isUnlocked) {
    if (lockedPanel) lockedPanel.style.display = isUnlocked ? "none" : "block";
    if (unlockedPanel) unlockedPanel.style.display = isUnlocked ? "block" : "none";
    if (statusBadge) statusBadge.textContent = isUnlocked ? data.uiText.labels.unlocked : data.uiText.labels.locked;
  }

  setLockedUI(unlocked.has(dayId));

  const input = $("#passwordInput");
  const btn = $("#unlockBtn");
  if (btn && input) {
    btn.addEventListener("click", () => {
      const val = (input.value || "").trim();
      if (val === day.password.answer) {
        unlocked.add(dayId);
        setStore(keys.unlockedDays, Array.from(unlocked));
        setLockedUI(true);
        showToast(day.password.successToast, day.password.successSubToast);
      } else {
        showToast("密碼唔啱喎…", "BB 再試多次");
      }
    });
  }

  const missionsRoot = $("#missionsRoot");
  if (missionsRoot) {
    missionsRoot.innerHTML = day.sections.map(sec => {
      const itemsHtml = sec.missions.map(m => {
        const isDone = done.has(m.id);
        const tagClass = m.type === "main" ? "tag main" : "tag side";
        const tagText = m.type === "main" ? data.uiText.labels.main : data.uiText.labels.side;

        return `
          <div class="mission ${isDone ? "done" : ""}" data-mission-id="${m.id}">
            <div style="display:flex; flex-direction:column; gap:8px; min-width: 86px;">
              <span class="${tagClass}">${tagText}</span>
              <span class="badge" style="justify-content:center; padding:6px 10px;">${sec.time}</span>
            </div>
            <div style="flex:1;">
              <h3>${m.title}</h3>
              <p>${m.description}</p>
            </div>
            <div class="actions">
              <button class="btn btn-primary doneBtn" ${isDone ? "disabled" : ""}>
                ${isDone ? "已完成" : data.uiText.buttons.markDone}
              </button>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="card" style="margin-top:12px;">
          <div class="section-title">${sec.title}</div>
          <div class="grid">${itemsHtml}</div>
        </div>
      `;
    }).join("");

    $$(".doneBtn", missionsRoot).forEach(btnEl => {
      btnEl.addEventListener("click", (e) => {
        const missionEl = e.target.closest(".mission");
        const missionId = missionEl.dataset.missionId;
        if (done.has(missionId)) return;

        done.add(missionId);
        setStore(keys.doneMissions, Array.from(done));

        missionEl.classList.add("done", "pop");
        e.target.textContent = "已完成";
        e.target.setAttribute("disabled", "disabled");

        let reward = "";
        for (const s of day.sections) {
          const found = s.missions.find(mm => mm.id === missionId);
          if (found) { reward = found.reward || ""; break; }
        }

        sparkleBurst(e.target);
        showToast("完成咗 ✅", reward || "BB 做得好乖 ✨");
        setTimeout(() => missionEl.classList.remove("pop"), 250);
      });
    });
  }

  if (!unlocked.has(dayId) && unlockedPanel) unlockedPanel.style.display = "none";
}
  // Boot
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await initMissionsPage();
      await initDayPage();
    } catch (e) {
      console.error(e);
      showToast("出咗少少問題…", "你可以截圖畀我，我幫你執");
    }
  });
})();