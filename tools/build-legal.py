# -*- coding: utf-8 -*-
"""Собирает правовые страницы GOOD Growth: /privacy /terms /offer /cookies.
Русский текст лежит в HTML, английский — в словаре (data-i18n)."""
import io, json, os, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = os.path.join(ROOT, "live-pages")
I18N = os.path.join(ROOT, "public", "i18n")
UPDATED_RU = "Обновлено 18 ноября 2026"
UPDATED_EN = "Last updated 18 November 2026"

PAGES = {
    "privacy": {
        "path": "/privacy",
        "file": "privacy.html",
        "ru_title": "Политика конфиденциальности",
        "en_title": "Privacy Policy",
        "ru_lead": "Что мы собираем, зачем и что с этим не делаем. Простыми словами.",
        "en_lead": "What we collect, why, and what we never do with it. In plain words.",
        "sections": [
            ("Кто мы", "Who we are",
             "GOOD Growth — мастерская системного роста: помогает сформулировать цель, собрать стратегию и выпускать посты.",
             "GOOD Growth is a workshop of systematic growth: it helps you set a goal, build a strategy and publish posts."),
            ("Какие данные мы собираем", "What data we collect",
             "Email и имя при регистрации, тексты целей и постов, названия брендов и каналов, загруженные и сгенерированные картинки, отметки об оплате. Технические данные: IP-адрес, браузер, время входа — для безопасности.",
             "Email and name at sign-up, your goals and post texts, brand and channel names, uploaded and generated images, payment records. Technical data: IP address, browser, sign-in time — for security."),
            ("Зачем мы это используем", "Why we use it",
             "Чтобы работал кабинет: вход, генерация текстов и картинок, публикация по расписанию, поддержка и защита от взлома. Мы не используем твои данные для рекламы и не продаём их.",
             "To run your workspace: sign-in, text and image generation, scheduled publishing, support and protection from abuse. We never use your data for advertising and never sell it."),
            ("На каком основании", "On what basis",
             "Ты даёшь согласие при регистрации, а также мы выполняем договор с тобой — оказание услуг сервиса.",
             "You consent when you sign up, and we also perform our contract with you — providing the service."),
            ("Где храним", "Where we store it",
             "На нашем собственном сервере. Доступ к базе ограничен владельцем сервиса. Мы делаем резервные копии, чтобы данные не пропали.",
             "On our own server. Access to the database is limited to the service owner. We keep backups so your data is not lost."),
            ("Кому передаём", "Who we share it with",
             "Только тем, без кого не работает сервис: Telegram — для публикации постов, почтовый провайдер — для писем о входе и сбросе пароля, платёжная система — для оплаты. Данные не продаются и не передаются рекламным сетям.",
             "Only to those we cannot work without: Telegram for publishing posts, an email provider for sign-in and password emails, a payment provider for payments. Data is never sold or given to ad networks."),
            ("Сколько храним", "How long we keep it",
             "Пока аккаунт существует. Удалил аккаунт — удаляем данные, кроме того, что обязаны хранить по закону (например, отметки об оплате).",
             "As long as your account exists. Delete the account and we delete the data, except what the law requires us to keep (for example, payment records)."),
            ("Твои права", "Your rights",
             "Ты можешь посмотреть свои данные, исправить их, выгрузить или удалить. Напиши на hello@growth.go-ood.com — ответим и сделаем.",
             "You can view, correct, export or delete your data. Write to hello@growth.go-ood.com — we will reply and do it."),
            ("Cookie", "Cookies",
             "Мы используем несколько необходимых cookie: вход, язык, тема. Подробнее — на странице «Политика cookie».",
             "We use a few necessary cookies: session, language, theme. More on the cookie policy page."),
            ("Дети", "Children",
             "Сервис для взрослых: мы не собираем данные людей младше 16 лет осознанно.",
             "The service is for adults: we do not knowingly collect data from anyone under 16."),
            ("Изменения", "Changes",
             "Если политика изменится, мы обновим дату вверху и, при существенных изменениях, предупредим в кабинете.",
             "If this policy changes we update the date above and, for material changes, notify you in the workspace."),
        ],
    },
    "terms": {
        "path": "/terms",
        "file": "terms.html",
        "ru_title": "Пользовательское соглашение",
        "en_title": "Terms of Service",
        "ru_lead": "Правила игры: что можно, чего нельзя и за что отвечает каждая сторона.",
        "en_lead": "The rules: what is allowed, what is not, and who is responsible for what.",
        "sections": [
            ("Что такое GOOD Growth", "What GOOD Growth is",
             "Сервис, который помогает превратить цель в стратегию и публиковать посты по расписанию. Часть текстов и картинок создаёт искусственный интеллект.",
             "A service that turns a goal into a strategy and publishes posts on a schedule. Some texts and images are created by artificial intelligence."),
            ("Аккаунт", "Your account",
             "Аккаунт личный. Пароль храни в тайне и не передавай другим. Если заметил вход постороннего — сразу смени пароль и напиши нам.",
             "An account is personal. Keep your password private and do not share it. If you notice someone else signed in, change the password and tell us."),
            ("Что можно и чего нельзя", "What is allowed and what is not",
             "Нельзя публиковать незаконное, спам, чужие тексты и картинки без прав, оскорбления. Мы можем приостановить аккаунт, который нарушает эти правила.",
             "Do not publish anything illegal, spam, other people's texts and images without rights, or abuse. We may suspend an account that breaks these rules."),
            ("Твой контент остаётся твоим", "Your content stays yours",
             "Тексты, картинки и цели принадлежат тебе. Мы обрабатываем их только чтобы сервис работал: сохранить, показать, опубликовать по твоему расписанию.",
             "Your texts, images and goals belong to you. We process them only so the service works: store, show and publish on your schedule."),
            ("ИИ может ошибаться", "AI can be wrong",
             "Проверяй то, что создаёт сервис, перед публикацией. Мы делаем разбор и посты аккуратно, но не обещаем, что каждый текст идеален для твоей аудитории.",
             "Check what the service creates before publishing. We build reviews and posts carefully, but we do not promise every text is perfect for your audience."),
            ("Тарифы и оплата", "Plans and payment",
             "Платный тариф — по цене, указанной на странице «Тарифы». Списывание — за выбранный период. Если не оплатил, аккаунт остаётся, но платные возможности могут ограничиться.",
             "A paid plan costs what the Plans page says. Charges cover the chosen period. If you do not pay, your account stays but paid features may be limited."),
            ("Возврат", "Refunds",
             "Если сервис не работал и ты не получил услугу — напиши на hello@growth.go-ood.com, разберём и вернём оплату за неиспользованный период.",
             "If the service did not work and you did not receive it, write to hello@growth.go-ood.com — we will review and refund the unused period."),
            ("Работа сервиса", "Service availability",
             "Мы стараемся, чтобы сайт работал всегда, но возможны паузы на обновления и сбои вне нашего контроля.",
             "We work to keep the site available always, but updates and outages beyond our control may cause pauses."),
            ("Ответственность", "Liability",
             "Мы отвечаем за работу сервиса в пределах оплаченного периода. Мы не отвечаем за решения, которые ты принял вне сервиса, и за публикации, если ты их одобрил.",
             "We are responsible for the service within the paid period. We are not responsible for decisions you make outside the service or for posts you approved."),
            ("Прекращение", "Ending the agreement",
             "Ты можешь удалить аккаунт в любой момент. Мы можем закрыть доступ при нарушении правил, предупредив, если это возможно.",
             "You can delete your account at any time. We may close access for breaking the rules, warning you first where possible."),
            ("Изменения", "Changes",
             "Мы можем обновлять соглашение. Новая версия действует с даты вверху, о существенных изменениях предупредим.",
             "We may update these terms. A new version applies from the date above; we will notify you of material changes."),
        ],
    },
    "offer": {
        "path": "/offer",
        "file": "offer.html",
        "ru_title": "Публичная оферта",
        "en_title": "Public Offer",
        "ru_lead": "Договор на оказание услуг GOOD Growth. Оплачивая тариф, ты принимаешь эти условия.",
        "en_lead": "The GOOD Growth service agreement. By paying for a plan you accept these terms.",
        "sections": [
            ("Кто оказывает услуги", "Who provides the service",
             "Исполнитель — владелец сервиса GOOD Growth. Реквизиты указаны внизу этой страницы и заполняются до открытия продаж.",
             "The provider is the owner of the GOOD Growth service. Company details are at the bottom of this page and are completed before sales open."),
            ("Предмет", "Subject",
             "Исполнитель даёт доступ к сервису: разбор цели, стратегия, создание текстов и картинок, публикация по расписанию. Заказчик платит по выбранному тарифу.",
             "The provider gives access to the service: goal review, strategy, text and image creation, scheduled publishing. The customer pays for the chosen plan."),
            ("Цена и порядок оплаты", "Price and payment",
             "Цены — на странице «Тарифы», в рублях. Оплата за период, который выбрал заказчик. Услуга считается оказанной, когда доступ предоставлен.",
             "Prices are on the Plans page, in rubles. Payment covers the period the customer chooses. The service is considered provided once access is granted."),
            ("Как проходит оказание", "How the service is provided",
             "Доступ сразу после оплаты. Заказчик работает в кабинете сам; поддержка — по почте hello@growth.go-ood.com.",
             "Access arrives right after payment. The customer works in the workspace; support is by email at hello@growth.go-ood.com."),
            ("Возврат", "Refund",
             "Если услуга не оказана — оплата возвращается за неиспользованный период по заявлению на hello@growth.go-ood.com.",
             "If the service is not provided, payment for the unused period is refunded on a request to hello@growth.go-ood.com."),
            ("Ответственность", "Liability",
             "Стороны отвечают по закону страны Исполнителя. Исполнитель не отвечает за содержания публикаций, которые заказчик одобрил.",
             "The parties are liable under the provider's country law. The provider is not responsible for content of publications the customer approved."),
            ("Реквизиты", "Company details",
             "Заполняются до открытия платных продаж: наименование, ИНН, адрес, почта для документов.",
             "Completed before paid sales open: legal name, tax ID, address, email for documents."),
        ],
    },
    "cookies": {
        "path": "/cookies",
        "file": "cookies.html",
        "ru_title": "Политика cookie",
        "en_title": "Cookie Policy",
        "ru_lead": "Какие cookie мы используем и как их отключить.",
        "en_lead": "Which cookies we use and how to turn them off.",
        "sections": [
            ("Что это", "What they are",
             "Cookie — маленький файл, который сайт сохраняет в браузере, чтобы помнить тебя между страницами и визитами.",
             "A cookie is a small file the site stores in your browser so it remembers you between pages and visits."),
            ("Какие мы используем", "Which ones we use",
             "Только необходимые: сессия входа (gg_session), выбранный язык (gg_lang), тема оформления, отметка о согласии с этим баннером. Сторонних рекламных трекеров нет.",
             "Only essential ones: your session (gg_session), chosen language (gg_lang), theme, and the note that you accepted this banner. There are no third-party ad trackers."),
            ("Зачем", "Why",
             "Без них сайт не запомнит вход и язык, и придётся вводить пароль каждый раз.",
             "Without them the site would forget your sign-in and language, and you would type the password every time."),
            ("Аналитика", "Analytics",
             "Мы считаем статистику на своём сервере по обезличенным событиям. Персональные данные в аналитику не передаются.",
             "We count statistics on our own server from anonymous events. No personal data goes into analytics."),
            ("Как отключить", "How to turn them off",
             "В настройках браузера можно запретить cookie. Тогда вход и сохранение настроек работать не будут.",
             "Your browser settings can block cookies. Then sign-in and saved settings will stop working."),
        ],
    },
}

TPL = """<!doctype html>
<html lang="ru" data-lang="ru">
<head>
<meta charset="utf-8">
<title>{title} · GOOD Growth</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" data-i18n-attr="content:legal.{key}.meta" content="{lead}">
<script>(function(){{try{{
  var l=localStorage.getItem('gg_lang')||'';
  var q=(location.search.match(/[?&]lang=([a-z]{{2}})/i)||[])[1];
  var want=(q||l||'').toLowerCase();
  if(want==='en'){{
    var r=document.documentElement;
    r.className+=' gg-i18n-wait';
    document.write('<script src="/i18n/en.dict.js"><\\/script>');
    setTimeout(function(){{try{{r.classList.remove('gg-i18n-wait');}}catch(e){{}}}},2500);
  }}
}}catch(e){{}}}})();</script>
<style>html.gg-i18n-wait body{{visibility:hidden}}</style>
<link rel="stylesheet" href="/style-c.css">
<link rel="stylesheet" href="/theme.css">
<style>
:root{{
  --bg:#07080A; --surface:#101114; --line:rgba(236,226,206,.12);
  --ink:#F4F1EA; --mut:#A29C90; --copper:#E8A54F; --copper-lt:#F3C583;
}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);
  font-family:'Golos Text',system-ui,-apple-system,'Segoe UI',sans-serif;
  -webkit-font-smoothing:antialiased}}
a{{color:inherit}}
.lg-top{{max-width:1120px;margin:0 auto;padding:26px 28px;display:flex;align-items:center;gap:16px}}
.lg-mark{{display:flex;align-items:center;gap:12px;text-decoration:none}}
.lg-mark b{{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:500;letter-spacing:.01em}}
.lg-mark span{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.22em;
  text-transform:uppercase;color:var(--mut)}}
.lg-back{{margin-left:auto;font-size:13px;color:var(--mut);text-decoration:none;
  border-bottom:1px dotted rgba(232,165,79,.45);padding-bottom:1px}}
.lg-back:hover{{color:var(--copper)}}
.lg-wrap{{max-width:820px;margin:0 auto;padding:20px 28px 90px}}
.lg-eyebrow{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.24em;
  text-transform:uppercase;color:var(--copper);margin:24px 0 12px;display:flex;align-items:center;gap:10px}}
.lg-eyebrow::before{{content:'';width:26px;height:1px;background:rgba(232,165,79,.6)}}
h1{{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:clamp(30px,4vw,44px);
  line-height:1.12;letter-spacing:-.015em;margin:0 0 14px}}
.lg-lead{{font-size:16px;line-height:1.65;color:var(--mut);margin:0 0 10px;max-width:640px}}
.lg-date{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.14em;
  text-transform:uppercase;color:#8A857C;margin:18px 0 0}}
.lg-sec{{border-top:1px solid var(--line);padding:24px 0}}
.lg-sec:first-of-type{{margin-top:34px}}
.lg-sec h2{{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:0 0 8px}}
.lg-sec p{{margin:0;font-size:14.5px;line-height:1.75;color:#CFC9BD;max-width:700px}}
.lg-note{{margin-top:34px;border:1px solid rgba(232,165,79,.28);background:rgba(232,165,79,.06);
  border-radius:14px;padding:18px 20px;font-size:13.5px;line-height:1.7;color:#D8D2C6}}
.lg-note b{{color:var(--copper-lt);font-weight:500}}
.lg-foot{{max-width:1120px;margin:0 auto;padding:26px 28px 60px;border-top:1px solid var(--line);
  display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center}}
.lg-foot a{{font-size:12.5px;color:var(--mut);text-decoration:none;border-bottom:1px dotted rgba(236,226,206,.25);padding-bottom:1px}}
.lg-foot a:hover{{color:var(--copper)}}
.lg-foot .sp{{margin-left:auto;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;
  letter-spacing:.16em;text-transform:uppercase;color:#7C776E}}
@media(max-width:640px){{ .lg-wrap{{padding:14px 20px 70px}} .lg-top{{padding:20px}} }}
</style>
</head>
<body>
<header class="lg-top">
  <a class="lg-mark" href="/">
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 26V7l10 12L26 7v19" fill="none" stroke="#E8A54F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <b>GOOD Growth</b><span data-i18n="rail.tagline">Мастерская роста</span>
  </a>
  <a class="lg-back" href="/app" data-i18n="legal.back">← В кабинет</a>
</header>

<main class="lg-wrap">
  <p class="lg-eyebrow" data-i18n="legal.eyebrow">Правовой документ</p>
  <h1 data-i18n="legal.{key}.title">{title}</h1>
  <p class="lg-lead" data-i18n="legal.{key}.lead">{lead}</p>
  <p class="lg-date" data-i18n="legal.date">{updated}</p>
{sections}
  <div class="lg-note"><b data-i18n="legal.noteB">Важно:</b> <span data-i18n="legal.{key}.note">{note}</span></div>
</main>

<footer class="lg-foot">
  <a href="/privacy" data-i18n="legal.nav.privacy">Политика конфиденциальности</a>
  <a href="/terms" data-i18n="legal.nav.terms">Соглашение</a>
  <a href="/offer" data-i18n="legal.nav.offer">Оферта</a>
  <a href="/cookies" data-i18n="legal.nav.cookies">Cookie</a>
  <span class="sp">© MMXXVI · GOOD Growth</span>
</footer>
<script src="/i18n/i18n.js"></script>
<script src="/legal.js" defer></script>
</body>
</html>
"""

NOTES = {
    "privacy": ("Мы не продаём данные и не отдаём их рекламным сетям. Это не маркетинговая фраза, а техническое правило: в коде нет рекламных трекеров.",
                "We do not sell data or give it to ad networks. That is not a slogan but a technical rule: there are no ad trackers in the code."),
    "terms": ("Не публикуй то, за что потом будет стыдно тебе и нам. Сервис помогает делать хорошо, но решение выпустить пост — твоё.",
              "Do not publish anything that would embarrass you or us later. The service helps you do good work, but the decision to publish is yours."),
    "offer": ("Реквизиты появятся до открытия платных продаж. Пока продажи не открыты, тарифы на странице «Тарифы» — информационные.",
              "Company details will appear before paid sales open. Until then the plans on the Plans page are informational."),
    "cookies": ("Мы не используем рекламные cookie и не передаём тебя рекламным сетям.",
                "We use no advertising cookies and do not hand you over to ad networks."),
}

TITLES = {}
for key, page in PAGES.items():
    parts = []
    for n, (h_ru, h_en, p_ru, p_en) in enumerate(page["sections"], 1):
        parts.append(
            '  <section class="lg-sec">\n    <h2 data-i18n="legal.%s.%d.h">%s</h2>\n'
            '    <p data-i18n="legal.%s.%d.p">%s</p>\n  </section>' % (key, n, h_ru, key, n, p_ru))
    note_ru, note_en = NOTES[key]
    html = TPL.format(
        title=page["ru_title"], lead=page["ru_lead"], updated=UPDATED_RU,
        sections="\n".join(parts), key=key, note=note_ru)
    io.open(os.path.join(LIVE, page["file"]), "w", encoding="utf-8", newline="\n").write(html)
    TITLES[key] = (page["ru_title"], page["en_title"])

# словарь
ru = json.load(io.open(os.path.join(I18N, "ru.json"), encoding="utf-8"))
en = json.load(io.open(os.path.join(I18N, "en.json"), encoding="utf-8"))
ru["legal.eyebrow"] = "Правовой документ"; en["legal.eyebrow"] = "Legal document"
ru["legal.date"] = UPDATED_RU; en["legal.date"] = UPDATED_EN
ru["legal.back"] = "← В кабинет"; en["legal.back"] = "← Workspace"
ru["legal.noteB"] = "Важно:"; en["legal.noteB"] = "Important:"
ru["legal.nav.privacy"] = "Политика конфиденциальности"; en["legal.nav.privacy"] = "Privacy Policy"
ru["legal.nav.terms"] = "Соглашение"; en["legal.nav.terms"] = "Terms"
ru["legal.nav.offer"] = "Оферта"; en["legal.nav.offer"] = "Offer"
ru["legal.nav.cookies"] = "Cookie"; en["legal.nav.cookies"] = "Cookies"

for key, page in PAGES.items():
    ru["legal.%s.title" % key] = page["ru_title"]
    en["legal.%s.title" % key] = page["en_title"]
    ru["legal.%s.lead" % key] = page["ru_lead"]
    en["legal.%s.lead" % key] = page["en_lead"]
    ru["legal.%s.meta" % key] = page["ru_lead"]
    en["legal.%s.meta" % key] = page["en_lead"]
    note_ru, note_en = NOTES[key]
    ru["legal.%s.note" % key] = note_ru
    en["legal.%s.note" % key] = note_en
    for n, (h_ru, h_en, p_ru, p_en) in enumerate(page["sections"], 1):
        ru["legal.%s.%d.h" % (key, n)] = h_ru
        en["legal.%s.%d.h" % (key, n)] = h_en
        ru["legal.%s.%d.p" % (key, n)] = p_ru
        en["legal.%s.%d.p" % (key, n)] = p_en

# подвал сайта и баннер cookie
ru["footer.legal"] = "Документы"; en["footer.legal"] = "Documents"
ru["cookie.text"] = "Мы используем cookie, чтобы сайт работал: вход, язык, тема. Без рекламных трекеров."
en["cookie.text"] = "We use cookies to keep the site working: sign-in, language, theme. No advertising trackers."
ru["cookie.accept"] = "Принять"; en["cookie.accept"] = "Accept"
ru["cookie.more"] = "Подробнее"; en["cookie.more"] = "Learn more"

io.open(os.path.join(I18N, "ru.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(ru, ensure_ascii=False, indent=2))
io.open(os.path.join(I18N, "en.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(en, ensure_ascii=False, indent=2))


def build_dict(lang):
    data = json.load(io.open(os.path.join(I18N, "%s.json" % lang), encoding="utf-8"))
    extra = ""
    if lang == "en":
        _ru = json.load(io.open(os.path.join(I18N, "ru.json"), encoding="utf-8"))
        norm = lambda v: " ".join(str(v).split())
        m = {norm(v): data[k] for k, v in _ru.items()
             if isinstance(v, str) and isinstance(data.get(k), str) and data[k] != v}
        extra = "window.__GG_RU2EN=%s;" % json.dumps(m, ensure_ascii=False, separators=(",", ":"))
    out = ("/* GOOD Growth · синхронный словарь %s */\nwindow.__GG_DICT_LANG=%s;window.__GG_JSON=%s;%s\n") % (
        lang, json.dumps(lang), json.dumps(data, ensure_ascii=False, separators=(",", ":")), extra)
    io.open(os.path.join(I18N, "%s.dict.js" % lang), "w", encoding="utf-8", newline="\n").write(out)


build_dict("en"); build_dict("ru")
print("  страниц собрано:", len(PAGES), "· ключей в словаре:", len(ru))
