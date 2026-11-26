/*
 * NedoSpot — главная: русский / английский.
 * Русский текст берётся прямо из страницы (метки data-i и data-i-attr),
 * английский — из словаря ниже. Выбор хранится в localStorage «ns-lang» —
 * тот же, что на страницах документов.
 */
(function () {
  'use strict';

  var root = document.documentElement;

  /* Строки, которые подставляет скрипт (их нет в разметке) */
  var RU_JS = {
    'meta.title': 'NedoSpot — Музыка. Ничего лишнего.',
    'meta.desc': 'NedoSpot — музыкальный плеер для Windows без рекламы: живые тексты песен, темы, плейлисты, караоке и ранги за музыку.',
    'meta.ogdesc': 'Музыкальный плеер для Windows без рекламы и лишнего шума.',
    'menu.open': 'Открыть меню',
    'menu.close': 'Закрыть меню',
    'like.off': 'В любимые',
    'like.on': 'В любимых',
    'theme.glass': 'Стекло',
    'theme.neon': 'Неон',
    'theme.aurora': 'Аврора',
    'theme.paper': 'Бумага',
    'theme.more': '+ ещё 3 темы',
    'rank.0': 'Железо', 'rank.1': 'Бронза', 'rank.2': 'Серебро', 'rank.3': 'Золото', 'rank.4': 'Платина',
    'rank.5': 'Алмаз', 'rank.6': 'Мастер', 'rank.7': 'Грандмастер', 'rank.8': 'Претендент',
    'rank.xp': 'опыт: ',
    'quest.1': 'Задание: Создать плейлист',
    'quest.2': 'Задание: 3 трека в избранное',
    'quest.3': 'Достижение: Первый звук',
    'v.0.tab': 'Основной', 'v.0.title': 'Основной вид', 'v.0.text': 'Обложка, часы с календарём и пульт — слева. Подборки, «Волна» и миксы дня — справа.',
    'v.1.tab': 'Студия', 'v.1.title': 'Студия', 'v.1.text': 'Разделы и плейлисты слева, виджеты сверху, плеер на всю ширину внизу.',
    'v.2.tab': 'Проигрыватель', 'v.2.title': 'Проигрыватель', 'v.2.text': 'Пластинка с тонармом, крутилка громкости и разделы, разложенные по кругу.',
    'v.3.tab': 'Ранги', 'v.3.title': 'Ранги', 'v.3.text': 'Опыт за музыку, задания, достижения, 9 рангов и общий рейтинг.',
    'v.4.tab': 'Аврора', 'v.4.title': 'Тема «Аврора»', 'v.4.text': 'Одна из 7 тем оформления. Ещё есть Стекло, Неон, Терминал, Брутализм, Винил и Бумага.',
    'v.5.tab': 'Неон', 'v.5.title': 'Тема «Неон»', 'v.5.text': 'Тема меняет цвета всего окна — от кнопок до часов и календаря.',
    'plat.ver': 'Версия ',
    'plat.rest': ' · Windows 10 и 11 (64-бит) · Linux — скоро · обновляется сам · ',
    'plat.all': 'все версии'
  };

  var EN = {
    // служебное
    'meta.title': 'NedoSpot — Music. Nothing extra.',
    'meta.desc': 'NedoSpot is an ad-free music player for Windows: live lyrics, themes, playlists, karaoke and ranks for listening.',
    'meta.ogdesc': 'An ad-free music player for Windows with nothing extra.',
    'menu.open': 'Open menu',
    'menu.close': 'Close menu',

    // шапка и меню
    'nav.home': 'NedoSpot — back to top',
    'nav.tg': 'Telegram',
    'nav.aria': 'Site sections',
    'nav.features': 'Features',
    'nav.interface': 'Interface',
    'nav.advantages': 'Why NedoSpot',
    'nav.faq': 'FAQ',
    'nav.docs': 'Documents',
    'nav.download': 'Download',
    'doc.terms': 'Terms of Use',
    'doc.privacy': 'Privacy Policy',
    'doc.support': 'Support',
    'dd.terms': 'Rules for using NedoSpot',
    'dd.privacy': 'What data we store and why',
    'dd.support': '@NedoSpot_Support · reply within 1 business day',
    'mm.terms': 'Terms',
    'mm.privacy': 'Privacy',

    // главный экран
    'hero.eyebrow': 'Music player for Windows',
    'hero.slogan': 'Music. <em>Nothing extra.</em>',
    'hero.desc': 'Discover a new way to listen to music. Your favourite tracks, handy tools and&nbsp;an atmosphere you’ll want to stay in. No ads and&nbsp;no needless interface limits.',
    'btn.dl': 'Download NedoSpot',
    'hero.more': 'Learn more',
    'hero.scroll': 'Scroll down',

    // возможности
    'f.label': '01 — Meet NedoSpot',
    'f.title': 'Your music. Your rules.',
    'f.lead': 'NedoSpot is a modern music player for people who value convenience, aesthetics and&nbsp;the freedom to enjoy their music without ad breaks.',
    'f1.h': 'No ads',
    'f1.p': 'Music without ad breaks or&nbsp;distracting banners.',
    'f1.ad': 'Ad · 0:30',
    'f1.zero': 'ad breaks.<br>Not a single one.',
    'f2.h': 'Thoughtful interface',
    'f2.p': 'Minimalist design, easy navigation and&nbsp;attention to&nbsp;detail.',
    'wire.1': 'Search & header',
    'wire.2': 'Sections',
    'wire.3': 'Now playing',
    'wire.4': 'Mixes',
    'wire.5': 'Wave',
    'wire.6': 'Albums',
    'wire.7': 'Player',
    'f3.h': 'Your music library',
    'f3.p': 'Neatly organise your favourite tracks and&nbsp;playlists.',
    'lib.1': 'Night drive<small>playlist</small>',
    'lib.2': 'Study time<small>playlist</small>',
    'lib.3': 'Liked tracks<small>all your likes</small>',
    'lib.note': 'Playlist names are just examples',
    'like.off': 'Add to liked',
    'like.on': 'Liked',
    'f4.h': 'Atmospheric lyrics',
    'f4.p': 'Dynamic lyrics with&nbsp;visual effects and&nbsp;focus on&nbsp;the current line.',
    'lyr.1': 'Somewhere between the silence and the light',
    'lyr.2': 'the city learns to breathe again',
    'lyr.3': 'I put on the song that used to be somewhere',
    'lyr.4': 'and there is nothing left to find',
    'lyr.5': 'just music — and nothing more',
    'lyr.6': 'only sound, the night, and the two of us',
    'f4.note': 'Effect demo. These lines were written for the site.',
    'f5.h': 'Personalisation',
    'f5.p': 'Make the app look the way you like: 7&nbsp;themes, 5&nbsp;interface layouts, your own background.',
    'f5.aria': 'Themes (example)',
    'theme.glass': 'Glass',
    'theme.neon': 'Neon',
    'theme.aurora': 'Aurora',
    'theme.paper': 'Paper',
    'theme.more': '+ 3 more themes',
    'f6.h': 'Music turns into a game',
    'f6.p': 'Achievements, XP, levels and&nbsp;ranks for your listening.',
    'rank.label': 'Rank',
    'rank.next': 'to the next rank',
    'rank.xp': 'XP: ',
    'rank.0': 'Iron', 'rank.1': 'Bronze', 'rank.2': 'Silver', 'rank.3': 'Gold', 'rank.4': 'Platinum',
    'rank.5': 'Diamond', 'rank.6': 'Master', 'rank.7': 'Grandmaster', 'rank.8': 'Challenger',
    'quest.1': 'Task: Create a playlist',
    'quest.2': 'Task: Add 3 tracks to favourites',
    'quest.3': 'Achievement: First sound',

    // интерфейс
    'sc.h': 'NedoSpot interface',
    'sc.tabs': 'Interface layouts',
    'sc.open': 'Open a larger screenshot',
    'sc.zoom': 'Take a closer look',
    'sc.prev': 'Previous layout',
    'sc.next': 'Next layout',
    'sc.note': 'Real NedoSpot screenshots. Album covers are blurred.',
    'v.0.tab': 'Main', 'v.0.title': 'Main layout', 'v.0.text': 'Cover art, a clock with a calendar and the controls on the left. Picks, “Wave” and daily mixes on the right.',
    'v.1.tab': 'Studio', 'v.1.title': 'Studio', 'v.1.text': 'Sections and playlists on the left, widgets on top, a full-width player at the bottom.',
    'v.2.tab': 'Turntable', 'v.2.title': 'Turntable', 'v.2.text': 'A record with a tonearm, a volume knob and sections laid out in a circle.',
    'v.3.tab': 'Ranks', 'v.3.title': 'Ranks', 'v.3.text': 'XP for listening, tasks, achievements, 9 ranks and a global leaderboard.',
    'v.4.tab': 'Aurora', 'v.4.title': '“Aurora” theme', 'v.4.text': 'One of 7 themes. There are also Glass, Neon, Terminal, Brutalism, Vinyl and Paper.',
    'v.5.tab': 'Neon', 'v.5.title': '“Neon” theme', 'v.5.text': 'A theme recolours the whole window — from the buttons to the clock and calendar.',

    // бегущая строка
    'mq.aria': 'What NedoSpot can do',
    'mq.1': 'Wave', 'mq.2': 'Daily mixes', 'mq.3': 'Live lyrics', 'mq.4': 'Karaoke', 'mq.5': 'Equalizer',
    'mq.6': 'Sleep timer', 'mq.7': 'Rooms with friends', 'mq.8': 'Dynamic Island', 'mq.9': 'Your own files', 'mq.10': 'Instrumentals',

    // преимущества
    'm.label': '03 — Why NedoSpot',
    'm.title': 'More than <span class="soft">just</span> a player.',
    'm.text': 'We create a space where music becomes part of everyday life. No visual noise, needless complexity or intrusive ads. Just music, convenience and the joy of using it.',

    // вопросы
    'q.label': '04 — FAQ',
    'q.title': 'Common questions.',
    'q.lead': 'Didn’t find an answer? Message support — we reply within 1&nbsp;business day.',
    'q.1': 'Where does the music in NedoSpot come from?',
    'q.2': 'Can I use NedoSpot for free?',
    'q.3': 'What is NedoSpot VIP?',
    'q.4': 'How do I report a bug or suggest a feature?',
    'q.5': 'Which systems does NedoSpot run on?',
    'a.1': 'From SoundCloud and YouTube Music. Search covers all sources at once.',
    'a.2': 'Of course. NedoSpot has no ads and is free to use. A VIP subscription helps support the project and adds extra useful features.',
    'a.3': 'A subscription that adds extra useful features.',
    'a.4': 'Message us on Telegram — <a href="https://t.me/NedoSpot_Support" target="_blank" rel="noopener">@NedoSpot_Support</a>. More details on the <a href="/support">Support</a> page.',
    'a.5': 'NedoSpot currently runs on Windows 10 and 11. Versions for Linux and Android are coming soon.',

    // установка
    'i.label': '05 — Install',
    'i.title': 'Your next favourite habit.',
    'i.sub': 'Open NedoSpot and&nbsp;feel music in a new way.',
    'i.plat': 'For Windows 10 and 11 (64-bit) · Linux coming soon · updates itself · <a href="https://github.com/kasenkovdaniil0-pixel/NedoSpot-releases/releases" target="_blank" rel="noopener">all versions</a>',
    'plat.ver': 'Version ',
    'plat.rest': ' · Windows 10 and 11 (64-bit) · Linux coming soon · updates itself · ',
    'plat.all': 'all versions',

    // подвал
    'foot.slogan': 'Music. Nothing extra.',
    'foot.tg': 'Telegram channel',
    'foot.support': 'Support',
    'foot.supc': 'Support contacts',
    'foot.all': 'All versions',
    'foot.up': 'Back to top',
    'fpl.pl': 'Playlist',
    'fpl.a': 'Product',
    'fpl.c': 'Community',
    'fpl.n3': '3 tracks',
    'fpl.n4': '4 tracks',

    // просмотр скриншота
    'lb.aria': 'NedoSpot screenshot',
    'lb.close': 'Close',
    'lb.prev': 'Previous',
    'lb.next': 'Next',
    'lb.hint': 'Click the screenshot to zoom in'
  };

  var RU = {};
  Object.keys(RU_JS).forEach(function (k) { RU[k] = RU_JS[k]; });

  function eachAttr(el, fn) {
    (el.getAttribute('data-i-attr') || '').split(';').forEach(function (pair) {
      var p = pair.split(':');
      if (p.length === 2) fn(p[0].trim(), p[1].trim());
    });
  }

  /* запомнить русский текст со страницы (один раз на каждую метку) */
  function capture() {
    document.querySelectorAll('[data-i]').forEach(function (el) {
      var k = el.getAttribute('data-i');
      if (!(k in RU)) RU[k] = el.innerHTML;
    });
    document.querySelectorAll('[data-i-attr]').forEach(function (el) {
      eachAttr(el, function (attr, k) { if (!(k in RU)) RU[k] = el.getAttribute(attr); });
    });
  }

  function lang() { return root.getAttribute('data-lang') === 'en' ? 'en' : 'ru'; }
  function t(k) {
    var d = lang() === 'en' ? EN : RU;
    return k in d ? d[k] : (RU[k] != null ? RU[k] : k);
  }

  function setMeta(sel, val) {
    var m = document.querySelector(sel);
    if (m) m.setAttribute('content', val);
  }

  var listeners = [];

  function apply(l, silent) {
    root.setAttribute('data-lang', l);
    root.lang = l;
    try { localStorage.setItem('ns-lang', l); } catch (e) {}
    var d = l === 'en' ? EN : RU;
    document.querySelectorAll('[data-i]').forEach(function (el) {
      var k = el.getAttribute('data-i');
      if (k in d && el.innerHTML !== d[k]) el.innerHTML = d[k];
    });
    document.querySelectorAll('[data-i-attr]').forEach(function (el) {
      eachAttr(el, function (attr, k) { if (k in d) el.setAttribute(attr, d[k]); });
    });
    document.title = t('meta.title');
    setMeta('meta[name=description]', t('meta.desc'));
    setMeta('meta[property="og:title"]', t('meta.title'));
    setMeta('meta[property="og:description"]', t('meta.ogdesc'));
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-set-lang') === l ? 'true' : 'false');
    });
    // ?lang=… в адресе больше не нужен — выбор запомнен
    if (location.search.indexOf('lang=') > -1 && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.hash);
    }
    if (!silent) listeners.forEach(function (fn) { fn(l); });
  }

  capture();
  apply(lang(), true);

  window.NSi18n = {
    t: t,
    lang: lang,
    set: function (l) { if (l !== lang()) apply(l); },
    on: function (fn) { listeners.push(fn); }
  };
})();
