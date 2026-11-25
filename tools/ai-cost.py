# -*- coding: utf-8 -*-
"""Себестоимость AI: читает data/ai-usage.jsonl и считает стоимость.

Цены DeepSeek (за 1 млн токенов), меняются — правь константы:
  вход (cache miss)  0.28 $
  вход (cache hit)   0.028 $
  выход              0.42 $
Курс доллара — константа ниже, тоже правится.
"""
import io
import json
import os
import sys
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "ai-usage.jsonl")

PRICE_IN = 0.28 / 1_000_000      # $ за токен
PRICE_OUT = 0.42 / 1_000_000
USD_RUB = 80.0

CENTS_PER_DAY = 4                # средний тариф в постах/день (для оценки)
POSTS_PER_DAY = CENTS_PER_DAY

if not os.path.exists(PATH):
    print("  логов пока нет: " + PATH)
    print("  учёт включён — цифры появятся после первых генераций")
    raise SystemExit(0)

rows = []
for line in io.open(PATH, encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    try:
        rows.append(json.loads(line))
    except Exception:
        continue

if not rows:
    print("  лог пуст")
    raise SystemExit(0)

tin = sum(r.get("p", 0) for r in rows)
tout = sum(r.get("c", 0) for r in rows)
cost_usd = tin * PRICE_IN + tout * PRICE_OUT
cost_rub = cost_usd * USD_RUB

days = {}
for r in rows:
    d = str(r.get("t", ""))[:10]
    days[d] = days.get(d, 0) + 1
n_days = max(1, len(days))
avg_calls_day = len(rows) / n_days
per_call_rub = cost_rub / len(rows)

print("  вызовов: %d · за дней: %d · в среднем %.1f вызовов/день" % (len(rows), n_days, avg_calls_day))
print("  токенов: вход %s · выход %s" % (format(tin, ","), format(tout, ",")))
print("  стоимость: $%.4f · %.2f ₽" % (cost_usd, cost_rub))
print("  в среднем за вызов: %.3f ₽" % per_call_rub)
print()
print("  оценка на клиента:")
print("    4 поста/день = ~%d вызовов/мес → %.1f ₽/мес" % (POSTS_PER_DAY * 30, per_call_rub * POSTS_PER_DAY * 30))
print("    12 постов/мес (спокойный ритм) → %.1f ₽/мес" % (per_call_rub * 12))
print()
print("  остаётся на «Росте» 490 ₽ с пожизненными 45%%: 269,50 ₽")
print("  себестоимость AI — %.2f%% от этой суммы" % (per_call_rub * POSTS_PER_DAY * 30 / 269.5 * 100))
