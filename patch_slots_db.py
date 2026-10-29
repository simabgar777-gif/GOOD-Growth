"""Сетка слотов: таблицы + два адреса.

Приказ Капитана «ГО» + три добавления Боцмана:
  · строка ритма видна на телефоне        → это в интерфейсе
  · «изменить» открывает на том же месте  → это в интерфейсе
  · заложить статус генерации заранее     → таблица post_assets (сразу, пустая)

Таблицы:
  rhythm       — ритм (сколько в неделю) и часовой пояс, на пользователя
  slots        — сетка: день недели + время
  post_assets  — задачи на картинки/видео (задел, чтобы не менять схему потом)

Правит локальные копии из refs/timeweb/fromserver.
"""
import io
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

W = r"C:\Users\боос\Documents\deepseek-harness\default-workspace"
T = os.path.join(W, "refs", "timeweb", "fromserver")
DB = os.path.join(T, "db.js")
SRV = os.path.join(T, "server.js")

errors = []

# ═══════════════════ БАЗА ═══════════════════════════════════
d = io.open(DB, encoding="utf-8").read()

if "CREATE TABLE IF NOT EXISTS slots" in d:
    print("db.js: таблицы уже описаны")
else:
    anchor = "const MIGRATIONS = ["
    if d.count(anchor) != 1:
        errors.append("db.js: якорь MIGRATIONS не найден")
    else:
        add = """
  /* ── ритм и сетка слотов (приказ Капитана «ГО») ────────────────
     rhythm — сколько раз в неделю и в каком часовом поясе
     slots  — по какому дню и в какой час выходит пост            */
  `CREATE TABLE IF NOT EXISTS rhythm (
     user_id INTEGER PRIMARY KEY,
     per_week INTEGER NOT NULL DEFAULT 3,
     tz TEXT DEFAULT 'Europe/Moscow',
     updated_at TEXT DEFAULT (datetime('now','localtime'))
   )`,
  `CREATE TABLE IF NOT EXISTS slots (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL,
     weekday INTEGER NOT NULL,
     time_hm TEXT NOT NULL,
     active INTEGER NOT NULL DEFAULT 1,
     created_at TEXT DEFAULT (datetime('now','localtime')),
     UNIQUE (user_id, weekday, time_hm)
   )`,
  'CREATE INDEX IF NOT EXISTS idx_slots_user ON slots(user_id)',
  /* ── задел под генерацию картинок и видео (добавление Боцмана):
     сразу со статусом, чтобы не переделывать схему, когда дойдём
     до роликов. Пока таблица пустая.                            */
  `CREATE TABLE IF NOT EXISTS post_assets (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     post_id INTEGER NOT NULL,
     kind TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'queued',
     path TEXT,
     note TEXT,
     created_at TEXT DEFAULT (datetime('now','localtime'))
   )`,
  'CREATE INDEX IF NOT EXISTS idx_assets_post ON post_assets(post_id)',
"""
        d = d.replace(anchor, anchor + add, 1)
        print("db.js: миграции добавлены (rhythm, slots, post_assets)")

if "function getSlots" in d:
    print("db.js: функции уже есть")
else:
    funcs = '''
/* ── ритм и слоты ───────────────────────────────────────────────
   Слот = «в этот день недели, в этот час». Повторяется каждую неделю.
   Время в минутах от полуночи считать на клиенте, здесь — 'HH:MM'. */
function scopeUid(scope) {
  return (scope && scope.userId != null) ? Number(scope.userId) : 0;
}

function getSlots(scope) {
  const uid = scopeUid(scope);
  let row = null;
  try {
    row = db.prepare('SELECT per_week, tz FROM rhythm WHERE user_id = ?').get(uid);
  } catch (e) { row = null; }
  const list = db.prepare(
    'SELECT weekday, time_hm FROM slots WHERE user_id = ? AND active = 1 ORDER BY weekday, time_hm'
  ).all(uid).map((r) => ({ weekday: Number(r.weekday), time: String(r.time_hm) }));
  return {
    perWeek: row ? Number(row.per_week) : null,
    tz: row ? String(row.tz || 'Europe/Moscow') : 'Europe/Moscow',
    slots: list
  };
}

function setSlots(scope, perWeek, list, tz) {
  const uid = scopeUid(scope);
  let pw = Number(perWeek);
  if (!Number.isInteger(pw) || pw < 0 || pw > 70) pw = 3;
  const zone = String(tz || 'Europe/Moscow').slice(0, 40);

  const clean = [];
  (Array.isArray(list) ? list : []).forEach((s) => {
    const wd = Number(s && s.weekday);
    const tm = String((s && s.time) || '');
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) return;
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(tm)) return;
    const key = wd + ':' + tm;
    if (clean.indexOf(key) === -1) clean.push(key);
  });

  db.prepare('INSERT INTO rhythm (user_id, per_week, tz) VALUES (?, ?, ?) ' +
    'ON CONFLICT(user_id) DO UPDATE SET per_week = excluded.per_week, ' +
    'tz = excluded.tz, updated_at = datetime(\\'now\\',\\'localtime\\')'
  ).run(uid, pw, zone);

  db.prepare('DELETE FROM slots WHERE user_id = ?').run(uid);
  const ins = db.prepare('INSERT OR IGNORE INTO slots (user_id, weekday, time_hm) VALUES (?, ?, ?)');
  clean.forEach((k) => {
    const parts = k.split(':');
    ins.run(uid, Number(parts[0]), parts[1] + ':' + parts[2]);
  });
  return getSlots(scope);
}

'''
    a2 = "function totalsAnalytics(scope) {"
    if d.count(a2) != 1:
        errors.append("db.js: якорь totalsAnalytics не найден")
    else:
        d = d.replace(a2, funcs.lstrip("\n") + a2, 1)
        print("db.js: функции getSlots / setSlots добавлены")

if "getSlots, setSlots" not in d:
    old_exp = "  getGoalSteps, setGoalSteps,"
    if d.count(old_exp) != 1:
        errors.append("db.js: якорь экспорта не найден")
    else:
        d = d.replace(old_exp, old_exp + " getSlots, setSlots,", 1)
        print("db.js: экспорт обновлён")

io.open(DB, "w", encoding="utf-8", newline="\n").write(d)

# ═══════════════════ МАРШРУТЫ ═══════════════════════════════
s = io.open(SRV, encoding="utf-8").read()

if "api/slots" in s:
    print("server.js: маршруты уже есть")
else:
    routes = '''
  /* ── ритм и сетка слотов ───────────────────────────────────────
     GET  /api/slots → { perWeek, tz, slots: [{ weekday, time }] }
     POST /api/slots { perWeek, tz, slots: [...] }                  */
  if ((req.method === 'GET' || req.method === 'POST') && u.pathname === '/api/slots') {
    const _w = workspaceScope(req);
    if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
    if (req.method === 'GET') return sendJson(res, 200, db.getSlots(_w));
    const body = await readBody(req);
    const saved = db.setSlots(_w, body && body.perWeek, body && body.slots, body && body.tz);
    return sendJson(res, 200, saved);
  }

'''
    a3 = "  if (req.method === 'GET' && u.pathname === '/api/analytics') {"
    if s.count(a3) != 1:
        errors.append("server.js: якорь /api/analytics не найден")
    else:
        s = s.replace(a3, routes.lstrip("\n") + a3, 1)
        print("server.js: маршрут /api/slots добавлен")

io.open(SRV, "w", encoding="utf-8", newline="\n").write(s)

print()
if errors:
    print("ОШИБКИ:")
    for e in errors:
        print("  · " + e)
    raise SystemExit(1)
print("готово: db.js и server.js поправлены локально")
