/* storage.js — localStorage 永続化 (window.Store)
 * runs: 直近500回の記録（ミス集計＋遅さ集計を内包）。分析はここから算出。
 * records: コース別の記録（結果画面の過去5回/履歴用）。best: コース別の最高KPM（永続）。
 */
(function () {
  const KEY = 'typing-game-v2';
  const MAX_RUNS = 500;
  const MAX_COURSE = 200;

  const DEFAULT = {
    settings: { furigana: 'hiragana', sound: false, mincho: false, appearance: 'dark' },
    records: {},   // courseId -> [ {date, kpm, kps, correct, miss, acc, time} ] 新しい順
    best: {},      // courseId -> 最高KPM
    runs: [],      // 新しい順: {date, courseId, mistakes:{...}, slow:{...}}
    kpsLog: [],    // 全期間の {t, kps} を記録（折れ線グラフ用）
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        // 旧バージョンからの簡易移行
        const old = localStorage.getItem('typing-game-v1');
        if (old) return migrate(JSON.parse(old));
        return structuredClone(DEFAULT);
      }
      const data = JSON.parse(raw);
      const merged = Object.assign(structuredClone(DEFAULT), data, {
        settings: Object.assign({}, DEFAULT.settings, data.settings),
      });
      merged.records = data.records || {};
      merged.best = data.best || {};
      merged.runs = data.runs || [];
      merged.kpsLog = data.kpsLog || [];
      // best が無ければ records から復元
      for (const cid in merged.records) {
        if (merged.best[cid] == null) {
          merged.best[cid] = (merged.records[cid] || []).reduce((m, x) => Math.max(m, x.kpm || 0), 0);
        }
      }
      return merged;
    } catch (e) {
      return structuredClone(DEFAULT);
    }
  }

  function migrate(old) {
    const d = structuredClone(DEFAULT);
    d.settings = Object.assign({}, d.settings, old.settings);
    d.records = old.records || {};
    for (const cid in d.records) {
      d.best[cid] = (d.records[cid] || []).reduce((m, x) => Math.max(m, x.kpm || 0), 0);
    }
    return d;
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

  // 当日の記録は個別に残し、前日以前は「1日1点の平均」に圧縮する
  function compactKpsLog(data) {
    const sod = startOfDay(Date.now());
    const today = [];
    const past = {}; // dayStart -> {sum, count}
    for (const p of (data.kpsLog || [])) {
      if (p.t >= sod) { today.push({ t: p.t, kps: p.kps }); continue; }
      const d = startOfDay(p.t);
      const e = past[d] || (past[d] = { sum: 0, count: 0 });
      const c = p.daily ? (p.count || 1) : 1;
      e.sum += p.kps * c;
      e.count += c;
    }
    const merged = Object.keys(past).map((d) => ({
      t: +d,
      kps: Math.round((past[d].sum / past[d].count) * 10) / 10,
      count: past[d].count,
      daily: true,
    }));
    data.kpsLog = merged.concat(today).sort((a, b) => a.t - b.t);
  }

  let state = load();
  compactKpsLog(state);

  const Store = {
    get() { return state; },
    getSettings() { return state.settings; },
    setSetting(k, v) { state.settings[k] = v; save(state); },

    getRecords(courseId) { return state.records[courseId] || []; },
    bestKpm(courseId) { return state.best[courseId] || 0; },
    getKpsLog() { return state.kpsLog; },

    // 結果を保存。rec=記録, mistakes/slow=この回の集計。戻り値 {isBest, prevBest}
    addRecord(courseId, rec, mistakes, slow) {
      const list = state.records[courseId] || (state.records[courseId] = []);
      const prevBest = state.best[courseId] || 0;
      list.unshift(rec);
      if (list.length > MAX_COURSE) list.length = MAX_COURSE;
      if (rec.kpm > prevBest) state.best[courseId] = rec.kpm;

      state.runs.unshift({
        date: rec.date, courseId,
        mistakes: mistakes || { byKey: {}, byKana: {}, pairs: {} },
        slow: slow || {},
      });
      if (state.runs.length > MAX_RUNS) state.runs.length = MAX_RUNS;

      // KPS は全期間記録。当日は個別、前日以前は1日平均に圧縮
      state.kpsLog.push({ t: rec.date, kps: rec.kps });
      compactKpsLog(state);
      if (state.kpsLog.length > 10000) state.kpsLog.splice(0, state.kpsLog.length - 10000);

      save(state);
      return { isBest: rec.kpm > prevBest, prevBest };
    },

    // 直近 N 回（既に最大500件）から分析を集計
    getAnalysis() {
      const byKey = {}, byKana = {}, pairs = {}, slow = {};
      for (const run of state.runs) {
        const m = run.mistakes || {};
        for (const x in (m.byKey || {})) byKey[x] = (byKey[x] || 0) + m.byKey[x];
        for (const x in (m.byKana || {})) byKana[x] = (byKana[x] || 0) + m.byKana[x];
        for (const x in (m.pairs || {})) pairs[x] = (pairs[x] || 0) + m.pairs[x];
        for (const kana in (run.slow || {})) {
          const s = slow[kana] || (slow[kana] = { sum: 0, count: 0 });
          s.sum += run.slow[kana].sum;
          s.count += run.slow[kana].count;
        }
      }
      const totalMiss = Object.values(byKey).reduce((a, b) => a + b, 0);
      return { byKey, byKana, pairs, slow, runCount: state.runs.length, totalMiss };
    },

    resetAll() { state = structuredClone(DEFAULT); save(state); },
    resetAnalysis() { state.runs = []; state.kpsLog = []; save(state); },
  };

  window.Store = Store;
})();
