/*
 * 発音変化スライム狩り
 * このファイルは「登録済みの問題を出題する」だけ。
 * 発音変化の解析・判定・生成は一切行わない。
 */
(function () {
  "use strict";

  const QUESTIONS = Array.isArray(window.QUESTIONS) ? window.QUESTIONS : [];
  const CATEGORIES = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];

  const $ = (id) => document.getElementById(id);
  const el = {
    home: $("home"), quiz: $("quiz"),
    levels: $("levels"), wildBtn: $("wildBtn"), wildCount: $("wildCount"), catList: $("catList"),
    backBtn: $("backBtn"), modeLabel: $("modeLabel"),
    qText: $("qText"), answer: $("answer"),
    aPron: $("aPron"), aCats: $("aCats"), aSteps: $("aSteps"), aNote: $("aNote"),
    audioBtn: $("audioBtn"), revealBtn: $("revealBtn"), nextBtn: $("nextBtn"),
  };

  const state = { level: "all", mode: null, cat: null, deck: [], idx: 0, revealed: false };
  let audio = null;

  // ---------- 出題プール ----------
  function inLevel(q) {
    return state.level === "all" || String(q.level) === state.level;
  }
  function pool(mode, cat) {
    return QUESTIONS.filter((q) => {
      if (!inLevel(q)) return false;
      if (mode === "single") return q.change !== false && (q.cat || []).includes(cat);
      return true; // 野生：変化なし問題も含めて全部
    });
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- ホーム ----------
  function renderHome() {
    el.levels.querySelectorAll(".chip").forEach((b) => {
      const on = b.dataset.level === state.level;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", on);
    });

    const wildN = pool("wild").length;
    el.wildCount.textContent = wildN + "問";
    el.wildBtn.disabled = wildN === 0;

    el.catList.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const n = pool("single", cat).length;
      const b = document.createElement("button");
      b.className = "cat";
      b.disabled = n === 0;
      b.innerHTML = "<span></span><span class='n'></span>";
      b.firstChild.textContent = cat;
      b.lastChild.textContent = n;
      b.addEventListener("click", () => start("single", cat));
      el.catList.appendChild(b);
    });
  }

  el.levels.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.level = b.dataset.level;
    renderHome();
  });
  el.wildBtn.addEventListener("click", () => start("wild"));

  // ---------- 出題 ----------
  function start(mode, cat) {
    const p = pool(mode, cat);
    if (!p.length) return;
    state.mode = mode;
    state.cat = cat || null;
    state.deck = shuffle(p);
    state.idx = 0;
    el.modeLabel.textContent = mode === "single" ? cat : "野生";
    el.home.hidden = true;
    el.quiz.hidden = false;
    history.pushState({ quiz: true }, "");
    show();
  }

  function sizeClass(node, text) {
    node.classList.remove("mid", "long");
    const len = text.length;
    if (len > 9) node.classList.add("long");
    else if (len > 5) node.classList.add("mid");
  }

  function show() {
    stopAudio();
    const q = state.deck[state.idx];
    state.revealed = false;
    el.qText.textContent = q.text;
    sizeClass(el.qText, q.text);
    el.answer.hidden = true;
    el.revealBtn.hidden = false;
    el.nextBtn.hidden = true;
  }

  function reveal() {
    const q = state.deck[state.idx];
    state.revealed = true;

    el.aPron.textContent = "[" + q.pron + "]";
    sizeClass(el.aPron, q.pron);

    el.aCats.innerHTML = "";
    if (q.change === false) {
      el.aCats.appendChild(tag("変化なし", true));
    } else {
      (q.cat || []).forEach((c) => el.aCats.appendChild(tag(c)));
    }

    // 途中変化（登録されている問題だけ）
    el.aSteps.innerHTML = "";
    if (Array.isArray(q.steps) && q.steps.length) {
      el.aSteps.appendChild(line(q.text));
      q.steps.forEach((s, i) => {
        el.aSteps.appendChild(arrow(s.rule));
        el.aSteps.appendChild(line("[" + s.form + "]", i === q.steps.length - 1));
      });
      el.aSteps.hidden = false;
    } else {
      el.aSteps.hidden = true;
    }

    el.aNote.textContent = q.note || "";
    el.aNote.hidden = !q.note;

    el.audioBtn.hidden = !q.audio;
    el.audioBtn.classList.remove("err");

    el.answer.hidden = false;
    el.revealBtn.hidden = true;
    el.nextBtn.hidden = false;
  }

  function tag(text, none) {
    const s = document.createElement("span");
    s.className = "tag" + (none ? " none" : "");
    s.textContent = text;
    return s;
  }
  function line(text, final) {
    const d = document.createElement("div");
    if (final) d.className = "final";
    d.textContent = text;
    return d;
  }
  function arrow(rule) {
    const d = document.createElement("div");
    d.className = "arrow";
    d.textContent = "↓ " + (rule || "");
    return d;
  }

  function next() {
    state.idx++;
    if (state.idx >= state.deck.length) {
      const last = state.deck[state.deck.length - 1];
      let d = shuffle(state.deck);
      if (d.length > 1 && d[0] === last) d.push(d.shift()); // 同じ問題の連続を避ける
      state.deck = d;
      state.idx = 0;
    }
    show();
  }

  // ---------- 音声（登録ファイルの再生のみ） ----------
  function stopAudio() {
    if (audio) { audio.pause(); audio = null; }
  }
  el.audioBtn.addEventListener("click", () => {
    const q = state.deck[state.idx];
    if (!q || !q.audio) return;
    stopAudio();
    audio = new Audio(q.audio);
    audio.addEventListener("error", () => el.audioBtn.classList.add("err"));
    audio.play().catch(() => el.audioBtn.classList.add("err"));
  });

  // ---------- 操作 ----------
  el.revealBtn.addEventListener("click", reveal);
  el.nextBtn.addEventListener("click", next);

  function goHome() {
    stopAudio();
    el.quiz.hidden = true;
    el.home.hidden = false;
    renderHome();
  }
  el.backBtn.addEventListener("click", () => history.back());
  window.addEventListener("popstate", () => { if (!el.quiz.hidden) goHome(); });

  document.addEventListener("keydown", (e) => {
    if (el.quiz.hidden) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      state.revealed ? next() : reveal();
    }
  });

  // データの記入漏れだけを知らせる（内容の正誤は判定しない）
  QUESTIONS.forEach((q, i) => {
    if (!q.text || !q.pron) console.warn("問題データ不足:", i, q);
    if (q.change !== false && !(q.cat && q.cat.length)) console.warn("カテゴリー未設定:", i, q);
  });

  renderHome();
})();
