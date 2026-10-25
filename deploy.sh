#!/usr/bin/env bash
# ============================================================
#  GOOD Growth — выкладка одной командой
#
#  Принцип: скрипт кладёт ТОЛЬКО статику в /var/www/app.
#  Он НЕ ИМЕЕТ ДЕЛА с живым сервисом в /opt/goodgrowth/repo
#  (server.js, .env, data/goodgrowth.db) — там ни reset,
#  ни checkout, ни записи.
#
#  ИСТОРИЯ ДЕФЕКТА: первая версия делала `git reset --hard` в рабочей
#  копии. Зая поймала: в /opt/goodgrowth/repo лежит живой server.js с 33
#  несохранёнными правками — reset положил бы сервис. Поэтому теперь
#  на сервере НЕТ постоянной рабочей копии: код клонируется во временную
#  папку, оттуда копируется статика, папка удаляется.
#
#  Использование:
#     sudo ./deploy.sh              # origin/main
#     sudo ./deploy.sh jessie/i18n-login
#
#  ⚠️ Перед первым запуском сверь пути (SERVER.md).
# ============================================================
set -euo pipefail

# ---------- НАСТРОЙКИ ----------
APP_DIR="${APP_DIR:-/var/www/app}"                  # статика для nginx
SERVICE_DIR="${SERVICE_DIR:-/opt/goodgrowth/repo}"  # ЖИВОЙ СЕРВИС — НЕ ТРОГАЕМ
I18N_DIR="${I18N_DIR:-/opt/goodgrowth/repo/public/i18n}"  # словарь (nginx alias)
BAK_ROOT="${BAK_ROOT:-/root/bak}"
REPO_URL="${REPO_URL:-https://github.com/simabgar777-gif/GOOD-Growth.git}"
SITE="${SITE:-https://growth.go-ood.com}"
BRANCH="${1:-main}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BAK="$BAK_ROOT/deploy-$STAMP"

say()  { printf '\n\033[1;33m>> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;35m   ! %s\033[0m\n' "$1"; }
die()  { printf '\n\033[1;31m!! %s\033[0m\n' "$1" >&2; exit 1; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/gg-deploy-XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

# ---------- 0. защита ----------
if [ "${ALLOW_NON_ROOT:-}" != "1" ]; then
  [ "$(id -u)" -eq 0 ] || die "нужен root (или sudo)"
fi
[ -d "$APP_DIR" ] || die "нет $APP_DIR — сверь путь в SERVER.md"

# никакая запись не должна попасть в живой сервис
real_app="$(cd "$APP_DIR" && pwd -P)"
real_svc="$(cd "$SERVICE_DIR" 2>/dev/null && pwd -P || echo /__no_service__)"
case "$real_app" in
  "$real_svc"*) die "APP_DIR=$APP_DIR внутри живого сервиса $SERVICE_DIR — остановка" ;;
esac

# ---------- 1. код во временную папку ----------
say "1/5 клонирую $BRANCH во временную папку"
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP" \
  || die "не удалось клонировать $REPO_URL (нет доступа к GitHub с сервера?)"
cd "$TMP"
echo "   HEAD: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s | cut -c1-60)"
[ -d "$TMP/live-pages" ] || die "в репозитории нет live-pages/ — нечего выкладывать"

# ---------- 2. бэкап ----------
say "2/5 бэкап $APP_DIR → $BAK"
mkdir -p "$BAK"
cp -a "$APP_DIR/." "$BAK/"
echo "   файлов в бэкапе: $(find "$BAK" -type f | wc -l)"

# ---------- 3. выкладка ----------
say "3/5 кладу статику в $APP_DIR"
for f in "$TMP"/live-pages/*.html "$TMP"/live-pages/*.css "$TMP"/live-pages/*.js; do
  [ -e "$f" ] || continue
  cp -f "$f" "$APP_DIR/"
done
if [ -d "$TMP/public/i18n" ]; then
  # ВАЖНО: словарь отдаёт nginx через alias на /opt/goodgrowth/repo/public/i18n/,
  # а НЕ из /var/www/app/i18n. Раньше скрипт клал его не туда — переводы не доезжали.
  # Это единственная запись в каталог сервиса, и только один файл.
  mkdir -p "$I18N_DIR"
  cp -f "$TMP"/public/i18n/* "$I18N_DIR/"
  echo "   словарь → $I18N_DIR"
fi
if [ -f "$TMP/public/app.js" ]; then
  mkdir -p "$APP_DIR/public"
  cp -f "$TMP/public/app.js" "$APP_DIR/public/app.js"
fi
echo "   файлов в $APP_DIR: $(find "$APP_DIR" -maxdepth 1 -type f | wc -l)"

# сервис не должен измениться — говорим об этом вслух
if [ -d "$SERVICE_DIR/.git" ]; then
  dirty="$(cd "$SERVICE_DIR" && git status --porcelain 2>/dev/null | wc -l || echo 0)"
  warn "живой сервис $SERVICE_DIR: изменённых файлов $dirty — НЕ ТРОНУТ"
fi

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
[ "$code" = "200" ] || die "сайт не отвечает 200. Откат: cp -a $BAK/. $APP_DIR/"

say "ГОТОВО"
echo "   коммит:  $(git rev-parse --short HEAD)"
echo "   бэкап:   $BAK"
echo "   откат:   cp -a $BAK/. $APP_DIR/ && nginx -s reload"
