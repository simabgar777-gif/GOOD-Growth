# -*- coding: utf-8 -*-
"""«Датчик» целостности GOOD Growth.

Что проверяет:
  1. локальный репозиторий — все файлы под git (sha256), новые/удалённые/изменённые
  2. сервер — server.js, db.js и страницы в /var/www/app (md5 через ssh)

Как пользоваться:
  python tools/guard.py snapshot   # запомнить текущее состояние (эталон)
  python tools/guard.py check      # сравнить с эталоном и показать расхождения

Выход: код 0 — всё совпадает; код 1 — есть расхождения (или сервер недоступен).
"""
import hashlib
import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "tools", ".guard-baseline.json")
KEY = os.path.join(os.path.dirname(ROOT), "..", "refs", "timeweb", "ssh", "gg_deploy")
KEY = os.path.normpath(os.path.join(ROOT, "..", "..", "refs", "timeweb", "ssh", "gg_deploy"))
HOST = "root@129.101.118.19"
SERVER_FILES = [
    "/opt/goodgrowth/repo/server.js",
    "/opt/goodgrowth/repo/db.js",
    "/opt/goodgrowth/repo/public/app.js",
    "/var/www/app/index.html",
    "/var/www/app/partner.html",
    "/var/www/app/login.html",
    "/var/www/app/strategy.js",
]


def run(cmd, timeout=60):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                           encoding="utf-8", errors="replace")
        return p.returncode, p.stdout, p.stderr
    except Exception as e:
        return 1, "", str(e)


def repo_files():
    rc, out, _ = run(["git", "-C", ROOT, "ls-files"])
    if rc != 0:
        return []
    return [f for f in out.splitlines() if f.strip()]


def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def local_state():
    state = {}
    for rel in repo_files():
        if rel.endswith(".guard-baseline.json"):
            continue
        full = os.path.join(ROOT, rel)
        if os.path.isfile(full):
            state[rel] = file_hash(full)
    return state


def server_state():
    if not os.path.exists(KEY):
        return {}, "нет ключа ssh"
    cmd = ["ssh", "-i", KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
           "-o", "ConnectTimeout=20", HOST, "md5sum " + " ".join(SERVER_FILES)]
    rc, out, err = run(cmd, timeout=90)
    if rc != 0:
        return {}, (err or "ssh не ответил")[:120]
    state = {}
    for line in out.splitlines():
        parts = line.split()
        if len(parts) == 2:
            state[parts[1]] = parts[0]
    return state, None


def snapshot():
    srv, err = server_state()
    old = {}
    if os.path.exists(BASE):
        try:
            old = json.loads(io.open(BASE, encoding="utf-8").read())
        except Exception:
            old = {}
    if err:
        print("  сервер сейчас недоступен (%s) — оставляю прежние серверные хеши" % err)
        srv = old.get("server", {})
    data = {"local": local_state(), "server": srv}
    io.open(BASE, "w", encoding="utf-8", newline="\n").write(json.dumps(data, ensure_ascii=False, indent=1))
    print("  эталон записан: %d локальных файлов, %d серверных" % (len(data["local"]), len(data["server"])))
    return 0


def check():
    if not os.path.exists(BASE):
        print("  эталона нет — сначала: python tools/guard.py snapshot")
        return 1
    base = json.loads(io.open(BASE, encoding="utf-8").read())
    cur_local = local_state()
    problems = []

    for rel, h in cur_local.items():
        if rel not in base["local"]:
            problems.append(("новый файл", rel, ""))
        elif base["local"][rel] != h:
            problems.append(("изменён", rel, ""))
    for rel in base["local"]:
        if rel not in cur_local:
            problems.append(("удалён", rel, ""))

    cur_srv, err = server_state()
    if err:
        problems.append(("сервер недоступен", err, ""))
    else:
        for path, h in cur_srv.items():
            if path not in base["server"]:
                problems.append(("новый на сервере", path, ""))
            elif base["server"][path] != h:
                problems.append(("изменён на сервере", path, ""))

    if not problems:
        print("  всё совпадает с эталоном ✓ (%d локальных, %d серверных)" % (len(cur_local), len(cur_srv)))
        return 0

    print("  РАСХОЖДЕНИЯ (%d):" % len(problems))
    for kind, what, extra in problems[:40]:
        print("   · %-20s %s %s" % (kind, what, extra))
    return 1


if __name__ == "__main__":
    action = (sys.argv[1] if len(sys.argv) > 1 else "check").lower()
    if action == "snapshot":
        sys.exit(snapshot())
    sys.exit(check())
