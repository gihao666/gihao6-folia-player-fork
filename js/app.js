/* Folia Session — interface, lyrics engine, queue and media session */
(function () {
  'use strict';

  const DATA = window.FoliaData;
  const VisualSurface = window.FoliaVisual.VisualSurface;
  const makeCover = window.FoliaVisual.makeCover;
  const AudioEngine = window.FoliaAudio.AudioEngine;
  const renderSong = window.FoliaAudio.renderSong;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        void error;
      }
    },
  };

  const el = (id) => document.getElementById(id);

  const dom = {
    app: el('app'),
    gl: el('gl'),
    topbar: el('topbar'),
    brandLink: el('brandLink'),
    gpuPill: el('gpuPill'),
    gpuLabel: el('gpuLabel'),
    themeBtn: el('themeBtn'),
    queueBtn: el('queueBtn'),
    queueBtnMobile: el('queueBtnMobile'),
    fullBtn: el('fullBtn'),
    coverShell: el('coverShell'),
    coverFrame: el('coverFrame'),
    cover: el('cover'),
    coverIndex: el('coverIndex'),
    trackAlbum: el('trackAlbum'),
    trackTitle: el('trackTitle'),
    trackSub: el('trackSub'),
    trackArtist: el('trackArtist'),
    trackChips: el('trackChips'),
    likeBtn: el('likeBtn'),
    importBtn: el('importBtn'),
    fileInput: el('fileInput'),
    lyricsWrap: el('lyricsWrap'),
    lyricsStatus: el('lyricsStatus'),
    lyricsViewport: el('lyricsViewport'),
    lyricsRail: el('lyricsRail'),
    lyricsEmpty: el('lyricsEmpty'),
    lyricHint: el('lyricHint'),
    syncDot: el('syncDot'),
    timeNow: el('timeNow'),
    timeTotal: el('timeTotal'),
    progress: el('progress'),
    progressFill: el('progressFill'),
    progressKnob: el('progressKnob'),
    seek: el('seek'),
    miniCover: el('miniCover'),
    miniTitle: el('miniTitle'),
    miniArtist: el('miniArtist'),
    prevBtn: el('prevBtn'),
    playBtn: el('playBtn'),
    nextBtn: el('nextBtn'),
    shuffleBtn: el('shuffleBtn'),
    loopBtn: el('loopBtn'),
    muteBtn: el('muteBtn'),
    volumeBox: el('volumeBox'),
    volume: el('volume'),
    queueSheet: el('queueSheet'),
    queueScrim: el('queueScrim'),
    queueClose: el('queueClose'),
    queueNow: el('queueNow'),
    queueList: el('queueList'),
    queueImport: el('queueImport'),
    toast: el('toast'),
    boot: el('boot'),
    bootBtn: el('bootBtn'),
    bufferOverlay: el('bufferOverlay'),
    bufferTitle: el('bufferTitle'),
    bufferCopy: el('bufferCopy'),
    bootStatus: el('bootStatus'),
    sourceBtn: el('sourceBtn'),
    sourceSheet: el('sourceSheet'),
    sourcePanel: el('sourcePanel'),
    sourceClose: el('sourceClose'),
    sourceScrim: el('sourceScrim'),
    sourceLocalBtn: el('sourceLocalBtn'),
    urlInput: el('urlInput'),
    urlPlayBtn: el('urlPlayBtn'),
    subServer: el('subServer'),
    subUser: el('subUser'),
    subPass: el('subPass'),
    subConnect: el('subConnect'),
    subStatus: el('subStatus'),
    subHint: el('subHint'),
    providerTabs: el('providerTabs'),
    onlineBase: el('onlineBase'),
    onlineSave: el('onlineSave'),
    onlineBadge: el('onlineBadge'),
    onlineLogin: el('onlineLogin'),
    onlineLogout: el('onlineLogout'),
    onlineStatus: el('onlineStatus'),
    qrBox: el('qrBox'),
    qrImage: el('qrImage'),
    qrStatus: el('qrStatus'),
    onlineSearchBox: el('onlineSearchBox'),
    onlineSearch: el('onlineSearch'),
    onlineSearchBtn: el('onlineSearchBtn'),
    onlineResults: el('onlineResults'),
    onlineHint: el('onlineHint'),
    styleBtn: el('styleBtn'),
    styleSheet: el('styleSheet'),
    styleClose: el('styleClose'),
    styleScrim: el('styleScrim'),
    styleGrid: el('styleGrid'),
  };

  const engine = new AudioEngine();
  const visual = new VisualSurface(dom.gl);

  const state = {
    songs: DATA.SONGS.slice(),
    index: 0,
    theme: storage.get('folia.theme', 'auto'),
    liked: new Set(),
    shuffle: storage.get('folia.shuffle', '0') === '1',
    loop: storage.get('folia.loop', 'all'),
    booted: false,
    loading: false,
    scrubbing: false,
    idleTimer: 0,
    loadToken: 0,
    lyricData: [],
    lineEls: [],
    charEls: [],
    activeIndex: -2,
    prevLit: 0,
    duration: 0,
    localCount: 0,
    fps: 0,
    frames: 0,
    fpsClock: 0,
    lastTimeText: '',
    lastTotalText: '',
    volume: Number(storage.get('folia.volume', '0.82')),
    muted: false,
    queueOpen: false,
    wakeLock: null,
    coverHueSeed: 7,
    isMobile: matchMedia('(max-width: 560px)').matches,
    preloading: false,
    preloadPromise: null,
    sourceOpen: false,
    onlineProvider: 'netease',
    qrTimer: 0,
    remoteCache: new Map(),
    lyricStyle: 'classic',
    styleOpen: false,
  };

  try {
    const raw = storage.get('folia.liked', '[]');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) list.forEach((id) => state.liked.add(id));
  } catch (error) {
    void error;
  }

  const currentSong = () => state.songs[state.index];

  function songDuration(song) {
    if (song.local || song.remote) return song.duration || 0;
    return DATA.duration(song);
  }

  function ensureCover(song, index) {
    if (song.cover) return song.cover;
    if (song.local || song.remote) {
      song.cover = makeCover({
        art: {
          seed: (song.local ? 60 : 130) + index * 17,
          hueA: (index * 47 + 190) % 360,
          hueB: (index * 83 + 260) % 360,
          hueC: (index * 29 + 40) % 360,
          style: ['wave', 'orbit', 'grid'][index % 3],
        },
      });
    } else {
      song.cover = makeCover(song);
    }
    return song.cover;
  }

  function resolveTheme(name) {
    if (name === 'auto') {
      const song = currentSong();
      return song && song.theme ? song.theme : DATA.THEMES.aurora;
    }
    return DATA.THEMES[name] || DATA.THEMES.aurora;
  }

  function applyTheme(name) {
    state.theme = name;
    const palette = resolveTheme(name);
    const root = document.documentElement;
    DATA.PALETTE_KEYS.forEach((key) => {
      if (palette[key]) root.style.setProperty('--' + key, palette[key]);
    });
    visual.setPalette(palette);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palette.bg);
    storage.set('folia.theme', name);
  }

  function applyVolume(value) {
    state.volume = clamp(value, 0, 1);
    engine.setVolume(state.volume);
    dom.volume.value = String(Math.round(state.volume * 100));
    dom.volume.style.setProperty('--v', `${Math.round(state.volume * 100)}%`);
    dom.muteBtn.classList.toggle('is-muted', state.muted || state.volume === 0);
    dom.muteBtn.setAttribute('aria-label', state.muted ? '取消静音' : '静音');
    storage.set('folia.volume', String(state.volume));
  }

  function toast(message, duration) {
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => dom.toast.classList.remove('show'), duration || 2600);
  }

  function formatBpm(song) {
    return `${song.bpm} BPM`;
  }

  function renderEmptyState() {
    const cover = makeCover({ art: { seed: 7, hueA: 196, hueB: 218, hueC: 44, style: 'wave' } });
    dom.cover.src = cover;
    dom.cover.alt = '等待音乐源';
    dom.miniCover.src = cover;
    dom.coverIndex.textContent = '--';
    dom.trackTitle.textContent = '未选择曲目';
    dom.trackSub.textContent = 'Add a source to begin';
    dom.trackArtist.textContent = 'gihao6 Folia Player';
    dom.trackAlbum.textContent = '音乐源 · 本地 / 在线';
    dom.miniTitle.textContent = '未选择曲目';
    dom.miniArtist.textContent = '打开音乐源开始';
    dom.trackChips.innerHTML = '';
    ['16 种歌词样式', 'WebGL 可视化', '在线源'].forEach((text) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = text;
      dom.trackChips.appendChild(chip);
    });
    dom.likeBtn.setAttribute('aria-pressed', 'false');
    dom.lyricsStatus.textContent = '等待音乐源';
    dom.lyricHint.textContent = '打开音乐源，扫码登录或导入本地音频';
    dom.lyricsRail.innerHTML = '';
    state.lineEls = [];
    state.charEls = [];
    state.lyricData = [];
    state.activeIndex = -2;
    dom.lyricsEmpty.hidden = false;
    const emptyTitle = dom.lyricsEmpty.querySelector('strong');
    if (emptyTitle) emptyTitle.textContent = '还没有播放内容';
    const emptySub = dom.lyricsEmpty.querySelector('span');
    if (emptySub) emptySub.textContent = '打开音乐源，扫码登录或导入本地音频';
    dom.lyricsRail.style.transform = 'translate3d(0,0,0)';
    dom.lyricsRail.style.paddingTop = '0px';
    dom.lyricsRail.style.paddingBottom = '0px';
    document.title = 'gihao6 Folia Player';
  }

  function updateMeta(song, index) {
    if (!song) {
      renderEmptyState();
      return;
    }
    const cover = ensureCover(song, index);
    dom.cover.src = cover;
    dom.cover.alt = `《${song.title}》专辑封面`;
    dom.miniCover.src = cover;
    dom.coverIndex.textContent = String(index + 1).padStart(2, '0');
    dom.trackTitle.textContent = song.title;
    dom.trackSub.textContent = song.titleEn || (song.local ? 'Local Track' : song.remote ? 'Remote Track' : 'Folia Session');
    dom.trackArtist.textContent = song.artist || 'Folia Session';
    dom.trackAlbum.textContent = song.local
      ? '本次会话 · 本地音轨'
      : song.remote
        ? `${song.album || '在线曲库'} · ${song.sourceLabel || '在线源'}`
        : `${song.album || '未命名专辑'} · ${song.year || 2026}`;
    dom.miniTitle.textContent = song.title;
    dom.miniArtist.textContent = song.artist || 'Folia Session';

    dom.trackChips.innerHTML = '';
    const chips = song.local
      ? ['本地文件', DATA.formatDuration(song.duration || 0), '无歌词']
      : song.remote
        ? [song.sourceLabel || '在线源', DATA.formatDuration(song.duration || 0), song.lyrics && song.lyrics.length ? '同步歌词' : '无歌词']
        : [formatBpm(song), song.keyName || '', (song.mood || '').split(' / ').pop() || ''];
    chips.filter(Boolean).forEach((text) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = text;
      dom.trackChips.appendChild(chip);
    });

    dom.likeBtn.setAttribute('aria-pressed', state.liked.has(song.id) ? 'true' : 'false');
    dom.lyricsStatus.textContent = song.local
      ? '本地音轨 · 可视化开启'
      : song.remote
        ? '在线音轨 · 可视化开启'
        : `离线合成 · ${song.bpm} BPM`;
    document.title = `${song.title} · gihao6 Folia Player`;
    updateMediaSession(song, cover);
  }

  function updateMediaSession(song, cover) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: song.title,
        artist: song.artist || 'Folia Session',
        album: song.album || 'Folia Session',
        artwork: [
          { src: cover, sizes: '768x768', type: 'image/jpeg' },
        ],
      });
    } catch (error) {
      void error;
    }
  }

  function buildLyrics(song) {
    if (!song) {
      renderEmptyState();
      return;
    }
    dom.lyricsRail.innerHTML = '';
    state.lineEls = [];
    state.charEls = [];
    if (song.remote) {
      state.lyricData = Array.isArray(song.lyrics) ? song.lyrics : [];
    } else {
      state.lyricData = song.local || !song.lyrics ? [] : DATA.lyricTimeline(song);
    }
    state.activeIndex = -2;
    state.prevLit = 0;

    if (state.lyricData.length === 0) {
      dom.lyricsEmpty.hidden = false;
      const emptyTitle = dom.lyricsEmpty.querySelector('strong');
      if (emptyTitle) emptyTitle.textContent = song.remote ? '在线音轨 · 暂无歌词' : '本地音轨 · 暂无歌词';
      dom.lyricHint.textContent = song.remote ? '在线音轨 · 可视化开启' : '本地音轨 · 暂无歌词';
      dom.lyricsRail.style.transform = 'translate3d(0,0,0)';
      dom.lyricsRail.style.paddingTop = '0px';
      dom.lyricsRail.style.paddingBottom = '0px';
      return;
    }

    dom.lyricsEmpty.hidden = true;
    dom.lyricHint.textContent = '点击歌词可跳转 · 当前行自动居中';

    state.lyricData.forEach((line, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lyric-line';
      button.dataset.index = String(index);
      button.style.setProperty('--i', String(index));
      button.setAttribute('aria-label', `跳转到歌词：${line.text}`);

      const text = document.createElement('span');
      text.className = 'lyric-text';
      Array.from(line.text).forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        text.appendChild(span);
      });

      const tr = document.createElement('span');
      tr.className = 'lyric-tr';
      tr.textContent = line.tr || '';

      button.append(text);
      if (line.tr) button.append(tr);
      button.addEventListener('click', () => jumpToLine(index));

      dom.lyricsRail.appendChild(button);
      state.lineEls.push(button);
      state.charEls.push(Array.from(text.querySelectorAll('.char')));
    });

    updateLyricClasses(-1);
    applyRailPadding();
    requestAnimationFrame(() => scrollLyrics(false));
  }

  function applyRailPadding() {
    const height = dom.lyricsViewport.clientHeight || 1;
    const pad = Math.round(height * (state.isMobile ? 0.33 : 0.42));
    dom.lyricsRail.style.paddingTop = `${pad}px`;
    dom.lyricsRail.style.paddingBottom = `${pad}px`;
  }

  function findActiveLine(time) {
    const lines = state.lyricData;
    if (!lines.length) return -1;
    if (time < lines[0].start) return -1;
    let result = lines.length - 1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].start <= time) result = i;
      else break;
    }
    return result;
  }

  function updateLyricClasses(active) {
    dom.lyricsRail.style.setProperty('--active', String(active < 0 ? 0 : active));
    state.lineEls.forEach((lineEl, index) => {
      lineEl.classList.toggle('active', index === active);
      lineEl.classList.toggle('passed', index < active);
      lineEl.classList.toggle('upcoming', index === active + 1);
      lineEl.classList.toggle('far', index > active + 1);
    });
  }

  function clearChars(index) {
    const chars = state.charEls[index];
    if (!chars) return;
    chars.forEach((charEl) => charEl.classList.remove('lit', 'current'));
  }

  function paintChars(index, lit, finished) {
    const chars = state.charEls[index];
    if (!chars) return;
    const previous = state.prevLit;
    if (lit < previous) {
      for (let i = lit; i < previous; i++) chars[i].classList.remove('lit');
    }
    for (let i = previous; i < lit; i++) chars[i].classList.add('lit');
    chars.forEach((charEl, i) => charEl.classList.toggle('current', !finished && lit > 0 && i === lit - 1));
    state.prevLit = lit;
  }

  function updateLyrics(time) {
    if (!state.lyricData.length) return;
    const active = findActiveLine(time);

    if (active !== state.activeIndex) {
      if (state.activeIndex >= 0) clearChars(state.activeIndex);
      state.activeIndex = active;
      state.prevLit = 0;
      updateLyricClasses(active);
      scrollLyrics(true);
      const liveText = active >= 0 ? state.lyricData[active].text : '前奏';
      dom.lyricsViewport.setAttribute('aria-label', `歌词：${liveText}`);
    }

    if (active < 0) return;
    const line = state.lyricData[active];
    const span = Math.max(0.001, line.end - line.start);
    const progress = clamp((time - line.start) / span, 0, 1);
    const count = state.charEls[active] ? state.charEls[active].length : 0;
    const finished = progress >= 1;
    const lit = finished ? count : Math.floor(progress * count + 0.28);
    if (lit !== state.prevLit) paintChars(active, lit, finished);
  }

  function scrollLyrics(animate) {
    const index = state.activeIndex < 0 ? 0 : state.activeIndex;
    const lineEl = state.lineEls[index];
    if (!lineEl) return;
    const viewportHeight = dom.lyricsViewport.clientHeight;
    const target = lineEl.offsetTop + lineEl.offsetHeight / 2 - viewportHeight * 0.45;
    if (!animate) dom.lyricsRail.style.transition = 'none';
    dom.lyricsRail.style.transform = `translate3d(0, ${-Math.max(-40, target)}px, 0)`;
    if (!animate) {
      requestAnimationFrame(() => {
        dom.lyricsRail.style.transition = '';
      });
    }
  }

  function jumpToLine(index) {
    if (state.loading) {
      toast('音轨正在准备中');
      return;
    }
    if (!engine.buffer) {
      toast('点击播放后即可跳转歌词');
      return;
    }
    const line = state.lyricData[index];
    if (!line) return;
    engine.seek(line.start);
    if (!engine.playing) {
      engine.play();
      syncPlayState();
    }
    updateProgress(true);
  }

  function syncPlayState() {
    dom.playBtn.classList.toggle('is-playing', engine.playing);
    dom.playBtn.setAttribute('aria-label', engine.playing ? '暂停' : '播放');
    dom.syncDot.classList.toggle('is-paused', !engine.playing);
    dom.syncDot.innerHTML = `<i aria-hidden="true"></i>${engine.playing ? 'LIVE' : 'PAUSED'}`;
  }

  function updateTotal() {
    const song = currentSong();
    const total = engine.duration || state.duration || (song ? songDuration(song) : 0);
    state.duration = total;
    const text = DATA.formatDuration(total);
    if (text !== state.lastTotalText) {
      dom.timeTotal.textContent = text;
      state.lastTotalText = text;
    }
    dom.seek.setAttribute('aria-valuemax', '1000');
  }

  function updateProgress(force) {
    const total = engine.duration || state.duration || 0;
    const time = engine.currentTime;
    const ratio = total > 0 ? clamp(time / total, 0, 1) : 0;
    if (!state.scrubbing || force) {
      dom.progress.style.setProperty('--p', ratio.toFixed(5));
      dom.progress.setAttribute('aria-valuenow', String(Math.round(ratio * 1000)));
      dom.seek.value = String(Math.round(ratio * 1000));
    }
    const text = DATA.formatTime(time);
    if (text !== state.lastTimeText) {
      dom.timeNow.textContent = text;
      state.lastTimeText = text;
    }
    if (force) {
      const totalText = DATA.formatDuration(total);
      if (totalText !== state.lastTotalText) {
        dom.timeTotal.textContent = totalText;
        state.lastTotalText = totalText;
      }
    }
  }

  function renderQueue() {
    dom.queueList.innerHTML = '';
    dom.queueNow.innerHTML = '';

    const current = currentSong();
    if (current) {
      const cover = ensureCover(current, state.index);
      const now = document.createElement('div');
      now.className = 'queue-now';
      now.innerHTML = '<img alt=""><div class="qn-meta"><strong></strong><span></span></div>';
      now.querySelector('img').src = cover;
      now.querySelector('strong').textContent = current.title;
      now.querySelector('span').textContent = engine.playing ? '正在播放' : '已暂停';
      dom.queueNow.appendChild(now);
    }

    state.songs.forEach((song, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `queue-item${index === state.index ? ' is-current' : ''}`;
      button.setAttribute('aria-label', `播放 ${song.title}`);

      const idx = document.createElement('span');
      idx.className = 'q-index';
      idx.innerHTML = `<span class="num">${String(index + 1).padStart(2, '0')}</span><span class="bars"><i></i><i></i><i></i></span>`;

      const img = document.createElement('img');
      img.alt = '';
      img.src = ensureCover(song, index);

      const meta = document.createElement('span');
      meta.className = 'q-meta';
      const title = document.createElement('strong');
      title.textContent = song.title;
      const sub = document.createElement('span');
      sub.textContent = song.local
        ? `${song.artist} · 本地`
        : song.remote
          ? `${song.artist} · ${song.sourceLabel || '在线源'}`
          : `${song.artist} · ${song.album}`;
      meta.append(title, sub);

      const dur = document.createElement('span');
      dur.className = 'q-duration';
      dur.textContent = DATA.formatDuration(songDuration(song));

      button.append(idx, img, meta, dur);
      button.addEventListener('click', () => {
        selectSong(index, { autoplay: true });
        closeQueue();
      });

      item.appendChild(button);
      dom.queueList.appendChild(item);
    });
  }

  function openQueue() {
    dom.styleSheet.classList.remove('open');
    dom.styleSheet.setAttribute('aria-hidden', 'true');
    state.styleOpen = false;
    dom.sourceSheet.classList.remove('open');
    dom.sourceSheet.setAttribute('aria-hidden', 'true');
    state.sourceOpen = false;
    state.queueOpen = true;
    dom.queueSheet.classList.add('open');
    dom.queueSheet.setAttribute('aria-hidden', 'false');
    dom.queueBtn.setAttribute('aria-expanded', 'true');
    renderQueue();
    dom.queueClose.focus({ preventScroll: true });
    restartIdle();
  }

  function closeQueue() {
    state.queueOpen = false;
    dom.queueSheet.classList.remove('open');
    dom.queueSheet.setAttribute('aria-hidden', 'true');
    dom.queueBtn.setAttribute('aria-expanded', 'false');
    dom.queueBtn.focus({ preventScroll: true });
    restartIdle();
  }

  const LYRIC_STYLES = [
    { id: 'poem', name: '诗', en: 'POEM' },
    { id: 'sonnet', name: '商籁', en: 'SONNET' },
    { id: 'fume', name: '浮名', en: 'FUME' },
    { id: 'poemline', name: '诗行', en: 'POEM THAT' },
    { id: 'tempera', name: '凝彩', en: 'TEMPERA' },
    { id: 'tilt', name: '倾诉', en: 'TILT' },
    { id: 'lumiere', name: '绘光', en: 'LUMIERE' },
    { id: 'claddagh', name: '回环', en: 'CLADDAGH' },
    { id: 'hanabi', name: '花火', en: 'HANABI' },
    { id: 'monet', name: '莫奈', en: 'MONET' },
    { id: 'classic', name: '流光', en: 'CLASSIC' },
    { id: 'pendolo', name: '时计', en: 'PENDOLO' },
    { id: 'cadenza', name: '心象', en: 'CADENZA' },
    { id: 'cappella', name: '群唱', en: 'CAPPELLA' },
    { id: 'partita', name: '云阶', en: 'PARTITA' },
    { id: 'diorama', name: '镜台', en: 'DIORAMA' },
  ];

  function styleById(id) {
    return LYRIC_STYLES.find((item) => item.id === id) || LYRIC_STYLES[10];
  }

  function initStyleGrid() {
    dom.styleGrid.innerHTML = '';
    LYRIC_STYLES.forEach((style, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'style-card';
      button.dataset.style = style.id;
      button.innerHTML = `<span class="s-num">${String(index + 1).padStart(2, '0')}</span><span class="s-name"></span><span class="s-en"></span><span class="s-sample">歌词</span>`;
      button.querySelector('.s-name').textContent = style.name;
      button.querySelector('.s-en').textContent = style.en;
      button.addEventListener('click', () => applyLyricStyle(style.id));
      dom.styleGrid.appendChild(button);
    });
  }

  function applyLyricStyle(id, silent) {
    const style = styleById(id);
    state.lyricStyle = style.id;
    dom.lyricsViewport.dataset.lstyle = style.id;
    storage.set('folia.lyricStyle', style.id);
    dom.styleGrid.querySelectorAll('.style-card').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.style === style.id);
    });
    applyRailPadding();
    scrollLyrics(false);
    if (!silent) toast(`歌词样式：${style.name} · ${style.en}`);
  }

  function cycleLyricStyle(direction) {
    const index = LYRIC_STYLES.findIndex((item) => item.id === state.lyricStyle);
    const next = (index + (direction || 1) + LYRIC_STYLES.length) % LYRIC_STYLES.length;
    applyLyricStyle(LYRIC_STYLES[next].id);
  }

  function openStyles() {
    dom.queueSheet.classList.remove('open');
    dom.queueSheet.setAttribute('aria-hidden', 'true');
    state.queueOpen = false;
    dom.sourceSheet.classList.remove('open');
    dom.sourceSheet.setAttribute('aria-hidden', 'true');
    state.sourceOpen = false;
    state.styleOpen = true;
    dom.styleSheet.classList.add('open');
    dom.styleSheet.setAttribute('aria-hidden', 'false');
    dom.styleClose.focus({ preventScroll: true });
    restartIdle();
  }

  function closeStyles() {
    state.styleOpen = false;
    dom.styleSheet.classList.remove('open');
    dom.styleSheet.setAttribute('aria-hidden', 'true');
    dom.styleBtn.focus({ preventScroll: true });
    restartIdle();
  }

  const ONLINE_LABELS = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    soda: '汽水音乐',
  };

  function onlineLoggedIn(provider) {
    return Boolean(FoliaOnline.cookieOf(provider));
  }

  function setOnlineTab(provider) {
    state.onlineProvider = provider;
    clearInterval(state.qrTimer);
    dom.qrBox.hidden = true;
    dom.onlineResults.innerHTML = '';
    dom.onlineSearchBox.hidden = true;
    if (dom.qrImage) dom.qrImage.removeAttribute('src');
    if (dom.providerTabs) {
      dom.providerTabs.querySelectorAll('.provider-tab').forEach((tab) => {
        tab.classList.toggle('is-active', tab.dataset.provider === provider);
      });
    }
    dom.onlineBase.value = FoliaOnline.baseOf(provider);
    const logged = onlineLoggedIn(provider);
    dom.onlineLogin.disabled = false;
    dom.onlineLogout.disabled = !logged;
    dom.onlineSearchBtn.disabled = false;
    dom.onlineStatus.textContent = logged ? '已登录（本次会话）' : '未登录';
    dom.onlineBadge.textContent = logged ? '已连接' : '需自建 API';
    dom.onlineBadge.className = logged ? 'badge on' : 'badge warn';
    dom.onlineHint.textContent = '扫码登录需要 API 允许跨域凭据（CORS credentials）。请自行部署并遵守平台条款。';
    if (logged) dom.onlineSearchBox.hidden = false;
    setTimeout(autoOnlineQr, 320);
  }

  function autoOnlineQr() {
    if (!state.sourceOpen) return;
    if (state.onlineProvider !== 'netease' && state.onlineProvider !== 'qq') return;
    if (onlineLoggedIn(state.onlineProvider)) return;
    if (dom.qrImage.getAttribute('src')) return;
    startOnlineLogin(true);
  }

  function initSourceForm() {
    const store = FoliaSources.readStore();
    if (store.subsonic) {
      dom.subServer.value = store.subsonic.server || '';
      dom.subUser.value = store.subsonic.user || '';
    }
    try {
      dom.subPass.value = sessionStorage.getItem('folia.subpass') || '';
    } catch (error) {
      void error;
    }
    setOnlineTab(state.onlineProvider);
  }

  function openSources() {
    dom.styleSheet.classList.remove('open');
    dom.styleSheet.setAttribute('aria-hidden', 'true');
    state.styleOpen = false;
    dom.queueSheet.classList.remove('open');
    dom.queueSheet.setAttribute('aria-hidden', 'true');
    state.queueOpen = false;
    state.sourceOpen = true;
    initSourceForm();
    dom.sourceSheet.classList.add('open');
    dom.sourceSheet.setAttribute('aria-hidden', 'false');
    dom.sourceClose.focus({ preventScroll: true });
    restartIdle();
    setTimeout(autoOnlineQr, 520);
  }

  function closeSources() {
    state.sourceOpen = false;
    dom.sourceSheet.classList.remove('open');
    dom.sourceSheet.setAttribute('aria-hidden', 'true');
    dom.sourceBtn.focus({ preventScroll: true });
    restartIdle();
  }

  function addRemoteSongs(tracks) {
    const existing = new Set(state.songs.map((item) => item.id));
    let added = 0;
    let first = -1;
    tracks.forEach((track) => {
      if (!track || (!track.streamUrl && !track.provider) || existing.has(track.id)) return;
      if (!track.theme) track.theme = resolveTheme(state.theme);
      state.songs.push(track);
      existing.add(track.id);
      if (first < 0) first = state.songs.length - 1;
      added++;
    });
    renderQueue();
    return { added, first };
  }

  function subsonicConfig() {
    return {
      server: dom.subServer.value.trim(),
      user: dom.subUser.value.trim(),
      pass: dom.subPass.value,
    };
  }

  async function connectSubsonic() {
    const config = subsonicConfig();
    dom.subStatus.textContent = '连接中';
    dom.subStatus.className = 'badge';
    dom.subConnect.disabled = true;
    dom.subHint.textContent = '正在验证账号并同步曲库…';
    try {
      await FoliaSources.ping(config);
      const songs = await FoliaSources.randomSongs(config, 50);
      try {
        sessionStorage.setItem('folia.subpass', config.pass);
      } catch (error) {
        void error;
      }
      FoliaSources.writeStore({ subsonic: { server: config.server, user: config.user } });
      const tracks = FoliaSources.mapSubsonicSongs(songs, config);
      const result = addRemoteSongs(tracks);
      dom.subStatus.textContent = `已连接 · ${result.added} 首`;
      dom.subStatus.className = 'badge on';
      dom.subHint.textContent = '同步完成。切歌时会按需缓冲在线音轨。';
      if (result.first >= 0) {
        closeSources();
        selectSong(result.first, { autoplay: true });
      } else {
        toast('连接成功，但没有可播放的新歌曲');
      }
    } catch (error) {
      console.error(error);
      dom.subStatus.textContent = '连接失败';
      dom.subStatus.className = 'badge warn';
      dom.subHint.textContent = error.message || '连接失败';
      toast(error.message || '连接失败');
    } finally {
      dom.subConnect.disabled = false;
    }
  }

  function playDirectUrl() {
    const raw = dom.urlInput.value.trim();
    if (!/^https?:\/\//i.test(raw)) {
      toast('请输入以 http:// 或 https:// 开头的音频地址');
      return;
    }
    let hostname = '';
    try {
      hostname = new URL(raw).hostname;
    } catch (error) {
      toast('音频地址格式不正确');
      return;
    }
    const path = raw.split('?')[0].split('#')[0];
    const file = path.split('/').pop() || '在线音轨';
    let title = file;
    try {
      title = decodeURIComponent(file) || file;
    } catch (error) {
      void error;
    }
    title = title.replace(/\.[^.]+$/, '') || '在线音轨';
    let index = state.songs.findIndex((item) => item.streamUrl === raw);
    if (index < 0) {
      const song = {
        id: `url:${Date.now()}`,
        title,
        titleEn: 'Direct Stream',
        artist: '在线直链',
        album: hostname,
        year: null,
        bpm: null,
        keyName: '',
        mood: '',
        duration: 0,
        remote: true,
        sourceLabel: '直链',
        streamUrl: raw,
        cover: null,
        lyrics: [],
      };
      ensureCover(song, state.songs.length);
      state.songs.push(song);
      index = state.songs.length - 1;
    }
    closeSources();
    selectSong(index, { autoplay: true });
  }

  function saveOnlineBase() {
    try {
      const base = FoliaOnline.saveBase(state.onlineProvider, dom.onlineBase.value);
      dom.onlineBase.value = base;
      dom.onlineStatus.textContent = 'API 已保存';
      toast('API 地址已保存');
    } catch (error) {
      toast(error.message || '保存失败');
    }
  }

  function setQrStatus(text, isError) {
    dom.qrStatus.textContent = text;
    dom.qrStatus.style.color = isError ? '#ffb454' : '';
  }

  async function startOnlineLogin(auto) {
    const provider = state.onlineProvider;
    const base = dom.onlineBase.value.trim() || FoliaOnline.baseOf(provider);
    if (!base) {
      if (!auto) toast('请先填写并保存 API 地址');
      return;
    }
    dom.onlineLogin.disabled = true;
    dom.onlineStatus.textContent = '正在连接本地 API…';
    try {
      const { key, image } = await FoliaOnline.startLogin(provider, base);
      dom.qrImage.src = image;
      dom.qrBox.hidden = false;
      dom.onlineStatus.textContent = '等待扫码';
      setQrStatus('等待扫码…');
      dom.qrBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      clearInterval(state.qrTimer);
      const started = Date.now();
      state.qrTimer = setInterval(async () => {
        try {
          const result = await FoliaOnline.checkLogin(provider, base, key);
          if (result.state === 'waiting') {
            setQrStatus('等待扫码…');
          } else if (result.state === 'scanned') {
            setQrStatus('已扫码，请在手机上确认');
          } else if (result.state === 'confirmed') {
            clearInterval(state.qrTimer);
            setQrStatus('登录成功');
            dom.qrBox.hidden = true;
            dom.onlineLogin.disabled = false;
            dom.onlineLogout.disabled = false;
            dom.onlineStatus.textContent = '已登录（本次会话）';
            dom.onlineBadge.textContent = '已连接';
            dom.onlineBadge.className = 'badge on';
            dom.onlineSearchBox.hidden = false;
            dom.onlineSearch.focus({ preventScroll: true });
            toast(`已登录${ONLINE_LABELS[provider]}`);
            return;
          } else if (result.state === 'expired') {
            clearInterval(state.qrTimer);
            setQrStatus('二维码已过期，请重新获取', true);
            dom.onlineLogin.disabled = false;
            return;
          } else if (result.state === 'error') {
            clearInterval(state.qrTimer);
            setQrStatus(result.message || '登录失败', true);
            dom.onlineLogin.disabled = false;
            return;
          }
          if (Date.now() - started > 180000) {
            clearInterval(state.qrTimer);
            setQrStatus('二维码已过期，请重新获取', true);
            dom.onlineLogin.disabled = false;
          }
        } catch (error) {
          clearInterval(state.qrTimer);
          setQrStatus(error.message || '登录检查失败', true);
          dom.onlineLogin.disabled = false;
        }
      }, 2000);
    } catch (error) {
      console.error(error);
      dom.onlineLogin.disabled = false;
      dom.onlineStatus.textContent = 'API 未连接';
      if (!auto) toast(error.message || '登录失败');
      else dom.onlineHint.textContent = `未连接到 ${base}。请先启动 NeteaseCloudMusicApi / qq-music-api，并允许 CORS 凭据。`;
    }
  }

  function renderOnlineResults(tracks) {
    dom.onlineResults.innerHTML = '';
    if (!tracks.length) {
      const empty = document.createElement('p');
      empty.className = 'source-hint';
      empty.textContent = '没有找到歌曲';
      dom.onlineResults.appendChild(empty);
      return;
    }
    tracks.forEach((track) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'online-result';
      button.innerHTML = '<img alt=""><span class="r-meta"><strong></strong><span></span></span><span class="r-dur"></span>';
      const img = button.querySelector('img');
      if (track.cover) {
        img.src = track.cover;
        img.onerror = () => {
          img.removeAttribute('src');
        };
      }
      button.querySelector('strong').textContent = track.title;
      button.querySelector('.r-meta span').textContent = `${track.artist}${track.album ? ' · ' + track.album : ''}`;
      button.querySelector('.r-dur').textContent = DATA.formatDuration(track.duration);
      button.addEventListener('click', () => {
        const result = addRemoteSongs([track]);
        const index = result.first >= 0 ? result.first : state.songs.findIndex((item) => item.id === track.id);
        if (index < 0) return;
        closeSources();
        selectSong(index, { autoplay: true });
      });
      dom.onlineResults.appendChild(button);
    });
  }

  async function onlineSearch() {
    const keyword = dom.onlineSearch.value.trim();
    if (!keyword) {
      toast('请输入关键词');
      return;
    }
    const provider = state.onlineProvider;
    const base = dom.onlineBase.value.trim() || FoliaOnline.baseOf(provider);
    if (!base) {
      toast('请先填写 API 地址');
      return;
    }
    dom.onlineSearchBtn.disabled = true;
    dom.onlineResults.innerHTML = '<p class="source-hint">搜索中…</p>';
    try {
      const tracks = await FoliaOnline.search(provider, base, keyword);
      renderOnlineResults(tracks);
      dom.onlineResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error(error);
      dom.onlineResults.innerHTML = `<p class="source-hint">${error.message || '搜索失败'}</p>`;
      toast(error.message || '搜索失败');
    } finally {
      dom.onlineSearchBtn.disabled = false;
    }
  }

  function logoutOnline() {
    FoliaOnline.logout(state.onlineProvider);
    dom.onlineLogout.disabled = true;
    dom.onlineStatus.textContent = '未登录';
    dom.onlineBadge.textContent = '需自建 API';
    dom.onlineBadge.className = 'badge warn';
    dom.onlineSearchBox.hidden = true;
    dom.onlineResults.innerHTML = '';
    dom.qrBox.hidden = true;
    clearInterval(state.qrTimer);
    toast('已退出登录');
  }

  function syncBuffering() {
    document.body.classList.toggle('is-buffering', state.loading || state.preloading);
  }

  function prewarm() {
    if (state.preloadPromise) return;
    const song = state.songs[0];
    if (!song || song.local) return;
    state.preloading = true;
    syncBuffering();
    const promise = renderSong(song)
      .catch((error) => {
        console.warn('[Folia] 预渲染失败：', error);
        return null;
      })
      .then((buffer) => {
        state.preloading = false;
        syncBuffering();
        if (dom.bootStatus) {
          dom.bootStatus.textContent = buffer ? '音频已就绪 · 点击进入即可播放' : '音频准备失败，进入后将重试';
          dom.bootStatus.classList.toggle('ready', Boolean(buffer));
        }
        return buffer;
      });
    state.preloadPromise = { id: song.id, promise };
  }

  async function loadSongBuffer(song) {
    if (state.preloadPromise && state.preloadPromise.id === song.id) {
      const cached = await state.preloadPromise.promise;
      if (cached) return cached;
    }
    return renderSong(song);
  }

  async function selectSong(index, options) {
    const opts = options || {};
    const song = state.songs[index];
    if (!song) return;
    if (index === state.index && engine.buffer && !opts.force) {
      if (opts.autoplay && !engine.playing) {
        engine.play();
        syncPlayState();
      }
      return;
    }

    const token = ++state.loadToken;
    engine.pause();
    syncPlayState();
    state.index = index;
    state.loading = true;
    syncBuffering();
    dom.playBtn.classList.add('is-loading');

    updateMeta(song, index);
    buildLyrics(song);
    if (state.theme === 'auto') applyTheme('auto');
    renderQueue();
    updateTotal();
    updateProgress(true);
    restartIdle();

    if (song.remote) {
      if (!song.streamUrl && !song.provider) {
        state.loading = false;
        syncBuffering();
        dom.playBtn.classList.remove('is-loading');
        toast('该在线音轨缺少播放地址');
        return;
      }
      showBuffer(song, '正在解析并缓冲在线音轨，完成后交由 GPU 分析频谱…');
      try {
        if (!song.streamUrl) {
          const resolved = await FoliaOnline.resolve(song);
          if (token !== state.loadToken) return;
          song.streamUrl = resolved.url;
          if (resolved.lyrics && resolved.lyrics.length) song.lyrics = resolved.lyrics;
          buildLyrics(song);
          updateMeta(song, index);
        }
        const ctx = engine.ensureContext();
        let buffer = state.remoteCache.get(song.id);
        if (!buffer) {
          const [loaded] = await Promise.all([
            FoliaSources.fetchAudioBuffer(ctx, song.streamUrl),
            new Promise((resolve) => setTimeout(resolve, 320)),
          ]);
          if (token !== state.loadToken) return;
          buffer = loaded;
          state.remoteCache.set(song.id, buffer);
          while (state.remoteCache.size > 6) {
            state.remoteCache.delete(state.remoteCache.keys().next().value);
          }
        }
        song.duration = buffer.duration;
        engine.loadBuffer(buffer, song.id);
        hideBuffer();
        state.loading = false;
        syncBuffering();
        dom.playBtn.classList.remove('is-loading');
        updateTotal();
        updateMeta(song, index);
        if (opts.autoplay !== false) {
          engine.play();
          requestWakeLock();
        }
        syncPlayState();
        renderQueue();
      } catch (error) {
        if (token !== state.loadToken) return;
        console.error(error);
        hideBuffer();
        state.loading = false;
        syncBuffering();
        dom.playBtn.classList.remove('is-loading');
        toast(error.message || '在线音轨缓冲失败');
        syncPlayState();
      }
      return;
    }

    if (song.local) {
      engine.loadBuffer(song.buffer, song.id);
      state.duration = song.duration;
      state.loading = false;
      syncBuffering();
      dom.playBtn.classList.remove('is-loading');
      updateTotal();
      if (opts.autoplay !== false) {
        engine.play();
        requestWakeLock();
      }
      syncPlayState();
      renderQueue();
      return;
    }

    showBuffer(song);
    try {
      const [buffer] = await Promise.all([
        loadSongBuffer(song),
        new Promise((resolve) => setTimeout(resolve, 420)),
      ]);
      if (token !== state.loadToken) return;
      engine.loadBuffer(buffer, song.id);
      state.duration = buffer.duration;
      hideBuffer();
      state.loading = false;
      syncBuffering();
      dom.playBtn.classList.remove('is-loading');
      updateTotal();
      if (opts.autoplay !== false) {
        engine.play();
        requestWakeLock();
      }
      syncPlayState();
      renderQueue();
    } catch (error) {
      if (token !== state.loadToken) return;
      console.error(error);
      hideBuffer();
      state.loading = false;
      syncBuffering();
      dom.playBtn.classList.remove('is-loading');
      toast('音频合成失败，请刷新页面重试');
      syncPlayState();
    }
  }

  function showBuffer(song, copy) {
    dom.bufferTitle.textContent = song.remote ? `正在缓冲《${song.title}》` : `正在合成《${song.title}》`;
    dom.bufferCopy.textContent = copy || '离线渲染音频与频谱，请稍候';
    dom.bufferOverlay.hidden = false;
    restartIdle();
  }

  function hideBuffer() {
    dom.bufferOverlay.hidden = true;
  }

  function togglePlay(force) {
    if (!state.booted) {
      enterPlayer();
      return;
    }
    if (state.loading) {
      toast('音轨正在准备中');
      return;
    }
    if (!engine.buffer) {
      if (!state.songs.length) {
        openSources();
        toast('请添加音乐源或导入本地音频');
        return;
      }
      selectSong(state.index, { autoplay: true });
      return;
    }
    const shouldPlay = typeof force === 'boolean' ? force : !engine.playing;
    if (shouldPlay) {
      engine.play();
      requestWakeLock();
    } else {
      engine.pause();
      releaseWakeLock();
    }
    syncPlayState();
    restartIdle();
  }

  function goNext(auto) {
    if (state.songs.length < 2) return;
    if (state.shuffle) {
      let next = state.index;
      while (next === state.index) next = Math.floor(Math.random() * state.songs.length);
      selectSong(next, { autoplay: true });
      return;
    }
    const isLast = state.index === state.songs.length - 1;
    if (isLast && auto && state.loop === 'off') {
      syncPlayState();
      return;
    }
    const next = isLast ? 0 : state.index + 1;
    selectSong(next, { autoplay: true });
  }

  function goPrev() {
    if (state.songs.length < 2) return;
    if (state.shuffle) {
      let next = state.index;
      while (next === state.index) next = Math.floor(Math.random() * state.songs.length);
      selectSong(next, { autoplay: true });
      return;
    }
    const next = state.index === 0 ? state.songs.length - 1 : state.index - 1;
    selectSong(next, { autoplay: true });
  }

  function cycleLoop() {
    const order = ['all', 'one', 'off'];
    state.loop = order[(order.indexOf(state.loop) + 1) % order.length];
    storage.set('folia.loop', state.loop);
    dom.loopBtn.classList.toggle('is-on', state.loop !== 'off');
    const icon = dom.loopBtn.querySelector('use');
    icon.setAttribute('href', state.loop === 'one' ? '#i-repeat-one' : '#i-repeat');
    dom.loopBtn.setAttribute('aria-label', `循环模式：${state.loop === 'all' ? '列表循环' : state.loop === 'one' ? '单曲循环' : '关闭循环'}`);
    toast(state.loop === 'all' ? '列表循环' : state.loop === 'one' ? '单曲循环' : '循环已关闭');
  }

  function toggleShuffle() {
    state.shuffle = !state.shuffle;
    storage.set('folia.shuffle', state.shuffle ? '1' : '0');
    dom.shuffleBtn.classList.toggle('is-on', state.shuffle);
    dom.shuffleBtn.setAttribute('aria-pressed', String(state.shuffle));
    toast(state.shuffle ? '随机播放已开启' : '随机播放已关闭');
  }

  function toggleMute() {
    state.muted = !state.muted;
    engine.setMuted(state.muted);
    dom.muteBtn.classList.toggle('is-muted', state.muted || state.volume === 0);
    dom.muteBtn.setAttribute('aria-label', state.muted ? '取消静音' : '静音');
    toast(state.muted ? '已静音' : '已恢复声音');
  }

  function cycleTheme() {
    const order = ['auto', 'aurora', 'dusk', 'sea', 'moon'];
    const next = order[(order.indexOf(state.theme) + 1) % order.length];
    applyTheme(next);
    const palette = resolveTheme(next);
    toast(`主题：${next === 'auto' ? '随曲（自动取色）' : palette.name}`);
  }

  function toggleLike() {
    const song = currentSong();
    if (!song) {
      toast('请先添加音乐源');
      return;
    }
    if (state.liked.has(song.id)) {
      state.liked.delete(song.id);
      toast('已取消收藏');
    } else {
      state.liked.add(song.id);
      toast('已收藏到本地');
    }
    dom.likeBtn.setAttribute('aria-pressed', String(state.liked.has(song.id)));
    storage.set('folia.liked', JSON.stringify(Array.from(state.liked)));
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      toast('当前浏览器不允许进入全屏');
    }
  }

  function restartIdle() {
    clearTimeout(state.idleTimer);
    dom.app.classList.remove('is-idle');
    if (!state.booted) return;
    const delay = state.isMobile ? 6200 : 4200;
    state.idleTimer = setTimeout(() => {
      if (engine.playing && !state.queueOpen && !state.loading && !state.scrubbing) {
        dom.app.classList.add('is-idle');
      }
    }, delay);
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      if (!state.wakeLock) state.wakeLock = await navigator.wakeLock.request('screen');
    } catch (error) {
      void error;
    }
  }

  function releaseWakeLock() {
    if (!state.wakeLock) return;
    try {
      state.wakeLock.release();
    } catch (error) {
      void error;
    }
    state.wakeLock = null;
  }

  async function importFiles(files) {
    if (!files || !files.length) return;
    try {
      engine.ensureContext();
    } catch (error) {
      toast('当前浏览器不支持 Web Audio');
      return;
    }
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) {
        toast(`${file.name} 不是音频文件`);
        continue;
      }
      try {
        toast(`正在载入 ${file.name}`, 4000);
        const bytes = await file.arrayBuffer();
        const buffer = await engine.ctx.decodeAudioData(bytes);
        const id = `local-${Date.now()}-${state.localCount}`;
        state.localCount++;
        const title = file.name.replace(/\.[^.]+$/, '') || '未命名音轨';
        const song = {
          id,
          title,
          titleEn: 'Local Track',
          artist: '本地音轨',
          album: '本次会话',
          year: new Date().getFullYear(),
          local: true,
          buffer,
          duration: buffer.duration,
          lyrics: [],
          theme: resolveTheme(state.theme),
        };
        ensureCover(song, state.songs.length);
        state.songs.push(song);
        renderQueue();
        toast(`已载入《${title}》`);
        selectSong(state.songs.length - 1, { autoplay: true });
      } catch (error) {
        console.error(error);
        toast(`无法解码 ${file.name}`);
      }
    }
    dom.fileInput.value = '';
  }

  function enterPlayer() {
    if (state.booted) return;
    state.booted = true;
    engine.setVolume(state.volume);
    try {
      engine.ensureContext();
    } catch (error) {
      toast('当前浏览器不支持音频播放');
    }
    dom.boot.classList.add('hidden');
    dom.app.classList.add('ready');
    if (!engine.buffer) {
      if (state.songs.length) selectSong(state.index, { autoplay: true });
      else openSources();
    } else {
      engine.play();
      syncPlayState();
    }
    requestWakeLock();
    restartIdle();
    setTimeout(() => dom.playBtn.focus({ preventScroll: true }), 900);
  }

  function setupVisualizer() {
    const ok = visual.init();
    if (ok) {
      visual.setPalette(resolveTheme(state.theme));
      const label = state.isMobile ? 'GPU' : `${visual.info.type} · GPU`;
      dom.gpuLabel.textContent = label;
      dom.gpuPill.title = `GPU 渲染：${visual.info.type} · ${visual.info.renderer}`;
      dom.gpuPill.addEventListener('click', () => {
        const renderer = (visual.info.renderer || '').slice(0, 120);
        toast(`GPU 渲染：${visual.info.type} · ${renderer}`, 4200);
      });
    } else {
      dom.gpuLabel.textContent = 'CSS 回退';
      dom.gpuPill.title = visual.info.renderer;
      dom.gpuPill.addEventListener('click', () => toast('WebGL 不可用，已切换到 CSS 渐变背景', 3600));
    }
  }

  function bindEvents() {
    dom.bootBtn.addEventListener('click', enterPlayer);
    dom.playBtn.addEventListener('click', () => togglePlay());
    dom.prevBtn.addEventListener('click', goPrev);
    dom.nextBtn.addEventListener('click', () => goNext(false));
    dom.shuffleBtn.addEventListener('click', toggleShuffle);
    dom.loopBtn.addEventListener('click', cycleLoop);
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.themeBtn.addEventListener('click', cycleTheme);
    dom.queueBtn.addEventListener('click', openQueue);
    dom.queueBtnMobile.addEventListener('click', openQueue);
    dom.queueClose.addEventListener('click', closeQueue);
    dom.queueScrim.addEventListener('click', closeQueue);
    dom.fullBtn.addEventListener('click', toggleFullscreen);
    dom.likeBtn.addEventListener('click', toggleLike);
    dom.importBtn.addEventListener('click', () => dom.fileInput.click());
    dom.queueImport.addEventListener('click', () => dom.fileInput.click());
    dom.sourceLocalBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', () => importFiles(dom.fileInput.files));

    dom.sourceBtn.addEventListener('click', () => {
      if (state.sourceOpen) closeSources();
      else openSources();
    });
    dom.styleBtn.addEventListener('click', () => {
      if (state.styleOpen) closeStyles();
      else openStyles();
    });
    dom.styleClose.addEventListener('click', closeStyles);
    dom.styleScrim.addEventListener('click', closeStyles);
    dom.sourceClose.addEventListener('click', closeSources);
    dom.sourceScrim.addEventListener('click', closeSources);
    dom.urlPlayBtn.addEventListener('click', playDirectUrl);
    dom.urlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        playDirectUrl();
      }
    });
    dom.subConnect.addEventListener('click', connectSubsonic);
    dom.onlineSave.addEventListener('click', saveOnlineBase);
    dom.onlineLogin.addEventListener('click', startOnlineLogin);
    dom.onlineLogout.addEventListener('click', logoutOnline);
    dom.onlineSearchBtn.addEventListener('click', onlineSearch);
    dom.onlineSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onlineSearch();
      }
    });
    dom.providerTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('.provider-tab');
      if (!tab) return;
      setOnlineTab(tab.dataset.provider);
    });

    dom.volume.addEventListener('input', () => {
      const value = Number(dom.volume.value) / 100;
      state.muted = false;
      engine.setMuted(false);
      applyVolume(value);
    });

    dom.progress.addEventListener('input', () => {
      state.scrubbing = true;
      const ratio = Number(dom.seek.value) / 1000;
      dom.progress.style.setProperty('--p', ratio.toFixed(5));
      const total = engine.duration || state.duration;
      dom.timeNow.textContent = DATA.formatTime(ratio * total);
    });
    dom.progress.addEventListener('change', () => {
      const total = engine.duration || state.duration;
      engine.seek((Number(dom.seek.value) / 1000) * total);
      state.scrubbing = false;
      updateProgress(true);
      restartIdle();
    });
    dom.progress.addEventListener('pointerdown', () => {
      state.scrubbing = true;
      dom.progress.classList.add('is-scrubbing');
      restartIdle();
    });
    window.addEventListener('pointerup', () => {
      if (!state.scrubbing) return;
      dom.progress.classList.remove('is-scrubbing');
      const total = engine.duration || state.duration;
      if (total > 0) engine.seek((Number(dom.seek.value) / 1000) * total);
      state.scrubbing = false;
      updateProgress(true);
      restartIdle();
    });

    dom.progress.addEventListener('keydown', (event) => {
      const total = engine.duration || state.duration;
      if (!total) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -5 : 5;
        engine.seek(clamp(engine.currentTime + delta, 0, total));
        updateProgress(true);
      }
    });

    dom.brandLink.addEventListener('click', (event) => {
      event.preventDefault();
      if (!state.booted) enterPlayer();
      else toast('gihao6 Folia Player · 歌词再想象');
    });

    dom.coverShell.addEventListener('pointermove', (event) => {
      if (matchMedia('(hover: none)').matches) return;
      const rect = dom.coverShell.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      dom.coverFrame.style.setProperty('--rx', `${x * 9}deg`);
      dom.coverFrame.style.setProperty('--ry', `${-y * 9}deg`);
    });
    dom.coverShell.addEventListener('pointerleave', () => {
      dom.coverFrame.style.setProperty('--rx', '0deg');
      dom.coverFrame.style.setProperty('--ry', '0deg');
    });

    document.addEventListener('keydown', (event) => {
      const tag = (event.target && event.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (typing && !(event.target.type === 'range')) return;
      if (event.key === 'Escape') {
        if (state.queueOpen) closeQueue();
        if (state.sourceOpen) closeSources();
        if (state.styleOpen) closeStyles();
        return;
      }
      if (!state.booted) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          enterPlayer();
        }
        return;
      }
      if (event.code === 'Space' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const total = engine.duration || state.duration;
        if (!total) return;
        if (event.shiftKey) {
          if (event.key === 'ArrowLeft') goPrev();
          else goNext(false);
        } else {
          engine.seek(clamp(engine.currentTime + (event.key === 'ArrowLeft' ? -5 : 5), 0, total));
          updateProgress(true);
        }
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'm') toggleMute();
      if (key === 'f') toggleFullscreen();
      if (key === 'q') {
        if (state.queueOpen) closeQueue();
        else openQueue();
      }
      if (key === 's') {
        if (state.sourceOpen) closeSources();
        else openSources();
      }
      if (key === 't') cycleTheme();
      if (key === 'v') cycleLyricStyle(event.shiftKey ? -1 : 1);
    });

    const wake = () => {
      restartIdle();
      if (state.queueOpen) return;
    };
    document.addEventListener('pointermove', wake, { passive: true });
    document.addEventListener('pointerdown', wake, { passive: true });
    document.addEventListener('touchstart', wake, { passive: true });
    document.addEventListener('keydown', wake);

    document.addEventListener('fullscreenchange', () => {
      const active = Boolean(document.fullscreenElement);
      dom.fullBtn.setAttribute('aria-label', active ? '退出全屏' : '进入全屏');
      dom.fullBtn.classList.toggle('is-on', active);
    });

    dom.queueSheet.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const focusables = dom.queueSheet.querySelectorAll('button, [href], input');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    let resizeTimer = 0;
    const onResize = () => {
      state.isMobile = matchMedia('(max-width: 560px)').matches;
      visual.resize();
      applyRailPadding();
      scrollLyrics(false);
    };
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 120);
    });
    window.addEventListener('orientationchange', () => setTimeout(onResize, 320));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        restartIdle();
        if (engine.playing) requestWakeLock();
      }
    });

    engine.onEnded = () => {
      if (state.loop === 'one') {
        engine.seek(0);
        engine.play();
        syncPlayState();
        return;
      }
      const isLast = state.index === state.songs.length - 1;
      if (isLast && state.loop === 'off' && !state.shuffle) {
        syncPlayState();
        restartIdle();
        return;
      }
      goNext(true);
    };

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => togglePlay(true));
        navigator.mediaSession.setActionHandler('pause', () => togglePlay(false));
        navigator.mediaSession.setActionHandler('previoustrack', goPrev);
        navigator.mediaSession.setActionHandler('nexttrack', () => goNext(false));
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          engine.seek(clamp(engine.currentTime - 10, 0, engine.duration));
          updateProgress(true);
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
          engine.seek(clamp(engine.currentTime + 10, 0, engine.duration));
          updateProgress(true);
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (typeof details.seekTime === 'number') {
            engine.seek(details.seekTime);
            updateProgress(true);
          }
        });
      } catch (error) {
        void error;
      }
    }
  }

  function loopFrame(now) {
    if (!loopFrame.last) loopFrame.last = now;
    const delta = Math.min(64, now - loopFrame.last);
    loopFrame.last = now;
    const elapsed = now / 1000;

    const freq = engine.analyse();
    const bands = engine.bands();
    const idle = 0.055 + Math.sin(elapsed * 0.55) * 0.02;
    const view = engine.playing ? bands : { bass: idle, mid: idle * 0.8, treble: idle * 0.6, level: idle };
    if (!state.loading && !state.preloading) visual.render(elapsed, view, freq);

    updateProgress(false);
    updateLyrics(engine.currentTime);

    state.frames++;
    if (now - state.fpsClock > 600) {
      state.fps = Math.round((state.frames * 1000) / (now - state.fpsClock));
      state.frames = 0;
      state.fpsClock = now;
      if (!state.isMobile && visual.ready) {
        dom.gpuLabel.textContent = `${visual.info.type} · ${state.fps} FPS`;
      }
    }

    requestAnimationFrame(loopFrame);
  }

  function registerPwa() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('[Folia] SW 注册失败', error));
    });
    let deferredPrompt = null;
    const installBtn = document.getElementById('installBtn');
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    }
    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.hidden = true;
      toast('已安装到桌面');
    });
  }

  function init() {
    setupVisualizer();
    state.songs.forEach((song, index) => ensureCover(song, index));
    applyTheme(DATA.THEMES[state.theme] ? state.theme : 'auto');
    applyVolume(state.volume);
    engine.setMuted(false);
    dom.volume.style.setProperty('--v', `${Math.round(state.volume * 100)}%`);
    dom.shuffleBtn.classList.toggle('is-on', state.shuffle);
    dom.shuffleBtn.setAttribute('aria-pressed', String(state.shuffle));
    dom.loopBtn.classList.toggle('is-on', state.loop !== 'off');
    dom.loopBtn.querySelector('use').setAttribute('href', state.loop === 'one' ? '#i-repeat-one' : '#i-repeat');
    dom.loopBtn.setAttribute('aria-label', `循环模式：${state.loop === 'all' ? '列表循环' : state.loop === 'one' ? '单曲循环' : '关闭循环'}`);
    if (currentSong()) {
      updateMeta(currentSong(), state.index);
      buildLyrics(currentSong());
    } else {
      renderEmptyState();
    }
    renderQueue();
    initSourceForm();
    initStyleGrid();
    applyLyricStyle(storage.get('folia.lyricStyle', 'classic'), true);
    bindEvents();
    updateTotal();
    updateProgress(true);
    requestAnimationFrame(loopFrame);
    restartIdle();
    setTimeout(prewarm, 700);
    setTimeout(() => {
      if (!state.booted && !document.hidden) dom.bootBtn.focus({ preventScroll: true });
    }, 1200);
  }

  registerPwa();
  init();
})();