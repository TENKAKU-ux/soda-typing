// main.js — Electron メインプロセス
// renderer/index.html（ビルド済み・完全オフライン）を専用ウィンドウで開く。
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// このマシンの GPU(Radeon 780M)はローカルAIと共有で取り合いになり、
// Electron の GPU プロセス起動が失敗して落ちることがある（error_code=1002 → GPU FATAL）。
// タイピングUIに GPU は不要なので、ソフトウェア描画に固定し GPU プロセスへ依存しない。
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

// デスクトップアイコンの二度押しなどで多重起動しても、ウィンドウは1枚に保つ。
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');
  const opts = {
    width: 1120,
    height: 780,
    minWidth: 880,
    minHeight: 620,
    backgroundColor: '#0e1118',
    title: '速・打 — タイピング道場',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  // アイコンはユーザーが用意（icon.png）。無くても起動する。
  if (fs.existsSync(iconPath)) opts.icon = iconPath;

  const win = new BrowserWindow(opts);
  Menu.setApplicationMenu(null); // メニューバー非表示でアプリらしく

  // 外部リンクが踏まれても外部ブラウザで開く（基本オフラインなので保険）
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
