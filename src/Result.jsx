/* Result.jsx — 結果表示 */
function Result({ mode, result, saved, records, onRetry, onHome, onAnalysis }) {
  const top5 = records.slice(0, 5);
  const bestKpm = records.reduce((m, r) => Math.max(m, r.kpm), 0);

  // この回のミス（pairs）を多い順に
  const pairs = Object.entries(result.mistakes.pairs || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxPair = pairs.length ? pairs[0][1] : 1;

  const delta = saved.prevBest ? result.kpm - saved.prevBest : 0;

  return (
    <div className="result fade">
      <div className="result-head">
        <div className="ribbon">result</div>
        <h2><span className="modename">{mode.name}</span> を打ち切りました</h2>
        {saved.isBest && (
          <div className="newrecord">★ 最高記録を更新！{saved.prevBest ? ` +${delta} KPM` : ''}</div>
        )}
      </div>

      <div className="score-grid">
        <div className="score-card hero">
          <div className="label">KPM</div>
          <div className="value">{result.kpm}</div>
          <div className="delta">
            {saved.isBest ? '自己ベスト' : `自己ベスト ${bestKpm}`}
          </div>
        </div>
        <div className="score-card">
          <div className="label">平均速度 KPS</div>
          <div className="value">{result.kps}<span className="unit">/秒</span></div>
          <div className="delta">{result.time} 秒</div>
        </div>
        <div className="score-card">
          <div className="label">正解入力</div>
          <div className="value">{result.correct}</div>
          <div className="delta">正確率 {result.acc}%</div>
        </div>
        <div className="score-card">
          <div className="label">ミスタイプ</div>
          <div className="value" style={{ color: result.miss ? 'var(--bad)' : 'var(--good)' }}>{result.miss}</div>
          <div className="delta">{result.miss === 0 ? 'ノーミス！' : `${result.correct + result.miss} 打鍵中`}</div>
        </div>
      </div>

      <div className="result-cols">
        <div className="panel">
          <h3>過去の記録（直近5回）</h3>
          {top5.length === 0 && <div className="empty-state" style={{ padding: '20px 0' }}>まだ記録がありません</div>}
          {top5.map((r, i) => (
            <div className={'history-row' + (r.kpm === bestKpm && r.kpm > 0 ? ' best' : '')} key={i}>
              <span className="rank">{r.kpm === bestKpm && r.kpm > 0 ? '★' : i + 1}</span>
              <span className="date">{window.fmtDate(r.date)}</span>
              <span className="kpm">{r.kpm} KPM</span>
              <span className="acc">{r.acc}%</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>
            <span>この回の苦手な打鍵</span>
            <span className="more" onClick={onAnalysis}>全体の分析 →</span>
          </h3>
          {pairs.length === 0 && (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="big">◎</div>ミスはありませんでした
            </div>
          )}
          {pairs.map(([pair, n]) => {
            const [exp, got] = pair.split('>');
            return (
              <div className="bar-row" key={pair}>
                <span className="k"><b style={{ color: 'var(--text)' }}>{exp}</b> ← {got || '∅'}</span>
                <span className="track"><i style={{ width: (n / maxPair * 100) + '%' }}></i></span>
                <span className="n">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="actions">
        <button className="btn ghost" onClick={onHome}>モード選択</button>
        <button className="btn primary" onClick={onRetry}>もう一度</button>
      </div>
    </div>
  );
}

window.Result = Result;
