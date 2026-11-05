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

  const SONGS = [];

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