import { motion } from "framer-motion";

const pains = [
  "Операторская сложность. Нужно вручную строить сценарии.",
  "Фокус на публикации, а не на росте. Когда публиковать вместо что делать, чтобы расти.",
  "Аналитика без действия. Цифры есть, а выводов нет.",
  "Ценовое недоверие. Высокие тарифы, непонятные лимиты.",
  "Тяжелое подключение. OAuth, developer portals, права доступа.",
  "Фрагментация. Публикация, inbox, approvals - все в разных сервисах.",
];

const answers = [
  "Простота. Ты задаешь цель - система сама формирует рабочий маршрут.",
  "Стратегия. Стратегия становится первым экраном, публикация - следствием.",
  "Аналитика -> Понимание -> Действие. Система говорит: вот что произошло и какой следующий шаг.",
  "Честная цена. Прозрачные границы, предсказуемая отмена, никаких ловушек.",
  "Простое подключение. Максимум сложности - за кулисами. В интерфейсе только Подключено.",
  "Единый контур. Публикация, аналитика, inbox, approvals - в одном месте.",
];

const steps = [
  {
    title: "Шаг 1. Цель.",
    text: "Ты рассказываешь о своем деле. Пять простых вопросов или одна фраза - как удобно.",
  },
  {
    title: "Шаг 2. Стратегия.",
    text: "Система разбирает цель: кто аудитория, какие темы, какой ритм, какие каналы. Это делает живой AI.",
  },
  {
    title: "Шаг 3. Контент.",
    text: "По стратегии система создает посты с текстом и картинками. Ты можешь перегенерировать, удалить, сохранить.",
  },
  {
    title: "Шаг 4. Публикация и рост.",
    text: "Пост уходит в канал. Система собирает метрики, анализирует и говорит, что делать дальше.",
  },
];

const advantages = [
  "Мы управляем ростом, а не публикациями. Другие отвечают когда. Мы отвечаем что делать, чтобы расти.",
  "Мы прячем сложность. OAuth, developer portals и токены остаются за кулисами.",
  "Мы даем следующий шаг. Аналитика заканчивается рекомендацией, а не только цифрами.",
];

export default function App() {
  return (
    <main className="bg-zinc-950 text-zinc-100">
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <motion.img
          src="/images/good-growth-hero.jpg"
          alt="Команда планирует стратегию роста"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.08, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/75 via-zinc-950/50 to-zinc-950" />

        <div className="relative mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
          <motion.p
            className="text-sm uppercase tracking-[0.32em] text-amber-300"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55 }}
          >
            GOOD Growth
          </motion.p>

          <motion.h1
            className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl"
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            От цели - до готовых постов. За один вечер.
          </motion.h1>

          <motion.p
            className="mt-5 max-w-2xl text-base text-zinc-200 sm:text-lg"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            GOOD Growth - это не еще один планировщик. Это система, которая управляет ростом: ты говоришь, чего хочешь,
            а она строит путь, создает контент, публикует и говорит, что делать дальше.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap gap-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <a
              href="#business"
              className="bg-amber-300 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-200"
            >
              У меня свое дело
            </a>
            <a
              href="#partner"
              className="border border-zinc-200/55 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-100 transition hover:border-zinc-100"
            >
              Я работаю с брендами
            </a>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-10">
        <motion.h2
          className="text-3xl font-semibold sm:text-4xl"
          initial={{ y: 28, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
        >
          Почему инструменты не помогают расти?
        </motion.h2>
        <p className="mt-4 max-w-3xl text-zinc-300">
          Мы изучили 10 платформ - Postiz, Buffer, Hootsuite, Sprout Social, SocialPilot, Metricool, Publer, Zoho Social,
          Ayrshare, Make. У всех одна и та же история: они отлично умеют публиковать. Но почти никто не отвечает на вопрос:
          что мне делать, чтобы мой аккаунт рос?
        </p>

        <div className="mt-12 divide-y divide-zinc-800 border-y border-zinc-800">
          {pains.map((item, index) => (
            <motion.div
              key={item}
              className="grid gap-4 py-7 sm:grid-cols-[120px_1fr] sm:gap-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.12 }}
            >
              <p className="text-sm uppercase tracking-[0.24em] text-amber-300">0{index + 1}</p>
              <p className="text-lg text-zinc-200">{item}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <motion.h2
          className="text-3xl font-semibold sm:text-4xl"
          initial={{ y: 28, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.55 }}
        >
          GOOD Growth - система, которая управляет ростом
        </motion.h2>
        <p className="mt-4 max-w-3xl text-zinc-300">
          Мы не строим еще один планировщик. Мы строим систему, где стратегия - первый экран, а публикация - только
          следствие стратегии.
        </p>

        <motion.div
          className="mt-10 divide-y divide-zinc-800 border-y border-zinc-800"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          {answers.map((item, index) => (
            <motion.div
              key={item}
              className="grid gap-4 py-7 sm:grid-cols-[120px_1fr] sm:gap-8"
              initial={{ x: -18, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: index * 0.12 }}
            >
              <p className="text-sm uppercase tracking-[0.24em] text-amber-300">0{index + 1}</p>
              <p className="text-lg text-zinc-200">{item}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <motion.h2
          className="text-3xl font-semibold sm:text-4xl"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.5 }}
        >
          Четыре шага от цели до роста
        </motion.h2>
        <div className="mt-10 divide-y divide-zinc-800 border-y border-zinc-800">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              className="grid gap-4 py-7 sm:grid-cols-[200px_1fr] sm:gap-8"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
            >
              <p className="text-sm uppercase tracking-[0.16em] text-amber-300">{step.title}</p>
              <p className="text-zinc-200">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <motion.h2
          className="text-3xl font-semibold sm:text-4xl"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.5 }}
        >
          Два пути в GOOD Growth
        </motion.h2>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <motion.div
            id="business"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45 }}
          >
            <h3 className="text-2xl font-medium">У меня свое дело</h3>
            <p className="mt-3 text-zinc-300">
              Для владельца бизнеса. Один бренд, один канал, одна цель. Ты заходишь, рассказываешь о деле, получаешь
              стратегию, создаешь посты, публикуешь.
            </p>
            <a
              href="#cta"
              className="mt-6 inline-block border border-zinc-200/55 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition hover:border-zinc-100"
            >
              Начать с нуля
            </a>
          </motion.div>

          <motion.div
            id="partner"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <h3 className="text-2xl font-medium">Я работаю с брендами</h3>
            <p className="mt-3 text-zinc-300">
              Для партнера. Ты ведешь несколько брендов. У каждого своя стратегия, свои каналы, своя аналитика. Ты
              переключаешься между ними в один клик.
            </p>
            <a
              href="#cta"
              className="mt-6 inline-block border border-zinc-200/55 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition hover:border-zinc-100"
            >
              Стать партнером
            </a>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        <motion.h2
          className="text-3xl font-semibold sm:text-4xl"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.5 }}
        >
          Почему GOOD Growth, а не другие?
        </motion.h2>
        <div className="mt-10 divide-y divide-zinc-800 border-y border-zinc-800">
          {advantages.map((item, index) => (
            <motion.p
              key={item}
              className="py-6 text-zinc-200"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
            >
              {item}
            </motion.p>
          ))}
        </div>
      </section>

      <section id="cta" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10">
        <motion.h2
          className="text-3xl font-semibold sm:text-4xl"
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.5 }}
        >
          Готовы рассказать о своем деле?
        </motion.h2>
        <p className="mt-4 max-w-2xl text-zinc-300">Первый пост - бесплатно. Одна цель, один вечер, готовые посты.</p>
        <a
          href="#"
          className="mt-8 inline-block bg-amber-300 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-950 transition hover:bg-amber-200"
        >
          Попробовать бесплатно
        </a>
      </section>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-zinc-400 sm:px-10">
          <p className="text-zinc-200">GOOD Growth - система, которая управляет ростом.</p>
          <p>Связь: hello@go-ood.com</p>
          <p>Сайт: growth.go-ood.com</p>
          <p>© 2026 GOOD Growth</p>
        </div>
      </footer>
    </main>
  );
}