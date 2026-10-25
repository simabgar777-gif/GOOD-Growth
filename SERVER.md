# Карта сервера GOOD Growth

> **Зачем это здесь.** Состояние сервера жило в одном человеке. Если он недоступен —
> выкладка стоит. Этот файл и `deploy.sh` делают выкладку **не зависящей от людей**.
>
> **Правило:** всё, что знаешь про сервер — пиши сюда. Не в чат.

---

## Что известно точно

| Что | Значение | Как проверено |
|---|---|---|
| Домен приложения | `growth.go-ood.com` | отвечает 200 |
| Страницы приложения | `/var/www/app/` | из доклада Заи |
| Лендинг | `/var/www/landing/` | из доклада Заи |
| Бэкапы | `/root/bak/` | из доклада Заи |
| Веб-сервер | nginx | `nginx -t` / `nginx -s reload` |
| Приложение | `server.js` (Node) | из доклада Заи |
| Репозиторий | `github.com/simabgar777-gif/GOOD-Growth` | ветка `main` |

### Маршруты (nginx отдаёт файл по пути без `.html`)

| Адрес | Файл | Код |
|---|---|---|
| `/` | лендинг (не наш) | 200 |
| `/app` | `index.html` | 200 |
| `/app/strategy` | `index.html` | 200 |
| `/app/posts` | `posts.html` | 200 |
| `/app/schedule` | `schedule.html` | 200 |
| `/app/analytics` | `analytics.html` | 200 |
| `/app/channels` | `channels.html` | 200 |
| `/app/billing` | `billing.html` | 200 |
| `/app/onboard` | `onboard.html` | 200 |
| `/partner` | `partner.html` | 200 |
| `/partner/info` | `info.html` | 200 |
| `/partner/analytics` | `analytics.html` | 200 |
| `/partner/team` | `team.html` | 200 |
| `/partner/channels` | `channels.html` | 200 |
| `/profile` | `profile.html` | 200 |
| `/login` · `/signup` · `/pricing` · `/waitlist` | одноимённые `.html` | 200 |
| `/forgot-password` · `/reset-password` · `/accept-invite` | одноимённые `.html` | 200 |

### Статика, без которой страницы ломаются

| Файл | Что делает | Где должен лежать |
|---|---|---|
| `style-c.css` | токены и вид | `/var/www/app/` |
| `theme.css` | светлая тема | `/var/www/app/` |
| `theme.js` | переключение темы | `/var/www/app/` |
| `blocks.css` | компоненты блоков | `/var/www/app/` |
| `rail.css` | левая панель | `/var/www/app/` |
| `rail.js` | поведение панели | `/var/www/app/` |
| `i18n/ru.json` + `i18n/i18n.js` | словарь и движок | `/var/www/app/i18n/` |
| `gg-header.js` | шапка (правит Зая) | `/var/www/app/` |
| `public/app.js` | логика мастерской | `/var/www/app/public/` |

---

## Что нужно выяснить (заполнить)

- [ ] **Точный путь** страниц: `/var/www/app/` — верно?
- [ ] Есть ли на сервере **рабочая копия git** (например `/opt/goodgrowth`)?
      Если нет — `deploy.sh` создаст её сам, но нужен доступ к GitHub с сервера
      (публичный репозиторий или ключ/токен).
- [ ] Где лежит **конфиг nginx** (`/etc/nginx/sites-enabled/…`) и есть ли там
      правила для `/app` → `index.html`?
- [ ] **`server.js`**: как запущен (systemd? pm2? forever?), как перезапускается?
- [ ] Где **`.env`** и база (`data/*.db`)? Они **не в git** — при выкладке не трогаются.
- [ ] Как часто и куда делаются **бэкапы** сейчас?

---

## Как выложить без Заи

```bash
# на сервере, из папки с deploy.sh
sudo ./deploy.sh                          # origin/main
sudo ./deploy.sh jessie/i18n-login        # конкретная ветка
```

Скрипт: бэкап → `git reset --hard origin/<ветка>` → копирование → `nginx -t` → reload → проверка 200.
**При любой ошибке останавливается** и пишет команду отката.

## Откат

```bash
cp -a /root/bak/deploy-<метка>/. /var/www/app/
nginx -s reload
```

---

## Правила, чтобы не сломать

1. **Не удалять из HTML `id`, за которыми ходит `app.js`** — их **43**.
   Карта: `ID-MAP.md`. Прятать — можно. Удалять — нет.
2. **Файлы между людьми — только через репозиторий.** Папка на чьём-то диске теряется.
3. **Каждая выкладка — бэкап.** `deploy.sh` делает его сам.
4. **`server.js` не трогать без нужды** — тогда перезапуск не нужен.
