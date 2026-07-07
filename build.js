// build.js — オフライン用 renderer/ を生成する。
//   1) plain JS をコピー
//   2) JSX を React.createElement へ事前コンパイル（実行時 Babel 不要）
//   3) styles.css をコピー
//   4) React / ReactDOM をローカル同梱
//   5) Google Fonts をダウンロードしてローカル化（ネット不要に）
//   6) index.html を生成（全部ふつうの <script> で読む → file:// で動く）
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const SRC = path.resolve(__dirname, 'src');
const OUT = path.resolve(__dirname, 'renderer');
const VENDOR = path.join(OUT, 'vendor');
const FONTS = path.join(OUT, 'fonts');

const PLAIN_JS = ['romaji.js', 'content.js', 'storage.js', 'sound.js'];
// 読み込み順は元 HTML と同じ
const JSX = ['tweaks-panel.jsx', 'common.jsx', 'Home.jsx', 'Game.jsx', 'Result.jsx', 'Analysis.jsx', 'Settings.jsx', 'app.jsx'];

const REACT_URL = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
const REACTDOM_URL = 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
const FONTS_CSS_URL = 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Shippori+Mincho:wght@500;600;700&family=Roboto+Mono:wght@400;500&display=swap';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function download(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  // vendor/ と fonts/ はサイズが大きく内容も不変なので、存在すれば再利用する
  // （--clean で全再取得）。コンパイル成果物は毎回上書きする。
  const clean = process.argv.includes('--clean');
  if (clean) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(VENDOR, { recursive: true });
  fs.mkdirSync(FONTS, { recursive: true });

  // 1) plain JS
  for (const f of PLAIN_JS) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
  console.log('✓ plain JS をコピー');

  // 2) JSX → JS
  // 元 HTML では JSX は type="text/babel" で eval 実行され、各ファイルは
  // 互いに隔離されていた（共有はすべて window 経由）。事前コンパイルして
  // ふつうの <script> で読むと top-level の const/function がグローバルで
  // 衝突する（例: app.jsx の `const { Home } = window` と Home.jsx の
  // `function Home`）。そこで各ファイルを IIFE で包んで同じ隔離を再現する。
  for (const f of JSX) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    const result = babel.transformSync(code, {
      filename: f,
      compact: false,
      presets: [['@babel/preset-react', { runtime: 'classic' }]],
    });
    const wrapped = `(function () {\n${result.code}\n})();\n`;
    fs.writeFileSync(path.join(OUT, f.replace(/\.jsx$/, '.js')), wrapped);
  }
  console.log('✓ JSX を事前コンパイル（IIFE で隔離）');

  // 3) CSS
  fs.copyFileSync(path.join(SRC, 'styles.css'), path.join(OUT, 'styles.css'));
  console.log('✓ styles.css をコピー');

  // 4) React / ReactDOM（既存なら再ダウンロードしない）
  const reactFile = path.join(VENDOR, 'react.production.min.js');
  const reactDomFile = path.join(VENDOR, 'react-dom.production.min.js');
  if (!fs.existsSync(reactFile)) fs.writeFileSync(reactFile, await download(REACT_URL));
  if (!fs.existsSync(reactDomFile)) fs.writeFileSync(reactDomFile, await download(REACTDOM_URL));
  console.log('✓ React / ReactDOM を同梱');

  // 5) フォント（fonts.css が既にあれば再ダウンロードしない）
  const fontsCssFile = path.join(OUT, 'fonts.css');
  if (!fs.existsSync(fontsCssFile)) {
    const cssText = (await download(FONTS_CSS_URL, { headers: { 'User-Agent': UA } })).toString('utf8');
    const urls = [...new Set([...cssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
    let localCss = cssText;
    let i = 0;
    for (const u of urls) {
      const ext = (u.match(/\.(woff2|woff|ttf|otf)(?:\?|$)/) || [null, 'woff2'])[1];
      const name = `f${i++}.${ext}`;
      fs.writeFileSync(path.join(FONTS, name), await download(u));
      localCss = localCss.split(u).join(`fonts/${name}`);
    }
    fs.writeFileSync(fontsCssFile, localCss);
    console.log(`✓ フォント ${urls.length} ファイルを同梱`);
  } else {
    console.log('✓ フォントは既存のものを再利用');
  }

  // 6) index.html
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;" />
  <title>速・打 — タイピング道場</title>
  <link rel="stylesheet" href="fonts.css" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="root"></div>

  <script src="vendor/react.production.min.js"></script>
  <script src="vendor/react-dom.production.min.js"></script>
  <script>
    Object.assign(window, {
      useState: React.useState,
      useEffect: React.useEffect,
      useRef: React.useRef,
      useLayoutEffect: React.useLayoutEffect,
      useMemo: React.useMemo,
    });
  </script>

  <script src="romaji.js"></script>
  <script src="content.js"></script>
  <script src="storage.js"></script>
  <script src="sound.js"></script>

  <script src="tweaks-panel.js"></script>
  <script src="common.js"></script>
  <script src="Home.js"></script>
  <script src="Game.js"></script>
  <script src="Result.js"></script>
  <script src="Analysis.js"></script>
  <script src="Settings.js"></script>
  <script src="app.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log('✓ index.html を生成');
  console.log('\n完了: renderer/ にオフライン版を出力しました。');
}

main().catch((e) => {
  console.error('ビルド失敗:', e.message);
  process.exit(1);
});
