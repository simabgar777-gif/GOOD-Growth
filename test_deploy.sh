#!/usr/bin/env bash
# Проверка deploy.sh на песочном стенде: свой APP_DIR, свой «живой сервис»
# с несохранёнными правками, свой git, подставные nginx и curl.
# Ничего настоящего не трогает.
set -uo pipefail

SUT="${1:?укажи путь к deploy.sh}"
STAND="$(mktemp -d)"
APP="$STAND/app"
SVC="$STAND/service"      # «живой сервис» с грязными правками — трогать нельзя
BAK="$STAND/bak"
BIN="$STAND/bin"

pass=0; fail=0
ok()  { echo "   ✓ $1"; pass=$((pass+1)); }
bad() { echo "   ✗ $1"; fail=$((fail+1)); }

mkdir -p "$APP" "$BAK" "$BIN"

# --- подставной nginx ---
cat > "$BIN/nginx" <<'EOF'
#!/usr/bin/env bash
case "${1:-}" in
  -t) if [ -f "$NGINX_BAD" ]; then echo "nginx: bad config" >&2; exit 1; fi
      echo "nginx: config test is successful" >&2; exit 0 ;;
  -s) echo "reloaded" >> "$NGINX_LOG"; exit 0 ;;
esac
exit 0
EOF
# --- подставной curl ---
cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
cat "$CURL_CODE"
EOF
chmod +x "$BIN/nginx" "$BIN/curl"
export NGINX_BAD="$STAND/nginx.bad" NGINX_LOG="$STAND/nginx.log" CURL_CODE="$STAND/code"
echo 200 > "$CURL_CODE"

# --- «живой сервис»: git-репозиторий с НЕСОХРАНЁННОЙ правкой ---
mkdir -p "$SVC"
( cd "$SVC" && git init -q -b main \
  && printf 'server v1\n' > server.js \
  && printf 'PORT=3000\n' > .env \
  && git add -A && git -c user.email=t@t -c user.name=t commit -qm "base" ) >/dev/null 2>&1
printf 'server v1 + 33 local fixes\n' > "$SVC/server.js"
printf 'PORT=3000\nSECRET=live\n'    > "$SVC/.env"
LOCAL_BEFORE="$(cat "$SVC/server.js")"

# --- источник кода ---
SRC="$STAND/src"
mkdir -p "$SRC/live-pages" "$SRC/public/i18n"
printf '<html>index v1</html>\n' > "$SRC/live-pages/index.html"
printf 'body{}\n'                 > "$SRC/live-pages/style-c.css"
printf '{"a":"b"}\n'              > "$SRC/public/i18n/ru.json"
printf 'old\n'                    > "$APP/stare.txt"
( cd "$SRC" && git init -q -b main && git add -A \
  && git -c user.email=t@t -c user.name=t commit -qm "v1" ) >/dev/null 2>&1

run() {
  OUT="$( cd "$STAND" && ALLOW_NON_ROOT=1 \
      APP_DIR="$APP" SERVICE_DIR="$SVC" BAK_ROOT="$BAK" \
      REPO_URL="file://$SRC" SITE="https://example.test" \
      PATH="$BIN:$PATH" bash "$SUT" "${BRANCH:-main}" 2>&1 )"
  RC=$?
}

echo "=== 1. УСПЕШНАЯ ВЫКЛАДКА ==="
run main
[ $RC -eq 0 ] && ok "код 0" || { bad "код $RC"; echo "$OUT" | tail -6; }
[ -f "$APP/index.html" ]      && ok "страница выложена"    || bad "страницы нет"
[ -f "$APP/style-c.css" ]     && ok "стиль выложен"        || bad "стиля нет"
[ -f "$APP/i18n/ru.json" ]    && ok "словарь в /i18n/"     || bad "словаря нет"
[ -f "$APP/stare.txt" ]       && ok "чужой файл не затёрт" || bad "чужой файл пропал"
[ -n "$(find "$BAK" -name stare.txt 2>/dev/null)" ] && ok "бэкап хранит состояние ДО" || bad "бэкапа нет"
grep -q reloaded "$NGINX_LOG" 2>/dev/null && ok "nginx перезагружен" || bad "nginx не перезагружен"

echo
echo "=== 2. ГЛАВНОЕ: ЖИВОЙ СЕРВИС НЕ ТРОНУТ ==="
LOCAL_AFTER="$(cat "$SVC/server.js" 2>/dev/null)"
[ "$LOCAL_BEFORE" = "$LOCAL_AFTER" ] && ok "правки server.js целы" || bad "server.js ОТКАЧЕН (дефект вернулся!)"
grep -q 'SECRET=live' "$SVC/.env" 2>/dev/null && ok ".env цел" || bad ".env испорчен"
[ -z "$(find "$SVC" -name 'index.html' 2>/dev/null)" ] && ok "в сервис ничего не скопировано" || bad "в сервис попала статика"
grep -q "НЕ ТРОНУТ" <<< "$OUT" && ok "скрипт сказал про сервис вслух" || bad "не сказал про сервис"

echo
echo "=== 3. APP_DIR ВНУТРИ СЕРВИСА — отказ ==="
mkdir -p "$SVC/sub"        # каталог ДОЛЖЕН существовать, иначе сработает другой сторож
OUT="$( cd "$STAND" && ALLOW_NON_ROOT=1 \
    APP_DIR="$SVC/sub" SERVICE_DIR="$SVC" BAK_ROOT="$BAK" \
    REPO_URL="file://$SRC" SITE="https://example.test" \
    PATH="$BIN:$PATH" bash "$SUT" main 2>&1 )"
RC=$?
[ $RC -ne 0 ] && ok "отказался (код $RC)" || bad "не отказался!"
grep -q "внутри живого сервиса" <<< "$OUT" && ok "объяснил почему" || bad "не объяснил"

echo
echo "=== 4. ПЛОХОЙ КОНФИГ nginx — должен ВСТАТЬ ==="
touch "$NGINX_BAD"; : > "$NGINX_LOG"
run main
[ $RC -ne 0 ] && ok "остановился (код $RC)" || bad "не остановился!"
grep -q reloaded "$NGINX_LOG" 2>/dev/null && bad "перезагрузил при плохом конфиге!" || ok "reload не было"
grep -q "Откат" <<< "$OUT" && ok "напечатал откат" || bad "не напечатал откат"

echo
echo "=== 5. САЙТ НЕ ОТВЕЧАЕТ 200 — должен ВСТАТЬ ==="
rm -f "$NGINX_BAD"; : > "$NGINX_LOG"; echo 502 > "$CURL_CODE"
run main
[ $RC -ne 0 ] && ok "остановился (код $RC)" || bad "не остановился!"
grep -q "Откат" <<< "$OUT" && ok "напечатал откат" || bad "не напечатал откат"

echo
echo "=== 6. НЕТ КАТАЛОГА ПРИЛОЖЕНИЯ — стоп ДО бэкапа ==="
OUT="$( cd "$STAND" && ALLOW_NON_ROOT=1 APP_DIR="$STAND/no-such" SERVICE_DIR="$SVC" \
    BAK_ROOT="$BAK" REPO_URL="file://$SRC" SITE="https://example.test" \
    PATH="$BIN:$PATH" bash "$SUT" main 2>&1 )"
RC=$?
[ $RC -ne 0 ] && ok "остановился (код $RC)" || bad "не остановился!"
grep -q "сверь путь" <<< "$OUT" && ok "подсказал сверить путь" || bad "нет подсказки"

echo
echo "─────────────────────────────"
echo "прошло: $pass   провалилось: $fail"
[ $fail -eq 0 ] && echo "ВЕРДИКТ: deploy.sh работает" || echo "ВЕРДИКТ: есть провалы"
exit $fail
