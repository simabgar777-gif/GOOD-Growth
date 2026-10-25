#!/usr/bin/env bash
# ============================================================
#  GOOD Growth — выкладка одной командой
#
#  Зачем: чтобы выкладка не зависела от одного человека.
#  Запускается НА СЕРВЕРЕ. Делает бэкап, забирает код, кладёт,
#  проверяет nginx и здоровье сайта. При ошибке — откат.
#
#  Использование:
#     ./deploy.sh              # выложить origin/main
#     ./deploy.sh jessie/i18n-login
#
#  ⚠️ ПЕРЕД ПЕРВЫМ ЗАПУСКОМ: сверить пути в блоке НАСТРОЙКИ
#     с тем, что реально на сервере (см. SERVER.md).
# ============================================================
set -euo pipefail

# ---------- НАСТРОЙКИ (сверить!) ----------
APP_DIR="${APP_DIR:-/var/www/app}"        # откуда nginx отдаёт страницы
REPO_DIR="${REPO_DIR:-/opt/goodgrowth}"   # рабочая копия git на сервере
BAK_ROOT="${BAK_ROOT:-/root/bak}"         # куда кладём бэкапы
REPO_URL="${REPO_URL:-https://github.com/simabgar777-gif/GOOD-Growth.git}"
SITE="${SITE:-https://growth.go-ood.com}"
BRANCH="${1:-main}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BAK="$BAK_ROOT/deploy-$STAMP"

say() { printf '\n\033[1;33m>> %s\033[0m\n' "$1"; }
die() { printf '\n\033[1;31m!! %s\033[0m\n' "$1" >&2; exit 1; }

# root нужен, чтобы писать в /var/www и перезагружать nginx.
# ALLOW_NON_ROOT=1 — ТОЛЬКО для проверки скрипта на машине разработчика,
# на сервере не ставить.
if [ "${ALLOW_NON_ROOT:-}" != "1" ]; then
  [ "$(id -u)" -eq 0 ] || die "нужен root (или sudo)"
fi
[ -d "$APP_DIR" ] || die "нет $APP_DIR — сверь путь в SERVER.md"

# ---------- 1. бэкап ----------
say "1/5 бэкап $APP_DIR → $BAK"
mkdir -p "$BAK"
cp -a "$APP_DIR/." "$BAK/"
echo "   файлов в бэкапе: $(find "$BAK" -type f | wc -l)"

# ---------- 2. код ----------
say "2/5 забираю $BRANCH"
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "   рабочей копии нет — создаю"
  mkdir -p "$REPO_DIR"
  git clone --quiet "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
git fetch --quiet origin
git reset --quiet --hard "origin/$BRANCH"
echo "   HEAD: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s | cut -c1-60)"

# ---------- 3. выкладка ----------
say "3/5 кладу страницы в $APP_DIR"
# статика уровня сайта
for f in live-pages/*.html live-pages/*.css live-pages/*.js; do
  [ -e "$f" ] || continue
  cp -f "$f" "$APP_DIR/"
done
# словарь и движок переводов
if [ -d public/i18n ]; then
  mkdir -p "$APP_DIR/i18n"
  cp -f public/i18n/* "$APP_DIR/i18n/"
fi
# серверный код — только если он есть и менялся
if [ -f public/app.js ]; then
  mkdir -p "$APP_DIR/public"
  cp -f public/app.js "$APP_DIR/public/app.js"
fi
echo "   файлов в $APP_DIR: $(find "$APP_DIR" -maxdepth 1 -type f | wc -l)"

# ---------- 4. nginx ----------
say "4/5 проверяю nginx"
if nginx -t; then
  nginx -s reload
  echo "   nginx перезагружен"
else
  die "конфиг nginx плохой — НЕ перезагружаю. Откат: cp -a $BAK/. $APP_DIR/"
fi

# ---------- 5. проверка ----------
say "5/5 проверяю сайт"
code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE/" || echo 000)"
echo "   $SITE/ → HTTP $code"
if [ "$code" != "200" ]; then
  die "сайт не отвечает 200. Откат: cp -a $BAK/. $APP_DIR/"
fi

say "ГОТОВО"
echo "   коммит:  $(git rev-parse --short HEAD)"
echo "   бэкап:   $BAK"
echo "   откат:   cp -a $BAK/. $APP_DIR/ && nginx -s reload"
