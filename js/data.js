/* Folia Session — song data, themes and music theory tables */
(function (global) {
  'use strict';

  const THEMES = {
    auto: { name: '随曲', key: 'auto' },
    aurora: {
      name: '极光',
      bg: '#05070c',
      deep: '#081420',
      ink: '#f2f7ff',
      muted: '#8ea3b8',
      accent: '#7df0d0',
      accent2: '#6f8cff',
      line: 'rgba(255,255,255,.12)',
      glass: 'rgba(10,18,28,.46)',
    },
    dusk: {
      name: '暮色',
      bg: '#0b0608',
      deep: '#22090f',
      ink: '#fff3f0',
      muted: '#b08e92',
      accent: '#ff9a6b',
      accent2: '#ff4f8f',
      line: 'rgba(255,255,255,.12)',
      glass: 'rgba(26,10,14,.46)',
    },
    sea: {
      name: '海盐',
      bg: '#04090c',
      deep: '#08202a',
      ink: '#eefaff',
      muted: '#87a6b2',
      accent: '#7fd7ff',
      accent2: '#9dffd4',
      line: 'rgba(255,255,255,.12)',
      glass: 'rgba(6,20,26,.46)',
    },
    moon: {
      name: '月白',
      bg: '#08070d',
      deep: '#17122b',
      ink: '#f7f4ff',
      muted: '#a29bb8',
      accent: '#e9e2ff',
      accent2: '#b49cff',
      line: 'rgba(255,255,255,.14)',
      glass: 'rgba(16,13,28,.46)',
    },
  };

  const SONGS = [
    {
      id: 'tidal',
      title: '潮汐备忘录',
      titleEn: 'Tidal Memo',
      artist: 'Folia Session',
      album: '海岸线以北',
      year: 2026,
      bpm: 84,
      meter: 4,
      keyName: 'D 大调',
      mood: '海岸 / 慢板 / 氛围流行',
      art: { seed: 11, hueA: 196, hueB: 218, hueC: 44, style: 'wave' },
      theme: {
        bg: '#04090e',
        deep: '#07202b',
        ink: '#eaf8ff',
        muted: '#7f9baa',
        accent: '#7fe7ff',
        accent2: '#6f8dff',
        line: 'rgba(255,255,255,.12)',
        glass: 'rgba(6,18,26,.44)',
      },
      sections: [
        { kind: 'intro', bars: 4 },
        { kind: 'verse', bars: 6 },
        { kind: 'chorus', bars: 6 },
        { kind: 'break', bars: 2 },
        { kind: 'chorus', bars: 6 },
        { kind: 'outro', bars: 4 },
      ],
      progression: [
        { name: 'Dmaj7', notes: [50, 54, 57, 61], root: 50 },
        { name: 'Bm7', notes: [47, 50, 54, 57], root: 47 },
        { name: 'Gmaj7', notes: [43, 47, 50, 54], root: 43 },
        { name: 'A7sus4', notes: [45, 50, 52, 55], root: 45 },
      ],
      motif: [12, 16, 19, 24, 19, 16, 14, 12, 7, 12, 14, 16],
      lyrics: [
        { bar: 4, bars: 2, text: '潮水把月光折成信笺', tr: 'The tide folds moonlight into letters' },
        { bar: 6, bars: 2, text: '风在礁石上写下从前', tr: 'The wind writes the past on the reef' },
        { bar: 8, bars: 2, text: '我把没说完的那句晚安', tr: 'The goodnight I never finished saying' },
        { bar: 10, bars: 2, text: '交给退潮后的沙滩', tr: 'I leave it on the ebbing sand' },
        { bar: 12, bars: 2, text: '灯塔转过第十二圈', tr: 'The lighthouse turns its twelfth round' },
        { bar: 14, bars: 2, text: '影子比海浪更早靠岸', tr: 'Shadows reach the shore before the waves' },
        { bar: 16, bars: 2, text: '如果远方也有同样的夜', tr: 'If the same night reaches you out there' },
        { bar: 18, bars: 2, text: '请替我看一眼星群失眠', tr: 'Look up and watch the stars lie awake' },
        { bar: 20, bars: 2, text: '潮声退去 只剩我的名字', tr: 'The tide recedes, leaving only my name' },
        { bar: 22, bars: 2, text: '轻轻写在你的窗沿', tr: 'Softly written on your windowsill' },
        { bar: 24, bars: 2, text: '等下一次月圆', tr: 'Until the next full moon' },
      ],
    },
    {
      id: 'neon',
      title: '霓虹解剖',
      titleEn: 'Neon Anatomy',
      artist: 'Folia Session',
      album: '玻璃背面',
      year: 2026,
      bpm: 108,
      meter: 4,
      keyName: 'A 小调',
      mood: '合成器 / 夜行 / 都市流行',
      art: { seed: 27, hueA: 322, hueB: 264, hueC: 188, style: 'grid' },
      theme: {
        bg: '#0a050d',
        deep: '#260a24',
        ink: '#fff0fb',
        muted: '#b58ca8',
        accent: '#ff5bbd',
        accent2: '#7b5bff',
        line: 'rgba(255,255,255,.12)',
        glass: 'rgba(24,8,24,.44)',
      },
      sections: [
        { kind: 'intro', bars: 4 },
        { kind: 'verse', bars: 6 },
        { kind: 'chorus', bars: 6 },
        { kind: 'break', bars: 2 },
        { kind: 'chorus', bars: 6 },
        { kind: 'outro', bars: 3 },
      ],
      progression: [
        { name: 'Am7', notes: [45, 48, 52, 55], root: 45 },
        { name: 'Fmaj7', notes: [41, 45, 48, 52], root: 41 },
        { name: 'Cmaj7', notes: [48, 52, 55, 59], root: 48 },
        { name: 'G6', notes: [43, 47, 50, 52], root: 43 },
      ],
      motif: [12, 15, 19, 22, 19, 15, 12, 10, 7, 10, 12, 15],
      lyrics: [
        { bar: 4, bars: 2, text: '把霓虹拆成血管', tr: 'Dissect the neon into veins' },
        { bar: 6, bars: 2, text: '让电流替我说完', tr: 'Let the current finish my sentence' },
        { bar: 8, bars: 2, text: '城市在玻璃背面', tr: 'The city lives behind the glass' },
        { bar: 10, bars: 2, text: '练习一种新的失眠', tr: 'Rehearsing a new kind of insomnia' },
        { bar: 12, bars: 2, text: '红灯数到第三遍', tr: 'Counting the red light for the third time' },
        { bar: 14, bars: 2, text: '你的名字还停在喉间', tr: 'Your name still rests in my throat' },
        { bar: 16, bars: 2, text: '我把心跳调成静电', tr: 'I tune my heartbeat into static' },
        { bar: 18, bars: 2, text: '贴在午夜的耳边', tr: 'Pressed against midnight’s ear' },
        { bar: 20, bars: 2, text: '如果天亮之前', tr: 'If before the daylight' },
        { bar: 22, bars: 2, text: '我们仍认不出彼此的脸', tr: 'We still cannot recognise each other' },
      ],
    },
    {
      id: 'paper',
      title: '纸月亮',
      titleEn: 'Paper Moon',
      artist: 'Folia Session',
      album: '窗边的静物',
      year: 2026,
      bpm: 72,
      meter: 4,
      keyName: 'F 大调',
      mood: '室内乐 / 夜曲 / 极简',
      art: { seed: 41, hueA: 38, hueB: 16, hueC: 286, style: 'orbit' },
      theme: {
        bg: '#0b0805',
        deep: '#2a1a09',
        ink: '#fff8ec',
        muted: '#b39a7d',
        accent: '#ffd28a',
        accent2: '#ff9e6b',
        line: 'rgba(255,255,255,.13)',
        glass: 'rgba(26,18,10,.44)',
      },
      sections: [
        { kind: 'intro', bars: 4 },
        { kind: 'verse', bars: 6 },
        { kind: 'chorus', bars: 6 },
        { kind: 'break', bars: 2 },
        { kind: 'outro', bars: 4 },
      ],
      progression: [
        { name: 'Fmaj7', notes: [41, 45, 48, 52], root: 41 },
        { name: 'Dm7', notes: [38, 41, 45, 48], root: 38 },
        { name: 'Bbmaj7', notes: [46, 50, 53, 57], root: 46 },
        { name: 'Csus4', notes: [48, 53, 55, 60], root: 48 },
      ],
      motif: [12, 16, 19, 21, 19, 16, 12, 9, 7, 9, 12, 16],
      lyrics: [
        { bar: 4, bars: 2, text: '纸做的月亮挂在窗边', tr: 'A paper moon hangs by the window' },
        { bar: 6, bars: 2, text: '一碰就会碎成雪', tr: 'One touch and it shatters into snow' },
        { bar: 8, bars: 2, text: '我把台灯调暗一点', tr: 'I dim the lamp a little more' },
        { bar: 10, bars: 2, text: '好让你留在房间', tr: 'So that you might stay in the room' },
        { bar: 12, bars: 2, text: '旧唱片转到背面', tr: 'The old record turns to its other side' },
        { bar: 14, bars: 2, text: '沙沙声像一场雪', tr: 'The hiss sounds like falling snow' },
        { bar: 16, bars: 2, text: '如果明天没有晴天', tr: 'If tomorrow brings no clear sky' },
        { bar: 18, bars: 2, text: '就借这盏灯做一轮月', tr: 'Let this lamp be our moon' },
      ],
    },
  ];

  const PALETTE_KEYS = ['bg', 'deep', 'ink', 'muted', 'accent', 'accent2', 'line', 'glass'];

  function barSeconds(song) {
    return (song.meter * 60) / song.bpm;
  }

  function totalBars(song) {
    return song.sections.reduce((sum, section) => sum + section.bars, 0);
  }

  function duration(song) {
    return totalBars(song) * barSeconds(song) + 3.2;
  }

  function sectionAtBar(song, bar) {
    let cursor = 0;
    for (const section of song.sections) {
      if (bar < cursor + section.bars) return { ...section, startBar: cursor };
      cursor += section.bars;
    }
    return { ...song.sections[song.sections.length - 1], startBar: cursor };
  }

  function lyricTimeline(song) {
    const bar = barSeconds(song);
    return song.lyrics.map((line, index) => ({
      index,
      text: line.text,
      tr: line.tr,
      start: line.bar * bar,
      end: (line.bar + line.bars) * bar - 0.06,
    }));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const m = Math.floor(safe / 60);
    const s = Math.round(safe % 60);
    if (s === 60) return `${m + 1}:00`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  global.FoliaData = {
    THEMES,
    SONGS,
    PALETTE_KEYS,
    barSeconds,
    totalBars,
    duration,
    sectionAtBar,
    lyricTimeline,
    formatTime,
    formatDuration,
  };
})(window);