# Лендинг GOOD Growth (источник)

Собран на Arena (React + Vite + Tailwind, singlefile). Живёт на VPS: /var/www/landing.

## Как изменить лендинг через полгода
1. Правки — в src/App.tsx (тексты/секции) или сразу в dist/index.html (быстрый путь).
2. Полная пересборка: cd landing-src && npm install && npm run build → dist/index.html.
3. Выкладка: скопировать dist/index.html и images/ на VPS в /var/www/landing/ (через ssh-run.js put).
4. nginx маршруты не трогать: / → landing, /app → мастерская, /api → :3000, /public → репо.

## Важно
- dist/index.html уже перепаян: все CTA ведут на /app.
- git push и локальный E:\GOOD-Growth\landing-src — мастер-копия.
- Если npm недоступен — правь dist/index.html напрямую (сборка уже однофайловая).
