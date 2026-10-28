"""Отметки шагов — в базу (приказ Капитана: вариант A).

Что делает:
  1. db.js  — таблица goal_steps + функции getGoalSteps / setGoalSteps
  2. server.js — GET и POST /api/goals/:id/steps

Правит ЛОКАЛЬНЫЕ копии из refs/timeweb/fromserver, потом их заливаем.
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

# ══════════════════ 1. БАЗА ══════════════════════════════════
d = io.open(DB, encoding="utf-8").read()

if "goal_steps" in d:
    print("db.js: таблица уже описана")
else:
    anchor = "const MIGRATIONS = ["
    if d.count(anchor) != 1:
        errors.append("db.js: якорь MIGRATIONS не найден")
    else:
        d = d.replace(anchor, anchor + "\n"
            "  /* отметки «первых шагов»: какие шаги разбора человек сделал */\n"
            "  `CREATE TABLE IF NOT EXISTS goal_steps (\n"
            "     goal_id INTEGER NOT NULL,\n"
            "     step_index INTEGER NOT NULL,\n"
            "     done_at TEXT DEFAULT (datetime('now','localtime')),\n"
            "     PRIMARY KEY (goal_id, step_index)\n"
            "   )`,", 1)
        print("db.js: миграция добавлена")

if "function getGoalSteps" in d:
    print("db.js: функции уже есть")
else:
    funcs = '''
/* ── отметки шагов (приказ Капитана: хранить в базе) ─────────────
   Шаги живут в strategy_json.first_steps, а СДЕЛАНО/НЕ СДЕЛАНО
   хранится здесь — отдельно, чтобы отметки не зависели от устройства. */
function goalVisible(scope, goalId) {
  const has = !!(scope && scope.userId != null);
  if (!has) return !!db.prepare('SELECT id FROM goals WHERE id = ?').get(goalId);
  const row = db.prepare(
    'SELECT id FROM goals WHERE id = ? AND (user_id = ?' +
    (scope.includeNull ? ' OR user_id IS NULL' : '') + ')'
  ).get(goalId, Number(scope.userId));
  return !!row;
}

function getGoalSteps(scope, goalId) {
  if (!goalVisible(scope, goalId)) return null;
  return db.prepare('SELECT step_index FROM goal_steps WHERE goal_id = ? ORDER BY step_index')
    .all(goalId).map((r) => Number(r.step_index));
}

function setGoalSteps(scope, goalId, list) {
  if (!goalVisible(scope, goalId)) return null;
  const clean = [];
  (Array.isArray(list) ? list : []).forEach((x) => {
    const n = Number(x);
    if (Number.isInteger(n) && n >= 0 && n < 20 && clean.indexOf(n) === -1) clean.push(n);
  });
  db.prepare('DELETE FROM goal_steps WHERE goal_id = ?').run(goalId);
  const ins = db.prepare('INSERT OR IGNORE INTO goal_steps (goal_id, step_index) VALUES (?, ?)');
  clean.forEach((n) => ins.run(goalId, n));
  return clean;
}

'''
    anchor2 = "function totalsAnalytics(scope) {"
    if d.count(anchor2) != 1:
        errors.append("db.js: якорь totalsAnalytics не найден")
    else:
        d = d.replace(anchor2, funcs.lstrip("\n") + anchor2, 1)
        print("db.js: функции вставлены")

if "getGoalSteps, setGoalSteps" not in d:
    old_exp = "  listBrands, getBrand, addBrand, renameBrand, setBrandStatus, deleteBrand,"
    if d.count(old_exp) != 1:
        errors.append("db.js: якорь экспорта не найден")
    else:
        d = d.replace(old_exp, old_exp + "\n  getGoalSteps, setGoalSteps,", 1)
        print("db.js: экспорт обновлён")

io.open(DB, "w", encoding="utf-8", newline="\n").write(d)

# ══════════════════ 2. МАРШРУТЫ ══════════════════════════════
s = io.open(SRV, encoding="utf-8").read()

if "/api/goals/" in s and "getGoalSteps" in s:
    print("server.js: маршруты уже есть")
else:
    routes = '''
  /* ── отметки «первых шагов» ────────────────────────────────────
     GET  /api/goals/:id/steps  → { goalId, done: [0,2] }
     POST /api/goals/:id/steps  { done: [0,2] }
     Зачем: галочки не должны пропадать при смене устройства. */
  {
    const m = u.pathname.match(/^\\/api\\/goals\\/(\\d+)\\/steps$/);
    if (m && (req.method === 'GET' || req.method === 'POST')) {
      const _w = workspaceScope(req);
      if (!_w) return sendJson(res, 401, { error: 'Нужен вход.', needAuth: true });
      const goalId = Number(m[1]);
      if (req.method === 'GET') {
        const done = db.getGoalSteps(_w, goalId);
        if (done === null) return sendJson(res, 404, { error: 'Цель не найдена.' });
        return sendJson(res, 200, { goalId, done });
      }
      const body = await readBody(req);
      const done = db.setGoalSteps(_w, goalId, body && body.done);
      if (done === null) return sendJson(res, 404, { error: 'Цель не найдена.' });
      return sendJson(res, 200, { goalId, done });
    }
  }

'''
    anchor3 = "  if (req.method === 'GET' && u.pathname === '/api/analytics') {"
    if s.count(anchor3) != 1:
        errors.append("server.js: якорь /api/analytics не найден")
    else:
        s = s.replace(anchor3, routes.lstrip("\n") + anchor3, 1)
        print("server.js: маршруты вставлены")

io.open(SRV, "w", encoding="utf-8", newline="\n").write(s)

print()
if errors:
    print("ОШИБКИ:")
    for e in errors:
        print("  · " + e)
    raise SystemExit(1)
print("готово: db.js и server.js поправлены локально")
