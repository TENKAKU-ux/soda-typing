/* romaji.js — ローマ字 → ひらがな タイピング判定エンジン
 * window.Romaji を公開。
 *  - buildChunks(hiragana): タイピング単位の配列を作る
 *  - createMatcher(hiragana): キーストロークを一文字ずつ判定するステートマシン
 * 柔軟な打ち方に対応:
 *  - し = shi / si、つ = tsu / tu、じ = ji / zi、ふ = fu / hu …
 *  - ん = n（次が子音のとき）/ nn
 *  - っ = 次の子音を重ねる / ltu / xtu
 *  - 拗音 きゃ / しゃ / ちゃ / じゃ …
 */
(function () {
  // --- 基本の単音表 (ひらがな -> 許容ローマ字) ---
  const BASE = {
    'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu', 'whu'], 'え': ['e'], 'お': ['o'],
    'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'ゐ': ['wi'], 'ゑ': ['we'], 'を': ['wo'],
    'ゔ': ['vu'],
    'ぁ': ['la', 'xa'], 'ぃ': ['li', 'xi'], 'ぅ': ['lu', 'xu'], 'ぇ': ['le', 'xe'], 'ぉ': ['lo', 'xo'],
    'ゃ': ['lya', 'xya'], 'ゅ': ['lyu', 'xyu'], 'ょ': ['lyo', 'xyo'], 'ゎ': ['lwa', 'xwa'],
    'ー': ['-'], '、': [',', '、'], '。': ['.', '。'], '・': ['/'],
    '！': ['!'], '？': ['?'], '「': ['['], '」': [']'],
    '　': [' '], ' ': [' '],
  };

  // --- 拗音・特殊な2文字以上の組み合わせ ---
  const COMBO = {
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'], 'きぇ': ['kye'], 'きぃ': ['kyi'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'], 'しぇ': ['she', 'sye'],
    'じゃ': ['ja', 'jya', 'zya'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じょ': ['jo', 'jyo', 'zyo'], 'じぇ': ['je', 'jye'],
    'ちゃ': ['cha', 'tya', 'cya'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちょ': ['cho', 'tyo', 'cyo'], 'ちぇ': ['che', 'tye'],
    'ぢゃ': ['dya'], 'ぢゅ': ['dyu'], 'ぢょ': ['dyo'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'てゃ': ['tha'], 'てぃ': ['thi'], 'てゅ': ['thu'], 'てぇ': ['the'], 'てょ': ['tho'],
    'でゃ': ['dha'], 'でぃ': ['dhi'], 'でゅ': ['dhu'], 'でぇ': ['dhe'], 'でょ': ['dho'],
    'とぅ': ['twu'], 'どぅ': ['dwu'],
    'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'], 'ふゅ': ['fyu'],
    'うぁ': ['wha'], 'うぃ': ['wi', 'whi'], 'うぇ': ['we', 'whe'], 'うぉ': ['who'],
    'ゔぁ': ['va'], 'ゔぃ': ['vi'], 'ゔぇ': ['ve'], 'ゔぉ': ['vo'],
    'つぁ': ['tsa'], 'つぃ': ['tsi'], 'つぇ': ['tse'], 'つぉ': ['tso'],
    'くぁ': ['qa', 'kwa'], 'くぃ': ['qi'], 'くぇ': ['qe'], 'くぉ': ['qo'],
  };

  const SMALL_Y = new Set(['ゃ', 'ゅ', 'ょ']);
  const SMALL_V = new Set(['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']);
  const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);

  function isComboHead(ch) {
    return 'きぎしじちぢにひびぴみりてでとどふうゔつく'.indexOf(ch) >= 0;
  }

  // ひらがな文字列をチャンク（タイピング単位）に分解
  function buildChunks(text) {
    const chunks = [];
    const arr = Array.from(text);
    let i = 0;
    while (i < arr.length) {
      const ch = arr[i];
      const next = arr[i + 1];

      // 拗音/特殊2文字
      if (next && isComboHead(ch) && (SMALL_Y.has(next) || SMALL_V.has(next))) {
        const key = ch + next;
        if (COMBO[key]) {
          chunks.push({ kana: key, romajis: COMBO[key].slice(), type: 'normal' });
          i += 2;
          continue;
        }
      }

      // 促音 っ
      if (ch === 'っ') {
        chunks.push({ kana: 'っ', romajis: null, type: 'sokuon' });
        i += 1;
        continue;
      }

      // 撥音 ん
      if (ch === 'ん') {
        chunks.push({ kana: 'ん', romajis: ['nn', 'xn'], type: 'n' });
        i += 1;
        continue;
      }

      if (BASE[ch]) {
        chunks.push({ kana: ch, romajis: BASE[ch].slice(), type: 'normal' });
      } else {
        // 未知の文字はそのまま打つ
        chunks.push({ kana: ch, romajis: [ch], type: 'literal' });
      }
      i += 1;
    }

    // 促音のローマ字を後続チャンクから解決（子音重ね）
    for (let k = 0; k < chunks.length; k++) {
      if (chunks[k].type !== 'sokuon') continue;
      const nx = chunks[k + 1];
      const opts = new Set(['ltu', 'xtu', 'ltsu']);
      if (nx && nx.romajis) {
        nx.romajis.forEach((r) => {
          const c = r[0];
          if (c && !VOWELS.has(c) && c !== 'n') opts.add(c);
        });
      }
      chunks[k].romajis = Array.from(opts);
    }
    return chunks;
  }

  const CONSONANTS = new Set('bcdfghjkmpqrstvwxz'.split('')); // n,y を除く

  // キーストローク判定マシン
  function createMatcher(text) {
    const chunks = buildChunks(text);
    let ci = 0;          // 現在のチャンク
    let buf = '';        // 現在チャンクに入力済みのローマ字

    function curChunk() { return chunks[ci]; }

    // チャンク k の表示用ローマ字（「ん」は文脈で n / nn を切替）
    function dispRomaji(kk) {
      const c = chunks[kk];
      if (!c) return '';
      if (c.type === 'n') {
        const nx = chunks[kk + 1];
        const first = nx ? ((nx.type === 'n' ? 'n' : (nx.romajis[0] || ''))[0] || '') : '';
        return (first && CONSONANTS.has(first)) ? 'n' : 'nn';
      }
      return c.romajis[0] || '';
    }

    // 現在チャンクで「次に打つべき」正解の文字（表示用ヒント）
    function expectedChar() {
      const c = chunks[ci];
      if (!c) return '';
      let opt;
      if (c.type === 'n') opt = dispRomaji(ci);
      else { const cand = c.romajis.filter((r) => r.startsWith(buf)); opt = (cand[0] || c.romajis[0] || ''); }
      return opt[buf.length] || '';
    }

    // 残りのローマ字（ゴースト表示用）
    function remainingRomaji() {
      let out = '';
      const c = chunks[ci];
      if (c) {
        let opt;
        if (c.type === 'n') opt = dispRomaji(ci);
        else { const cand = c.romajis.filter((r) => r.startsWith(buf)); opt = (cand[0] || c.romajis[0] || ''); }
        out += opt.slice(buf.length);
      }
      for (let k = ci + 1; k < chunks.length; k++) {
        out += dispRomaji(k);
      }
      return out;
    }

    function advance() { ci += 1; buf = ''; }

    // 1キー入力。戻り値: { ok, done, chunkDone, expectedBefore }
    function input(key) {
      const c = chunks[ci];
      if (!c) return { ok: false, done: true, chunkDone: false };
      const before = expectedChar();
      const cand = buf + key;

      // ん の特殊処理: buf が "n" で確定可能なケース
      if (c.type === 'n' && buf === 'n') {
        // 次が子音 → 単独 n で確定し、このキーを次チャンクへ
        if (CONSONANTS.has(key)) {
          advance();
          return inputResolve(key, before, true);
        }
        // n + n → nn 確定
        if (key === 'n') {
          advance();
          const last = ci >= chunks.length;
          return { ok: true, done: last, chunkDone: true, kana: 'ん', expectedBefore: before };
        }
        // 母音や y は nn 必須 → ミス
        return { ok: false, done: false, chunkDone: false, kana: 'ん', expectedBefore: before };
      }

      const matches = c.romajis.filter((r) => r.startsWith(cand));
      if (matches.length > 0) {
        buf = cand;
        const exact = matches.find((r) => r === cand);
        // 完全一致かつ、より長い候補が無ければチャンク確定
        const hasLonger = matches.some((r) => r.length > cand.length);
        if (exact && !hasLonger) {
          const kana = c.kana;
          advance();
          const last = ci >= chunks.length;
          return { ok: true, done: last, chunkDone: true, kana, expectedBefore: before };
        }
        return { ok: true, done: false, chunkDone: false, kana: c.kana, expectedBefore: before };
      }

      // buf が既に完全一致の候補なら、チャンクを確定して次へ持ち越し
      const exactNow = c.romajis.find((r) => r === buf);
      if (exactNow) {
        advance();
        return inputResolve(key, before, true);
      }

      return { ok: false, done: false, chunkDone: false, kana: c.kana, expectedBefore: before };
    }

    // 持ち越しキーを次チャンクで再評価
    function inputResolve(key, before, carried) {
      const c = chunks[ci];
      if (!c) return { ok: false, done: true, chunkDone: false, expectedBefore: before };
      const matches = c.romajis.filter((r) => r.startsWith(key));
      if (matches.length > 0) {
        buf = key;
        const exact = matches.find((r) => r === key);
        const hasLonger = matches.some((r) => r.length > key.length);
        if (exact && !hasLonger) {
          const kana = c.kana;
          advance();
          const last = ci >= chunks.length;
          return { ok: true, done: last, chunkDone: true, kana, expectedBefore: before };
        }
        return { ok: true, done: false, chunkDone: false, kana: c.kana, expectedBefore: before };
      }
      return { ok: false, done: false, chunkDone: false, kana: c.kana, expectedBefore: before };
    }

    return {
      input,
      expectedChar,
      remainingRomaji,
      get index() { return ci; },
      get total() { return chunks.length; },
      get chunks() { return chunks; },
      get buffer() { return buf; },
      isDone() { return ci >= chunks.length; },
    };
  }

  // ひらがな文字列を代表的なローマ字へ（ふりがな/表示用）。「ん」は文脈で n/nn。
  function toRomaji(text) {
    const chunks = buildChunks(text);
    return chunks.map((c, kk) => {
      if (c.type === 'n') {
        const nx = chunks[kk + 1];
        const first = nx ? ((nx.type === 'n' ? 'n' : (nx.romajis[0] || ''))[0] || '') : '';
        return (first && CONSONANTS.has(first)) ? 'n' : 'nn';
      }
      return c.romajis[0] || '';
    }).join('');
  }

  window.Romaji = { buildChunks, createMatcher, toRomaji, BASE, COMBO };
})();
