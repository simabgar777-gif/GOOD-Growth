"""Перевод блока «формат и модель» (Order 87) на наш i18n.

Их разметка пришла без data-i18n — 15 строк. Ставим ключи, чтобы словарь
управлял ими так же, как всем остальным.
"""
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(BASE, "live-pages", "index.html")
DICT = os.path.join(BASE, "public", "i18n", "ru.json")

KEYS = {
    "o87.model": "Модель",
    "o87.fast": "Быстрая",
    "o87.fastHint": "10 ₽ · просто и быстро",
    "o87.smart": "Умная",
    "o87.smartHint": "30 ₽ · глубоко",
    "o87.creative": "Креативная",
    "o87.creativeHint": "50 ₽ · необычно",
    "o87.format": "Формат",
    "o87.text": "Только текст",
    "o87.textHint": "0 ₽",
    "o87.image": "С картинкой",
    "o87.imageHint": "+5 ₽ · нарисуем",
    "o87.video": "С видео",
    "o87.videoHint": "+100 ₽ · 5 сек",
    "o87.costHint": "от месячного лимита",
    "o87.reuse": "Находки в твоих старых постах",
    "o87.ariaModel": "Модель генерации",
    "o87.ariaFormat": "Формат поста",
}

# (что заменить, на что заменить) — только внутри блока Order 87
PAIRS = [
    ('<p class="ggf-label">Модель</p>',
     '<p class="ggf-label" data-i18n="o87.model">Модель</p>'),
    ('aria-label="Модель генерации"',
     'aria-label="Модель генерации" data-i18n-attr="aria-label:o87.ariaModel"'),
    ('aria-label="Формат поста"',
     'aria-label="Формат поста" data-i18n-attr="aria-label:o87.ariaFormat"'),
    ('data-profile="fast" aria-pressed="false">Быстрая<small>10 ₽ · просто и быстро</small>',
     'data-profile="fast" aria-pressed="false"><span data-i18n="o87.fast">Быстрая</span>'
     '<small data-i18n="o87.fastHint">10 ₽ · просто и быстро</small>'),
    ('data-profile="smart" aria-pressed="true">Умная<small>30 ₽ · глубоко</small>',
     'data-profile="smart" aria-pressed="true"><span data-i18n="o87.smart">Умная</span>'
     '<small data-i18n="o87.smartHint">30 ₽ · глубоко</small>'),
    ('data-profile="creative" aria-pressed="false">Креативная<small>50 ₽ · необычно</small>',
     'data-profile="creative" aria-pressed="false"><span data-i18n="o87.creative">Креативная</span>'
     '<small data-i18n="o87.creativeHint">50 ₽ · необычно</small>'),
    ('<p class="ggf-label" style="margin-top:14px;">Формат</p>',
     '<p class="ggf-label" style="margin-top:14px;" data-i18n="o87.format">Формат</p>'),
    ('data-format="text" aria-pressed="true">Только текст<small>0 ₽</small>',
     'data-format="text" aria-pressed="true"><span data-i18n="o87.text">Только текст</span>'
     '<small data-i18n="o87.textHint">0 ₽</small>'),
    ('data-format="image" aria-pressed="false">С картинкой<small>+5 ₽ · нарисуем</small>',
     'data-format="image" aria-pressed="false"><span data-i18n="o87.image">С картинкой</span>'
     '<small data-i18n="o87.imageHint">+5 ₽ · нарисуем</small>'),
    ('data-format="video" aria-pressed="false">С видео<small>+100 ₽ · 5 сек</small>',
     'data-format="video" aria-pressed="false"><span data-i18n="o87.video">С видео</span>'
     '<small data-i18n="o87.videoHint">+100 ₽ · 5 сек</small>'),
    ('<span id="ggCostPct">от месячного лимита</span>',
     '<span id="ggCostPct" data-i18n="o87.costHint">от месячного лимита</span>'),
    ('<p class="ggf-label">Находки в твоих старых постах</p>',
     '<p class="ggf-label" data-i18n="o87.reuse">Находки в твоих старых постах</p>'),
]


def main():
    s = io.open(HTML, encoding="utf-8").read()
    if "o87.model" in s:
        print("уже переведено — пропуск")
        return 0
    applied = 0
    for old, new in PAIRS:
        n = s.count(old)
        if n == 1:
            s = s.replace(old, new)
            applied += 1
        elif n == 0:
            print("  ! не найдено:", old[:60])
        else:
            print("  ! встречается %d раз: %s" % (n, old[:50]))
    io.open(HTML, "w", encoding="utf-8", newline="").write(s)

    d = json.load(io.open(DICT, encoding="utf-8"))
    added = sum(1 for k in KEYS if k not in d)
    d.update(KEYS)
    d["_meta"]["keys"] = len([k for k in d if not k.startswith("_")])
    d["_meta"]["pages"] = sorted({k.split(".")[0] for k in d if not k.startswith("_")})
    io.open(DICT, "w", encoding="utf-8", newline="\n").write(
        json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print("замен применено: %d из %d · ключей добавлено: %d · всего %d"
          % (applied, len(PAIRS), added, d["_meta"]["keys"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
