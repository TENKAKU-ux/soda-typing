/* Settings.jsx — ふりがな等の設定 */
function Settings({ settings, onChange, onResetAll }) {
  const sample = [['桜', 'さくら'], ['の', 'の'], ['花', 'はな'], ['が', 'が'], ['咲く', 'さく']];

  const Seg = ({ value, options, onSel }) => (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onSel(v)}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="settings fade">
      <h2>設定</h2>
      <p className="lead">表示の好みを調整します。設定は自動で保存されます。</p>

      <div className="set-row">
        <div className="info">
          <div className="t">外観モード</div>
          <div className="d">ダーク／ライトを切り替えます。</div>
        </div>
        <Seg
          value={settings.appearance || 'dark'}
          options={[['dark', 'ダーク'], ['light', 'ライト']]}
          onSel={(v) => onChange('appearance', v)}
        />
      </div>

      <div className="set-row">
        <div className="info">
          <div className="t">ふりがなの種類</div>
          <div className="d">問題文の上に表示する読みがな。</div>
        </div>
        <Seg
          value={settings.furigana}
          options={[['hiragana', 'ひらがな'], ['romaji', 'ローマ字'], ['both', '両方'], ['off', 'なし']]}
          onSel={(v) => onChange('furigana', v)}
        />
      </div>

      <div className="set-row">
        <div className="info">
          <div className="t">問題文の書体</div>
          <div className="d">明朝体にすると、より落ち着いた佇まいに。</div>
        </div>
        <Seg
          value={settings.mincho ? 'mincho' : 'gothic'}
          options={[['gothic', 'ゴシック'], ['mincho', '明朝']]}
          onSel={(v) => onChange('mincho', v === 'mincho')}
        />
      </div>

      <div className="set-row">
        <div className="info">
          <div className="t">打鍵音</div>
          <div className="d">入力時に控えめなクリック音を鳴らします。</div>
        </div>
        <Seg
          value={settings.sound ? 'on' : 'off'}
          options={[['on', 'オン'], ['off', 'オフ']]}
          onSel={(v) => onChange('sound', v === 'on')}
        />
      </div>

      <div className="fg-preview">
        <Sentence segments={sample} furigana={settings.furigana} doneChars={0} mincho={settings.mincho} />
      </div>

      <div className="set-row" style={{ marginTop: 12 }}>
        <div className="info">
          <div className="t">記録のリセット</div>
          <div className="d">全モードのスコア・分析データを消去します。元に戻せません。</div>
        </div>
        <button className="danger-link" onClick={onResetAll}>すべて消去</button>
      </div>
    </div>
  );
}

window.Settings = Settings;
