(function () {
  "use strict";

  const data = window.WEDDING;
  if (!data) {
    console.error("[wedding] data.js not loaded");
    return;
  }

  const dt = new Date(data.date);
  const PAD = (n) => String(n).padStart(2, "0");
  const KO_DAY = ["일", "월", "화", "수", "목", "금", "토"];
  const EN_DAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // ---------------------------------------------------------------
  // Formatted date strings
  // ---------------------------------------------------------------
  const Y = dt.getFullYear();
  const M = dt.getMonth(); // 0-11
  const D = dt.getDate();
  const HH = dt.getHours();
  const MM = dt.getMinutes();
  const dayIdx = dt.getDay();

  const fmtKoTime = (h, m) => {
    const a = h < 12 ? "오전" : "오후";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mStr = m === 0 ? "" : ` ${m}분`;
    return `${a} ${h12}시${mStr}`;
  };

  const startTimeKo = fmtKoTime(HH, MM);
  const startTime24 = `${PAD(HH)}:${PAD(MM)}`;

  // Optional end time
  let timeRange24 = startTime24;
  let timeRangeKo = startTimeKo;
  if (data.endDate) {
    const dtEnd = new Date(data.endDate);
    const eH = dtEnd.getHours();
    const eM = dtEnd.getMinutes();
    timeRange24 = `${startTime24} ~ ${PAD(eH)}:${PAD(eM)}`;
    timeRangeKo = `${startTimeKo} ~ ${fmtKoTime(eH, eM)}`;
  }

  const dateLine = `${Y}.${PAD(M + 1)}.${PAD(D)}  ${EN_DAY[dayIdx]}  ${timeRange24}`;
  const heroDate = `${Y}.${PAD(M + 1)}.${PAD(D)}  ${KO_DAY[dayIdx]}요일`;
  const heroTime = timeRange24;
  const dateBig = `${Y}.${PAD(M + 1)}.${PAD(D)}`;
  const dateDayTime = `${KO_DAY[dayIdx]}요일 ${timeRangeKo}`;

  // ---------------------------------------------------------------
  // Bindings (data-bind)
  // ---------------------------------------------------------------
  const bindings = {
    // mainPhoto: intentionally NOT bound here — hero img src is set later by
    // renderGalleryAndHero() after Firebase resolves so we don't flash the
    // original photo before swapping to the top-liked one.
    groomName: data.groom.name,
    brideName: data.bride.name,
    groomFather: data.groom.father,
    groomMother: data.groom.mother,
    brideFather: data.bride.father,
    brideMother: data.bride.mother,
    greeting: data.greeting,
    venueName: data.venue.name,
    venueHall: data.venue.hall,
    venueAddress: data.venue.address,
    dateLine,
    heroDate,
    heroTime,
    dateBig,
    dateDayTime,
  };

  document.querySelectorAll("[data-bind]").forEach((el) => {
    const key = el.getAttribute("data-bind");
    const v = bindings[key];
    if (v == null) return;
    if (el.tagName === "IMG") el.src = v;
    else el.textContent = v;
  });

  // Document title
  document.title = `${data.bride.name} ♥ ${data.groom.name} — ${dateBig} 청첩장`;

  // ---------------------------------------------------------------
  // Calendar render
  // ---------------------------------------------------------------
  (function renderCalendar() {
    const root = document.querySelector('[data-component="calendar"]');
    if (!root) return;

    // Day-of-week headers
    EN_DAY.forEach((d, i) => {
      const h = document.createElement("div");
      h.className =
        "calendar__header" + (i === 0 ? " sun" : i === 6 ? " sat" : "");
      h.textContent = d;
      root.appendChild(h);
    });

    const firstDow = new Date(Y, M, 1).getDay();
    const daysInMonth = new Date(Y, M + 1, 0).getDate();
    const daysInPrev = new Date(Y, M, 0).getDate();

    // Previous month padding
    for (let i = firstDow - 1; i >= 0; i--) {
      const day = document.createElement("div");
      day.className = "calendar__day muted";
      day.textContent = daysInPrev - i;
      root.appendChild(day);
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const day = document.createElement("div");
      const dow = new Date(Y, M, d).getDay();
      day.className =
        "calendar__day" + (dow === 0 ? " sun" : dow === 6 ? " sat" : "");
      if (d === D) day.classList.add("wedding");
      day.textContent = d;
      root.appendChild(day);
    }
    // Next month padding (fill to 6 rows total = 42 cells)
    const totalCells = root.children.length - 7; // minus headers
    const remaining = 42 - totalCells;
    for (let d = 1; d <= remaining; d++) {
      const day = document.createElement("div");
      day.className = "calendar__day muted";
      day.textContent = d;
      root.appendChild(day);
    }
  })();

  // ---------------------------------------------------------------
  // D-day
  // ---------------------------------------------------------------
  (function renderDday() {
    const el = document.querySelector('[data-component="dday"]');
    if (!el) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(Y, M, D);
    const ms = target - today;
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days > 0) {
      el.textContent = days;
      el.parentElement.querySelector(".dday__label").textContent = "DAYS LEFT";
    } else if (days === 0) {
      el.textContent = "DAY";
      el.parentElement.querySelector(".dday__label").textContent =
        "TODAY ✦ THE DAY";
    } else {
      el.textContent = Math.abs(days);
      el.parentElement.querySelector(".dday__label").textContent = "DAYS AGO";
    }
  })();

  // ---------------------------------------------------------------
  // Gallery
  // ---------------------------------------------------------------
  (async function renderGalleryAndHero() {
    const root = document.querySelector('[data-component="gallery"]');
    const heroImg = document.querySelector('[data-component="hero-photo"]');
    const heroHeart = document.querySelector('[data-component="hero-heart"]');
    if (!root) return;

    // photo path → safe Firestore doc id (filename without extension)
    const idFor = (src) =>
      src.split("/").pop().replace(/\.[^.]+$/, "");

    const fb = await window.WEDDING_FB_READY;

    // Fetch all like counts
    const counts = new Map();
    if (fb) {
      try {
        const snap = await fb.getDocs(fb.collection(fb.db, "likes"));
        snap.forEach((d) => counts.set(d.id, (d.data() && d.data().count) || 0));
      } catch (err) {
        console.warn("[wedding] likes fetch failed:", err);
      }
    }

    // Decide hero + gallery: gallery order stays FIXED.
    // If the top-liked photo lives in the gallery (count > 0), swap it with the
    // original hero — that gallery slot now shows the original hero photo.
    const origHero = data.mainPhoto;
    let displayHero = origHero;
    let displayGallery = [...data.gallery];

    const heroCount = counts.get(idFor(origHero)) || 0;
    let bestIdx = -1;
    let bestCount = heroCount;
    data.gallery.forEach((src, i) => {
      const c = counts.get(idFor(src)) || 0;
      if (c > bestCount) {
        bestCount = c;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) {
      displayHero = data.gallery[bestIdx];
      displayGallery[bestIdx] = origHero;
    }

    // Set hero src now (intentionally deferred from initial binding to avoid
    // briefly showing the original photo before the swap decision is made).
    if (heroImg) heroImg.src = displayHero;

    // User's previously-liked photo IDs
    const liked = new Set(
      JSON.parse(localStorage.getItem("wedding_likes") || "[]")
    );
    const persistLiked = () =>
      localStorage.setItem("wedding_likes", JSON.stringify([...liked]));

    // Render gallery thumbs + heart buttons (FIXED ORDER, with swap applied)
    displayGallery.forEach((src, i) => {
      const id = idFor(src);
      const count = counts.get(id) || 0;
      const item = document.createElement("div");
      item.className = "gallery__item";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = `wedding photo ${i + 1}`;
      img.src = src;
      img.dataset.index = i;
      item.appendChild(img);

      const heart = document.createElement("button");
      heart.type = "button";
      heart.className =
        "gallery__heart" + (liked.has(id) ? " is-liked" : "");
      heart.dataset.photoId = id;
      heart.setAttribute("aria-label", "좋아요");
      heart.innerHTML = `<span class="gallery__heart-icon">♥</span><span class="gallery__heart-count">${count > 0 ? count : ""}</span>`;
      item.appendChild(heart);

      root.appendChild(item);
    });

    // Wire up the hero heart with the currently-displayed hero photo's id
    if (heroHeart) {
      const heroId = idFor(displayHero);
      heroHeart.dataset.photoId = heroId;
      if (liked.has(heroId)) heroHeart.classList.add("is-liked");
      const heroCountEl = heroHeart.querySelector(".gallery__heart-count");
      const heroDisplayedCount = counts.get(heroId) || 0;
      heroCountEl.textContent = heroDisplayedCount > 0 ? heroDisplayedCount : "";
    }

    // ---- Lightbox uses the rendered (post-swap) gallery order ----
    const lb = document.querySelector('[data-component="lightbox"]');
    const lbImg = document.querySelector('[data-component="lightbox-img"]');
    const lbCur = document.querySelector('[data-component="lightbox-current"]');
    const lbTot = document.querySelector('[data-component="lightbox-total"]');
    const total = displayGallery.length;
    if (lbTot) lbTot.textContent = total;

    let current = 0;
    const showAt = (i) => {
      current = (i + total) % total;
      if (lbImg) lbImg.src = displayGallery[current];
      if (lbCur) lbCur.textContent = current + 1;
    };
    const open = (i) => {
      showAt(i);
      if (!lb) return;
      lb.classList.add("show");
      lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    };
    const close = () => {
      if (!lb) return;
      lb.classList.remove("show");
      lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
    };

    // ---- Shared like handler (works for both hero & gallery hearts) ----
    const handleLike = async (heart) => {
      const id = heart.dataset.photoId;
      if (!id) return;
      const countEl = heart.querySelector(".gallery__heart-count");
      const cur = parseInt(countEl.textContent || "0", 10) || 0;

      if (liked.has(id)) {
        liked.delete(id);
        heart.classList.remove("is-liked");
        const next = Math.max(0, cur - 1);
        countEl.textContent = next > 0 ? next : "";
        persistLiked();
        if (fb) {
          try {
            await fb.setDoc(
              fb.doc(fb.db, "likes", id),
              { count: fb.increment(-1) },
              { merge: true }
            );
          } catch (err) {
            console.warn("[wedding] unlike failed:", err);
          }
        }
      } else {
        liked.add(id);
        heart.classList.add("is-liked", "pop");
        setTimeout(() => heart.classList.remove("pop"), 500);
        countEl.textContent = cur + 1;
        persistLiked();
        if (fb) {
          try {
            await fb.setDoc(
              fb.doc(fb.db, "likes", id),
              { count: fb.increment(1) },
              { merge: true }
            );
          } catch (err) {
            console.warn("[wedding] like failed:", err);
          }
        }
      }
    };

    // Gallery click delegation: heart or image (lightbox)
    root.addEventListener("click", (e) => {
      const heart = e.target.closest(".gallery__heart");
      if (heart) {
        e.stopPropagation();
        handleLike(heart);
        return;
      }
      const img = e.target.closest("img");
      if (img) open(Number(img.dataset.index));
    });

    // Hero heart click
    if (heroHeart) {
      heroHeart.addEventListener("click", (e) => {
        e.stopPropagation();
        handleLike(heroHeart);
      });
    }

    if (lb) {
      lb.addEventListener("click", (e) => {
        const action = e.target.closest("[data-action]")?.dataset.action;
        if (action === "lightbox-close") close();
        else if (action === "lightbox-prev") showAt(current - 1);
        else if (action === "lightbox-next") showAt(current + 1);
        else if (e.target === lb) close();
      });
      document.addEventListener("keydown", (e) => {
        if (!lb.classList.contains("show")) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft") showAt(current - 1);
        else if (e.key === "ArrowRight") showAt(current + 1);
      });
    }

    // ---- Live updates: update count badges only (no resort, no hero swap mid-session) ----
    if (fb) {
      fb.onSnapshot(fb.collection(fb.db, "likes"), (snap) => {
        snap.docChanges().forEach((change) => {
          const d = change.doc.data();
          const c = (d && d.count) || 0;
          const targets = [
            root.querySelector(`[data-photo-id="${change.doc.id}"]`),
            heroHeart && heroHeart.dataset.photoId === change.doc.id ? heroHeart : null,
          ].filter(Boolean);
          targets.forEach((heart) => {
            const countEl = heart.querySelector(".gallery__heart-count");
            const shown = parseInt(countEl.textContent || "0", 10) || 0;
            if (shown !== c) countEl.textContent = c > 0 ? c : "";
          });
        });
      });
    }
  })();

  // ---------------------------------------------------------------
  // Map iframe (Google Maps embed - no key needed)
  // ---------------------------------------------------------------
  (function setupMap() {
    const iframe = document.querySelector('[data-component="map"]');
    if (!iframe) return;
    const { lat, lng } = data.venue;
    iframe.src = `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=ko&output=embed`;
  })();

  // ---------------------------------------------------------------
  // Nav buttons (Kakao / Naver / T-Map)
  // ---------------------------------------------------------------
  (function renderNavButtons() {
    const root = document.querySelector('[data-component="nav-buttons"]');
    if (!root) return;
    const { name, lat, lng, address } = data.venue;
    const encName = encodeURIComponent(name);
    const encAddr = encodeURIComponent(address || name);
    const buttons = [
      {
        cls: "nav-btn--kakao",
        icon: "K",
        label: "카카오맵",
        url: `https://map.kakao.com/link/map/${encName},${lat},${lng}`,
      },
      {
        cls: "nav-btn--naver",
        icon: "N",
        label: "네이버맵",
        url: `https://map.naver.com/v5/search/${encAddr}`,
      },
      {
        cls: "nav-btn--tmap",
        icon: "T",
        label: "티맵",
        url: `tmap://search?name=${encName}`,
      },
    ];
    buttons.forEach((b) => {
      const a = document.createElement("a");
      a.className = `nav-btn ${b.cls}`;
      a.href = b.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span class="nav-btn__icon">${b.icon}</span>${b.label}`;
      root.appendChild(a);
    });
  })();

  // ---------------------------------------------------------------
  // Transit list
  // ---------------------------------------------------------------
  (function renderTransit() {
    const root = document.querySelector('[data-component="transit"]');
    if (!root) return;
    data.venue.transit.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      root.appendChild(li);
    });
  })();

  // ---------------------------------------------------------------
  // Account lists
  // ---------------------------------------------------------------
  function renderAccounts(side, accounts) {
    const root = document.querySelector(`[data-component="account-${side}"]`);
    if (!root) return;
    root.innerHTML = "";
    accounts.forEach((acc) => {
      const row = document.createElement("div");
      row.className = "account-row";
      row.innerHTML = `
        <div class="account-row__info">
          <div class="account-row__holder">${acc.holder}</div>
          <div class="account-row__num"><strong>${acc.bank}</strong>${acc.number}</div>
        </div>
        <button class="account-row__copy" type="button" data-num="${acc.number}">복사</button>
      `;
      root.appendChild(row);
    });
  }

  function renderAccountMessage(side, msg) {
    const root = document.querySelector(`[data-component="account-${side}"]`);
    if (!root) return;
    root.innerHTML = `<p class="account-msg">${msg}</p>`;
  }

  const hideAccounts = new URLSearchParams(location.search).has("main");
  if (hideAccounts) {
    const msg = data.accountHideMessage;
    renderAccountMessage("bride", msg);
    renderAccountMessage("groom", msg);
    // 계좌 없는 버전에서는 "참석이 어려운 분들을 위해..." 안내 문구를 숨김
    const sub = document.querySelector('[data-component="account-sub"]');
    if (sub) sub.style.display = "none";
  } else {
    renderAccounts("bride", data.bride.accounts);
    renderAccounts("groom", data.groom.accounts);
  }

  // ---------------------------------------------------------------
  // Copy-to-clipboard + Toast
  // ---------------------------------------------------------------
  const toast = document.querySelector('[data-component="toast"]');
  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      return true;
    } catch (e) {
      console.warn("copy failed", e);
      return false;
    }
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".account-row__copy");
    if (!btn) return;
    const num = btn.getAttribute("data-num");
    const ok = await copyText(num);
    if (ok) {
      btn.classList.add("copied");
      btn.textContent = "복사됨";
      showToast("계좌번호가 복사되었습니다");
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = "복사";
      }, 1800);
    } else {
      showToast("복사에 실패했어요");
    }
  });

  // ---------------------------------------------------------------
  // Share button
  // ---------------------------------------------------------------
  document
    .querySelector('[data-action="share"]')
    ?.addEventListener("click", async () => {
      const shareData = {
        title: `${data.bride.name} ♥ ${data.groom.name} 청첩장`,
        url: location.href,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
          return;
        }
      } catch (_) {
        /* user cancelled */
      }
      const ok = await copyText(location.href);
      showToast(ok ? "청첩장 링크가 복사되었습니다" : "링크 복사 실패");
    });

  // ---------------------------------------------------------------
  // Scroll reveal (IntersectionObserver)
  // ---------------------------------------------------------------
  (function setupReveal() {
    const sections = document.querySelectorAll(".section");
    if (!("IntersectionObserver" in window)) {
      sections.forEach((s) => s.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    sections.forEach((s) => io.observe(s));
  })();
})();
