/* app.jsx — メインアプリ + Tweaks */
const { Home, Game, Result, Analysis, Settings, Topbar, Store } = window;

const THEMES = {
  sumi: {
    dark:  { bg: '#14110e', 'bg-grad': '#1a1611', surface: '#1d1915', 'surface-2': '#25201a', border: '#322b23', 'border-soft': '#2a241e', text: '#ece4d8', muted: '#9d9485', faint: '#6b6356' },
    light: { bg: '#f4f0e8', 'bg-grad': '#efe9dd', surface: '#fdfbf6', 'surface-2': '#f3eee4', border: '#ddd4c4', 'border-soft': '#e9e2d4', text: '#2a241c', muted: '#6e6457', faint: '#a99d8b' },
  },
  ai: {
    dark:  { bg: '#0e1118', 'bg-grad': '#131826', surface: '#161b27', 'surface-2': '#1d2433', border: '#283143', 'border-soft': '#222a3a', text: '#dde4f0', muted: '#8893a8', faint: '#5b6478' },
    light: { bg: '#eef2f8', 'bg-grad': '#e3e9f4', surface: '#ffffff', 'surface-2': '#eef2f8', border: '#d3dbe8', 'border-soft': '#e4e9f2', text: '#1b2436', muted: '#58637a', faint: '#97a2b6' },
  },
  mori: {
    dark:  { bg: '#0e1311', 'bg-grad': '#121b17', surface: '#151c19', 'surface-2': '#1c2622', border: '#28332e', 'border-soft': '#222b27', text: '#e2e8e2', muted: '#8a988f', faint: '#5d6a62' },
    light: { bg: '#eef3ef', 'bg-grad': '#e6efe8', surface: '#fbfdfb', 'surface-2': '#eef3ef', border: '#cfdcd4', 'border-soft': '#e0e9e3', text: '#1d2a23', muted: '#56655c', faint: '#93a499' },
  },
  koku: {
    dark:  { bg: '#0a0a0b', 'bg-grad': '#111113', surface: '#141416', 'surface-2': '#1b1b1e', border: '#2a2a2e', 'border-soft': '#202024', text: '#ededf0', muted: '#9a9aa2', faint: '#62626a' },
    light: { bg: '#f3f4f6', 'bg-grad': '#ebedf1', surface: '#ffffff', 'surface-2': '#f2f3f6', border: '#d8dbe2', 'border-soft': '#e7e9ee', text: '#16171a', muted: '#585b63', faint: '#9aa0ab' },
  },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "ai",
  "accent": "#d9603b",
  "texture": "glow",
  "guide": "normal"
}/*EDITMODE-END*/;

function applyTheme(t, appearance) {
  const root = document.documentElement;
  const set = THEMES[t.theme] || THEMES.ai;
  const pal = set[appearance] || set.dark;
  for (const k in pal) root.style.setProperty('--' + k, pal[k]);
  root.style.setProperty('--accent', t.accent);
  document.body.className = (t.texture === 'flat' ? 'flat' : (t.texture === 'washi' ? 'washi' : ''))
    + (appearance === 'light' ? ' light' : '');
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('home');
  const [settings, setSettings] = useState(Store.getSettings());
  const [mode, setMode] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState({ isBest: false, prevBest: 0 });
  const [records, setRecords] = useState([]);
  const [runSentences, setRunSentences] = useState([]);

  useEffect(() => { applyTheme(t, settings.appearance); }, [t.theme, t.accent, t.texture, settings.appearance]);

  function changeSetting(k, v) {
    Store.setSetting(k, v);
    setSettings(Object.assign({}, Store.getSettings()));
  }

  function pick(m) { setMode(m); setRunSentences(window.CONTENT.pickRun(m)); setAttempt((a) => a + 1); setScreen('game'); }
  function retry() { setRunSentences(window.CONTENT.pickRun(mode)); setAttempt((a) => a + 1); setScreen('game'); }

  function finish(res) {
    const rec = { date: Date.now(), kpm: res.kpm, kps: res.kps, correct: res.correct, miss: res.miss, acc: res.acc, time: res.time };
    const info = Store.addRecord(mode.id, rec, res.mistakes, res.slow);
    setResult(res);
    setSaved(info);
    setRecords(Store.getRecords(mode.id));
    setScreen('result');
  }

  function resetAll() {
    if (confirm('すべての記録と分析データを消去します。よろしいですか？')) {
      Store.resetAll();
      setSettings(Object.assign({}, Store.getSettings()));
      setScreen('home');
    }
  }
  function resetMistakes() {
    if (confirm('分析データ（直近の記録）を消去します。よろしいですか？')) {
      Store.resetAnalysis();
      setScreen('home'); setTimeout(() => setScreen('analysis'), 0);
    }
  }

  return (
    <div className="app">
      <Topbar screen={screen} go={setScreen} modeName={mode && mode.name} />

      <div className="screen">
        {screen === 'home' && <Home onPick={pick} />}
        {screen === 'game' && (
          <Game
            key={mode.id + '-' + attempt}
            mode={mode}
            sentences={runSentences}
            settings={settings}
            guide={t.guide}
            onFinish={finish}
            onQuit={() => setScreen('home')}
          />
        )}
        {screen === 'result' && (
          <Result
            mode={mode}
            result={result}
            saved={saved}
            records={records}
            onRetry={retry}
            onHome={() => setScreen('home')}
            onAnalysis={() => setScreen('analysis')}
          />
        )}
        {screen === 'analysis' && <Analysis onReset={resetMistakes} />}
        {screen === 'settings' && (
          <Settings settings={settings} onChange={changeSetting} onResetAll={resetAll} />
        )}
      </div>

      <TweaksPanel>
        <TweakSection label="テーマ" />
        <TweakRadio
          label="配色" value={t.theme}
          options={[{ value: 'sumi', label: '墨' }, { value: 'ai', label: '藍' }, { value: 'mori', label: '森' }, { value: 'koku', label: '漆黒' }]}
          onChange={(v) => setTweak('theme', v)}
        />
        <TweakColor
          label="アクセント色" value={t.accent}
          options={['#d9603b', '#3aa6a0', '#d6a64a', '#e0789a', '#7d8ad6']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSelect
          label="背景の質感" value={t.texture}
          options={[{ value: 'glow', label: 'グロー' }, { value: 'flat', label: 'フラット' }, { value: 'washi', label: '和紙' }]}
          onChange={(v) => setTweak('texture', v)}
        />
        <TweakSection label="ゲーム表示" />
        <TweakRadio
          label="ローマ字ガイド" value={t.guide}
          options={[{ value: 'normal', label: '表示' }, { value: 'subtle', label: '控えめ' }, { value: 'off', label: 'なし' }]}
          onChange={(v) => setTweak('guide', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
