#!/usr/bin/env bash
# Проверка deploy.sh на живом песочном стенде: свой APP_DIR, свой git-репозиторий,
# подставные nginx и curl. Ничего настоящего не трогает.
set -uo pipefail

SUT="${1:?укажи путь к deploy.sh}"
STAND="$(mktemp -d)"
APP="$STAND/app"
REPO="$STAND/repo"
BAK="$STAND/bak"
BIN="$STAND/bin"

pass=0; fail=0
ok()   { echo "   ✓ $1"; pass=$((pass+1)); }
bad()  { echo "   ✗ $1"; fail=$((fail+1)); }

mkdir -p "$APP" "$BAK" "$BIN"

# --- подставной nginx: управляется файлом-переключателем ---
cat > "$BIN/nginx" <<'EOF'
#!/usr/bin/env bash
case "${1:-}" in
  -t) if [ -f "$NGINX_BAD" ]; then echo "nginx: bad config" >&2; exit 1; fi
      echo "nginx: configuration file test is successful" >&2; exit 0 ;;
  -s) echo "reloaded" >> "$NGINX_LOG"; exit 0 ;;
esac
exit 0
EOF
# --- подставной curl: отвечает кодом из файла ---
cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
cat "$CURL_CODE"
EOF
chmod +x "$BIN/nginx" "$BIN/curl"
export NGINX_BAD="$STAND/nginx.bad" NGINX_LOG="$STAND/nginx.log" CURL_CODE="$STAND/code"
echo 200 > "$CURL_CODE"

# --- источник: маленький git-репозиторий с live-pages и public/i18n ---
SRC="$STAND/src"
mkdir -p "$SRC/live-pages" "$SRC/public/i18n"
printf '<html>index v1</html>\n' > "$SRC/live-pages/index.html"
printf 'body{}\n'                 > "$SRC/live-pages/style-c.css"
printf '{"a":"b"}\n'              > "$SRC/public/i18n/ru.json"
printf 'console.log(1)\n'         > "$SRC/public/i18n/i18n.js"
printf 'old\n'                    > "$APP/stare.txt"          # файл, который должен остаться
( cd "$SRC" && git init -q -b main && git add -A \
  && git -c user.email=t@t -c user.name=t commit -qm "v1" ) || { echo "не собрался git"; exit 1; }

run() {  # run <метка> → код возврата в $RC, вывод в $OUT
  OUT="$( cd "$STAND" && ALLOW_NON_ROOT=1 \
      APP_DIR="$APP" REPO_DIR="$REPO" BAK_ROOT="$BAK" \
      REPO_URL="file://$SRC" SITE="https://example.test" \
      PATH="$BIN:$PATH" bash "$SUT" "${BRANCH:-main}" 2>&1 )"
  RC=$?
}

echo "=== 1. УСПЕШНАЯ ВЫКЛАДКА ==="
run main
[ $RC -eq 0 ] && ok "код 0" || { bad "код $RC"; echo "$OUT" | tail -5; }
[ -f "$APP/index.html" ] && ok "страница выложена" || bad "страницы нет"
[ -f "$APP/style-c.css" ] && ok "стиль выложен" || bad "стиля нет"
[ -f "$APP/i18n/ru.json" ] && ok "словарь в /i18n/" || bad "словаря нет"
[ -f "$APP/stare.txt" ] && ok "чужой файл не затёрт" || bad "чужой файл пропал"
# бэкап делается ДО копирования — в нём состояние «до»: stare.txt, а не index.html
[ -n "$(find "$BAK" -name stare.txt 2>/dev/null)" ] && ok "бэкап содержит состояние ДО" || bad "бэкапа нет или он пуст"
grep -q reloaded "$NGINX_LOG" 2>/dev/null && ok "nginx перезагружен" || bad "nginx не перезагружен"

echo
echo "=== 2. ПЛОХОЙ КОНФИГ nginx — должен ВСТАТЬ ==="
touch "$NGINX_BAD"
: > "$NGINX_LOG"
printf '<html>index v2</html>\n' > "$SRC/live-pages/index.html"
( cd "$SRC" && git add -A && git -c user.email=t@t -c user.name=t commit -qm "v2" )
run main
[ $RC -ne 0 ] && ok "остановился (код $RC)" || bad "не остановился!"
grep -q reloaded "$NGINX_LOG" 2>/dev/null && bad "перезагрузил при плохом конфиге!" || ok "reload не было"
echo "$OUT" | grep -q "Откат" && ok "напечатал откат" || bad "не напечатал откат"

echo
echo "=== 3. САЙТ НЕ ОТВЕЧАЕТ 200 — должен ВСТАТЬ ==="
rm -f "$NGINX_BAD"; : > "$NGINX_LOG"; echo 502 > "$CURL_CODE"
run main
[ $RC -ne 0 ] && ok "остановился (код $RC)" || bad "не остановился!"
echo "$OUT" | grep -q "Откат" && ok "напечатал откат" || bad "не напечатал откат"

echo
echo "=== 4. НЕТ КАТАЛОГА ПРИЛОЖЕНИЯ — должен ВСТАТЬ ДО БЭКАПА ==="
APP2="$STAND/no-such"
OUT="$( cd "$STAND" && ALLOW_NON_ROOT=1 APP_DIR="$APP2" REPO_DIR="$REPO" \
    BAK_ROOT="$BAK" REPO_URL="file://$SRC" SITE="https://example.test" \
    PATH="$BIN:$PATH" bash "$SUT" main 2>&1 )"
RC=$?
[ $RC -ne 0 ] && ok "остановился (код $RC)" || bad "не остановился!"
echo "$OUT" | grep -q "сверь путь" && ok "подсказал сверить путь" || bad "нет подсказки"

echo
echo "─────────────────────────────"
echo "прошло: $pass   провалилось: $fail   стенд: $STAND"
[ $fail -eq 0 ] && echo "ВЕРДИКТ: deploy.sh работает" || echo "ВЕРДИКТ: есть провалы"
exit $fail
