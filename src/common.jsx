/* common.jsx — 共通部品とヘルパ
 * React フック(useState 等)は index.html で window に載せた global を参照する。 */

function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ふりがな付きの文を描画。打ち終えたよみに応じて1文字ずつ淡くなる。
// furigana: 'hiragana' | 'romaji' | 'both' | 'off'
function Sentence({ segments, furigana, doneChars, mincho, long }) {
  const boxRef = useRef(null);
  const curRef = useRef(null);
  // 長文モードでは、いま打っている位置が常に見えるよう自動スクロール。
  // 全文を一度に出さず「読む窓」だけ表示し、手動スクロールで全文を覗ける。
  useLayoutEffect(() => {
    if (!long) return;
    const box = boxRef.current, el = curRef.current;
    if (!box || !el) return;
    const target = el.offsetTop - box.clientHeight * 0.4 + el.offsetHeight * 0.5;
    box.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  });
  let acc = 0;
  return (
    <div ref={boxRef} className={'sentence' + (mincho ? ' mincho' : '') + (long ? ' long' : '')}>
      {segments.map((seg, i) => {
        const [text, reading] = seg;
        const start = acc;
        acc += reading.length;
        const end = acc;
        const isKana = text === reading;
        const showHira = (furigana === 'hiragana' || furigana === 'both') && !isKana;
        const showRoma = (furigana === 'romaji' || furigana === 'both');
        const rt = furigana === 'romaji'
          ? window.Romaji.toRomaji(reading)
          : (showHira ? reading : (showRoma ? window.Romaji.toRomaji(reading) : ''));
        const needRuby = (showHira || showRoma) && rt;

        // セグメント内の進捗を文字単位にマッピング（よみ→表示文字へ比例配分）
        const chars = Array.from(text);
        const N = chars.length || 1;
        const p = Math.max(0, Math.min(1, (doneChars - start) / Math.max(1, reading.length)));
        const isCurrentSeg = doneChars >= start && doneChars < end;
        const curIdx = isCurrentSeg ? Math.min(N - 1, Math.floor(p * N)) : -1;
        const spans = chars.map((ch, j) => {
          const done = (j + 1) / N <= p + 1e-6;
          const cur = !done && j === curIdx;
          const st = { transition: 'color .2s ease, opacity .2s ease' };
          if (done) { st.color = 'var(--faint)'; st.opacity = 0.38; }
          else if (cur) { st.color = 'var(--accent)'; }
          return <span key={j} ref={cur ? curRef : null} style={st}>{ch}</span>;
        });

        if (needRuby) {
          return <ruby key={i}>{spans}<rt style={{ opacity: p >= 1 ? 0.32 : 1, transition: 'opacity .2s ease' }}>{rt}</rt></ruby>;
        }
        return <span key={i} className="word">{spans}</span>;
      })}
    </div>
  );
}

// ローマ字の流れるストリーム（入力済みの文字は残さず、次の入力位置だけを追う）
function RomajiStream({ typed, current, rest, error }) {
  const innerRef = useRef(null);
  const cursorRef = useRef(null);
  const wrapRef = useRef(null);
  useLayoutEffect(() => {
    const wrap = wrapRef.current, cur = cursorRef.current, inner = innerRef.current;
    if (!wrap || !cur || !inner) return;
    const target = wrap.clientWidth * 0.34;
    const left = cur.offsetLeft;
    inner.style.transform = `translateX(${Math.round(target - left)}px)`;
  });
  return (
    <div className="romaji-stream" ref={wrapRef}>
      <div className="rs-inner" ref={innerRef}>
        <span className="typed" aria-hidden="true"></span>
        <span className={'cursor' + (error ? ' err' : '')} ref={cursorRef}>{current}</span>
        <span className="rest">{rest}</span>
      </div>
    </div>
  );
}

function Topbar({ screen, go, modeName }) {
  const tabs = [
    ['home', 'モード'],
    ['analysis', '分析'],
    ['settings', '設定'],
  ];
  return (
    <div className="topbar">
      <div className="brand">
        <span className="logo">速<span className="dot">・</span>打</span>
        <span className="sub">sokuda typing</span>
      </div>
      {screen !== 'game' && screen !== 'result' && (
        <div className="nav">
          {tabs.map(([id, label]) => (
            <button key={id} className={screen === id ? 'active' : ''} onClick={() => go(id)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {(screen === 'game' || screen === 'result') && (
        <div className="nav">
          <button onClick={() => go('home')}>← モード選択</button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { fmtDate, Sentence, RomajiStream, Topbar });
