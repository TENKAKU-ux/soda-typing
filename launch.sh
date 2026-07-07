#!/usr/bin/env bash
# 速・打 タイピング道場 を起動する。
# スクリプト自身の場所（リポルート）へ移動してから Electron を起動するので、
# どこから実行してもパスがずれない。
cd "$(dirname "$(readlink -f "$0")")" || exit 1
exec ./node_modules/.bin/electron --no-sandbox . "$@"
