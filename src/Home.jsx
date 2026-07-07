/* Home.jsx — モード選択 */
function Home({ onPick }) {
  const { MODES, CATEGORIES, modeCharCount } = window.CONTENT;
  const Store = window.Store;

  return (
    <div className="fade">
      <div className="home-head">
        <h1>打って、<span className="accent">整える</span>。</h1>
        <p>ローマ字でひらがなを入力する、静かなタイピング道場。モードを選んで、文章を最後まで打ち切りましょう。</p>
      </div>

      {CATEGORIES.map((cat) => (
        <div className="cat" key={cat}>
          <div className="cat-title">{cat}</div>
          <div className="mode-grid">
            {MODES.filter((m) => m.category === cat).map((m) => {
              const best = Store.bestKpm(m.id);
              const recs = Store.getRecords(m.id);
              return (
                <button className="mode-card" key={m.id} onClick={() => onPick(m)}>
                  <span className="glyph">{m.icon}</span>
                  <div className="mname">{m.name}</div>
                  <div className="mdesc">{m.desc}</div>
                  <div className="mstats">
                    <span>約{modeCharCount(m)}字</span>
                    <span className="best">最高 <b>{best || '—'}</b></span>
                    <span>{recs.length ? `${recs.length}回` : '未挑戦'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

window.Home = Home;
