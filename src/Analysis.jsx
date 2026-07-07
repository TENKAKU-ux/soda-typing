/* Analysis.jsx — 苦手キー/文字・入力の遅さ・KPS推移の分析（直近500回／KPSは全期間） */
const KPS_DAY_MS = 864e5;

function kpsStartOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function kpsStartOfMonth(ts) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function kpsAddMonths(ts, count) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + count);
  return d.getTime();
}

function aggregateKpsPoints(log, range, now) {
  const sod = kpsStartOfDay(now);
  const cutoff = {
    today: sod,
    '7d': now - 7 * KPS_DAY_MS,
    '30d': now - 30 * KPS_DAY_MS,
    '1y': now - 365 * KPS_DAY_MS,
    all: 0,
  }[range] ?? 0;
  const pts = (log || [])
    .filter((p) => p && p.t >= cutoff)
    .sort((a, b) => a.t - b.t);
  if (range === 'today') return pts.map((p) => ({ t: p.t, kps: p.kps, count: p.count || 1 }));

  const out = [];
  let todaySum = 0, todayCount = 0, todayLast = 0;
  for (const p of pts) {
    const count = p.count || 1;
    if (p.t >= sod) {
      todaySum += p.kps * count;
      todayCount += count;
      todayLast = Math.max(todayLast, p.t);
    } else {
      out.push({ t: p.t, kps: p.kps, count, daily: !!p.daily });
    }
  }
  if (todayCount) {
    out.push({
      t: todayLast || now,
      kps: Math.round((todaySum / todayCount) * 10) / 10,
      count: todayCount,
      daily: true,
      todayAverage: true,
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

function layoutKpsPoints(pts, width, height, reserveDateLabels) {
  const n = pts.length;
  const fewMode = n <= 8;
  const H = height || 220, padL = 12, padR = 12, padT = 20;
  const padB = (fewMode || reserveDateLabels) ? 30 : 12;
  const innerW = Math.max(60, (width || 640) - padL - padR);
  const innerH = H - padT - padB;
  const maxY = Math.max(1, ...pts.map((p) => p.kps)) * 1.18;
  const firstT = n ? pts[0].t : 0;
  const lastT = n ? pts[n - 1].t : firstT;
  const span = Math.max(1, lastT - firstT);
  const xs = pts.map((p, i) => {
    if (n === 1) return padL + innerW / 2;
    if (fewMode) return padL + (i / (n - 1)) * innerW;
    return padL + ((p.t - firstT) / span) * innerW;
  });
  const Y = (k) => padT + innerH - (k / maxY) * innerH;
  return { H, padL, padR, padT, padB, innerW, innerH, maxY, xs, ys: pts.map((p) => Y(p.kps)), fewMode };
}

function kpsLabelIndices(n, maxLabels) {
  if (n <= 0) return [];
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const last = n - 1;
  const out = [];
  for (let i = 0; i < maxLabels; i++) out.push(Math.round((last * i) / (maxLabels - 1)));
  return [...new Set(out)].sort((a, b) => a - b);
}

function kpsMonthLabelTicks(firstT, lastT, maxLabels) {
  if (!Number.isFinite(firstT) || !Number.isFinite(lastT) || firstT > lastT) return [];
  const ticks = [];
  for (let t = kpsStartOfMonth(firstT); t <= lastT; t = kpsAddMonths(t, 1)) {
    const d = new Date(t);
    ticks.push({ t: Math.max(t, firstT), label: `${d.getMonth() + 1}月` });
  }
  if (ticks.length <= maxLabels) return ticks;
  const stride = Math.ceil((ticks.length - 1) / Math.max(1, maxLabels - 1));
  const out = ticks.filter((_, i) => i % stride === 0);
  const last = ticks[ticks.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

window.AnalysisHelpers = { aggregateKpsPoints, layoutKpsPoints, kpsLabelIndices, kpsMonthLabelTicks, kpsStartOfDay };

function KpsChart() {
  const [range, setRange] = useState('7d');
  const wrapRef = useRef(null);
  const [w, setW] = useState(640);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setW(el.clientWidth || 640);
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update); ro.observe(el); return () => ro.disconnect();
    }
  }, []);

  const log = window.Store.getKpsLog();
  const now = Date.now();
  const ranges = [['today', '今日'], ['7d', '7日'], ['30d', '30日'], ['1y', '1年'], ['all', '全期間']];
  const pts = aggregateKpsPoints(log, range, now);

  const n = pts.length;
  const { H, padL, padT, padB, innerW, innerH, maxY, xs, ys, fewMode } = layoutKpsPoints(pts, w, 220, range === '30d' || range === '1y');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = n >= 2 ? `${line} L${xs[n - 1].toFixed(1)},${padT + innerH} L${xs[0].toFixed(1)},${padT + innerH} Z` : '';
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + innerH - f * innerH);
  const runs = pts.reduce((a, p) => a + (p.count || 1), 0);
  const wsum = pts.reduce((a, p) => a + p.kps * (p.count || 1), 0);
  const avg = runs ? wsum / runs : 0;
  const max = n ? Math.max(...pts.map((p) => p.kps)) : 0;
  const dotR = n <= 2 ? 7 : n <= 5 ? 6 : n <= 8 ? 5 : n <= 15 ? 4 : n <= 40 ? 3 : 2.2;
  const lineW = n <= 8 ? 3 : n <= 20 ? 2.5 : 2;
  const showValueLabels = n <= 8;
  const showDateLabels = (showValueLabels && range !== '1y') || range === '30d';
  const dateLabelIndices = new Set(showDateLabels ? kpsLabelIndices(n, range === '30d' ? 7 : n) : []);
  const monthMaxLabels = Math.max(3, Math.min(8, Math.floor(innerW / 86)));
  const monthTicks = (range === '1y' && n >= 1) ? kpsMonthLabelTicks(pts[0].t, pts[n - 1].t, monthMaxLabels) : [];
  const xForTime = (t) => {
    if (n <= 1) return padL + innerW / 2;
    const firstT = pts[0].t;
    const lastT = pts[n - 1].t;
    const span = Math.max(1, lastT - firstT);
    return padL + ((Math.max(firstT, Math.min(lastT, t)) - firstT) / span) * innerW;
  };
  const fmtX = (t) => {
    const d = new Date(t);
    return range === 'today'
      ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
      : `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const dateAnchor = (i) => (i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'));
  const tickAnchor = (x) => (x <= padL + 1 ? 'start' : (x >= padL + innerW - 1 ? 'end' : 'middle'));

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 16 }}>
        <span>KPSの推移 <span style={{ color: 'var(--faint)', fontWeight: 400 }}>{runs}回</span></span>
        <span className="seg chart-seg">
          {ranges.map(([v, l]) => (
            <button key={v} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>
          ))}
        </span>
      </h3>
      {n < 1 ? (
        <div className="empty-state" style={{ padding: '44px 0' }}>この期間の記録はまだありません。</div>
      ) : (
        <>
          <div ref={wrapRef} style={{ position: 'relative' }}>
            <svg width={w} height={H} style={{ display: 'block', overflow: 'visible' }}>
              <defs>
                <linearGradient id="kpsgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {grid.map((gy, i) => (
                <line key={i} x1={padL} x2={padL + innerW} y1={gy} y2={gy} stroke="var(--border-soft)" strokeWidth="1" />
              ))}
              <text x={padL} y={padT - 7} fill="var(--faint)" fontSize="11" fontFamily="var(--font-mono)">{maxY.toFixed(0)} /秒</text>
              {area && <path d={area} fill="url(#kpsgrad)" />}
              {n >= 2 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth={lineW} strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={xs[i]} cy={ys[i]} r={dotR} fill="var(--accent)" stroke="var(--surface)" strokeWidth={n <= 15 ? 1.5 : 0} />
                  {showValueLabels && (
                    <text x={xs[i]} y={ys[i] - dotR - 6} textAnchor="middle" fill="var(--text)" fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">{p.kps.toFixed(1)}</text>
                  )}
                  {showDateLabels && dateLabelIndices.has(i) && (
                    <text x={xs[i]} y={padT + innerH + 18} textAnchor={dateAnchor(i)} fill="var(--faint)" fontSize="10.5" fontFamily="var(--font-mono)">{fmtX(p.t)}</text>
                  )}
                </g>
              ))}
              {monthTicks.map((tick, i) => {
                const x = xForTime(tick.t);
                return (
                  <text key={'m' + i} x={x} y={padT + innerH + 18} textAnchor={tickAnchor(x)} fill="var(--faint)" fontSize="10.5" fontFamily="var(--font-mono)">{tick.label}</text>
                );
              })}
            </svg>
          </div>
          <div className="chart-stats">
            <span>期間平均 <b>{avg.toFixed(1)}</b><i> /秒</i></span>
            <span>期間最高 <b>{max.toFixed(1)}</b><i> /秒</i></span>
          </div>
        </>
      )}
    </div>
  );
}

function Analysis({ onReset }) {
  const a = window.Store.getAnalysis();
  const byKey = a.byKey, byKana = a.byKana, pairs = a.pairs, slow = a.slow;

  const rows = [
    'qwertyuiop'.split(''),
    'asdfghjkl'.split(''),
    'zxcvbnm'.split(''),
  ];
  const maxKey = Math.max(1, ...Object.values(byKey));

  const kanaTop = Object.entries(byKana).sort((x, y) => y[1] - x[1]).slice(0, 8);
  const maxKana = kanaTop.length ? kanaTop[0][1] : 1;
  const pairTop = Object.entries(pairs).sort((x, y) => y[1] - x[1]).slice(0, 6);

  // 入力が遅い文字 TOP10（平均反応時間、最低2回出現）
  const slowList = Object.entries(slow)
    .map(([kana, s]) => ({ kana, avg: s.sum / s.count, count: s.count }))
    .filter((x) => x.count >= 2)
    .sort((x, y) => y.avg - x.avg)
    .slice(0, 10);
  const maxSlow = slowList.length ? slowList[0].avg : 1;

  function keyStyle(kk) {
    const n = byKey[kk] || 0;
    if (!n) return {};
    const tt = n / maxKey;
    return {
      background: `color-mix(in oklab, var(--bad) ${Math.round(18 + tt * 62)}%, var(--surface-2))`,
      borderColor: `color-mix(in oklab, var(--bad) ${Math.round(30 + tt * 50)}%, var(--border))`,
      color: tt > 0.45 ? '#1a120f' : 'var(--text)',
    };
  }

  if (a.runCount === 0) {
    return (
      <div className="analysis fade">
        <div className="analysis-head">
          <h2>打鍵の分析</h2>
          <p>直近500回の記録から、苦手な打鍵と入力の遅さを可視化します。</p>
        </div>
        <div className="empty-state">
          <div className="big">◎</div>
          まだ記録がありません。<br />モードに挑戦すると、ここに傾向が表示されます。
        </div>
      </div>
    );
  }

  return (
    <div className="analysis fade">
      <div className="analysis-head">
        <h2>打鍵の分析</h2>
        <p>
          KPSの推移は全期間、その他は直近 <b style={{ color: 'var(--text)' }}>{a.runCount}</b> 回の記録から集計（最大500回）。
          色が濃いキーほど打ち間違えています。
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <KpsChart />
      </div>

      <div className="heat-grid">
        <div className="panel">
          <h3>キーボード・ヒートマップ</h3>
          {a.totalMiss === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="big">◎</div>ミスはまだ記録されていません
            </div>
          ) : (
            <div className="keyboard">
              {rows.map((row, ri) => (
                <div className="kbrow" key={ri} style={{ paddingLeft: ri * 16 }}>
                  {row.map((kk) => (
                    <div className="key" key={kk} style={keyStyle(kk)}>
                      {kk}
                      {byKey[kk] ? <span className="kn">{byKey[kk]}</span> : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 12 }}>よくある取り違え</h3>
            {pairTop.length === 0 && <div className="empty-state" style={{ padding: '10px 0' }}>—</div>}
            {pairTop.map(([pair, n]) => {
              const parts = pair.split('>');
              return (
                <div className="bar-row" key={pair}>
                  <span className="k"><b style={{ color: 'var(--text)' }}>{parts[0]}</b> を {parts[1] || '∅'}</span>
                  <span className="track"><i style={{ width: (n / pairTop[0][1] * 100) + '%' }}></i></span>
                  <span className="n">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <h3>入力が遅い文字 <span style={{ color: 'var(--faint)', fontWeight: 400 }}>TOP10</span></h3>
          {slowList.length === 0 && (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              データが貯まると、打ち始めに時間がかかる文字を表示します。
            </div>
          )}
          <div className="kana-miss">
            {slowList.map((x, i) => (
              <div className="bar-row" key={x.kana}>
                <span className="k" style={{ fontSize: 20, fontFamily: 'var(--font-ja)', width: 44 }}>{x.kana}</span>
                <span className="track"><i style={{ width: (x.avg / maxSlow * 100) + '%', background: 'var(--accent)' }}></i></span>
                <span className="n" style={{ width: 56 }}>{(x.avg / 1000).toFixed(2)}秒</span>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24, marginBottom: 12 }}>苦手な文字（ミス）</h3>
          {kanaTop.length === 0 && <div className="empty-state" style={{ padding: '10px 0' }}>—</div>}
          <div className="kana-miss">
            {kanaTop.map(([kana, n]) => (
              <div className="bar-row" key={kana}>
                <span className="k" style={{ fontSize: 20, fontFamily: 'var(--font-ja)', width: 44 }}>{kana}</span>
                <span className="track"><i style={{ width: (n / maxKana * 100) + '%' }}></i></span>
                <span className="n">{n}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <button className="danger-link" onClick={onReset}>分析データをリセット</button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Analysis = Analysis;
