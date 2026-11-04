/* Folia Session — pluggable music sources */
(function (global) {
  'use strict';

  const STORE_KEY = 'folia.sources';

  function readStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (error) {
      return {};
    }
  }

  function writeStore(patch) {
    const next = { ...readStore(), ...patch };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch (error) {
      void error;
    }
    return next;
  }

  function normalizeServer(value) {
    const raw = String(value || '').trim();
    if (!raw) throw new Error('请填写服务器地址');
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('服务器地址必须以 http:// 或 https:// 开头');
    }
    return url.origin + url.pathname.replace(/\/+$/, '');
  }

  function authParams(config) {
    return {
      u: config.user,
      p: config.pass,
      v: '1.16.1',
      c: 'FoliaSession',
      f: 'json',
    };
  }

  function endpoint(config, name, params) {
    const server = normalizeServer(config.server);
    const search = new URLSearchParams({ ...authParams(config), ...(params || {}) });
    return `${server}/rest/${name}.view?${search.toString()}`;
  }

  async function requestJson(url) {
    let response;
    try {
      response = await fetch(url, { method: 'GET', cache: 'no-store' });
    } catch (error) {
      throw new Error('无法连接服务器：可能是跨域（CORS）被拒绝或网络不可达');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('认证失败：请检查用户名与密码');
    }
    if (!response.ok) throw new Error(`服务器返回 ${response.status}`);
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error('服务器返回的不是 Subsonic JSON，请确认地址与 API 版本');
    }
    const body = payload['subsonic-response'];
    if (!body) throw new Error('缺少 subsonic-response 字段');
    if (body.status !== 'ok') {
      const message = body.error && body.error.message ? body.error.message : 'Subsonic 请求失败';
      throw new Error(message);
    }
    return body;
  }

  async function ping(config) {
    if (!config.user) throw new Error('请填写用户名');
    if (!config.pass) throw new Error('请填写密码');
    return requestJson(endpoint(config, 'ping'));
  }

  async function randomSongs(config, size) {
    const body = await requestJson(endpoint(config, 'getRandomSongs', { size: String(size || 50) }));
    const list = body.randomSongs && body.randomSongs.song ? body.randomSongs.song : [];
    return Array.isArray(list) ? list : [list];
  }

  function streamUrl(config, id) {
    return endpoint(config, 'stream', { id, maxBitRate: '320' });
  }

  function coverUrl(config, id) {
    return endpoint(config, 'getCoverArt', { id, size: '600' });
  }

  function mapSubsonicSongs(songs, config) {
    const server = normalizeServer(config.server);
    return songs.map((song) => ({
      id: `subsonic:${server}:${song.id}`,
      title: song.title || song.name || '未命名音轨',
      titleEn: song.album || 'Remote Track',
      artist: song.artist || '未知艺术家',
      album: song.album || '在线曲库',
      year: song.year || null,
      bpm: null,
      keyName: '',
      mood: '',
      duration: Number(song.duration) || 0,
      remote: true,
      sourceLabel: 'Navidrome',
      streamUrl: streamUrl(config, song.id),
      cover: song.coverArt ? coverUrl(config, song.coverArt) : null,
      lyrics: [],
    }));
  }

  async function fetchAudioBuffer(ctx, url) {
    let response;
    try {
      response = await fetch(url, { cache: 'no-store' });
    } catch (error) {
      throw new Error('缓冲失败：服务器未允许跨域（CORS）或网络不可达');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('缓冲失败：认证被拒绝，请重新连接音乐源');
    }
    if (!response.ok) throw new Error(`缓冲失败：服务器返回 ${response.status}`);
    const bytes = await response.arrayBuffer();
    try {
      return await ctx.decodeAudioData(bytes);
    } catch (error) {
      throw new Error('缓冲失败：无法解码该音频格式');
    }
  }

  function saveGateway(value) {
    const raw = String(value || '').trim();
    if (!raw) throw new Error('请填写授权网关地址');
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('授权网关必须以 http:// 或 https:// 开头');
    }
    return writeStore({ gateway: url.origin });
  }

  function gateway() {
    return readStore().gateway || '';
  }

  function openAuth(provider, redirectUri) {
    const base = gateway();
    if (!base) throw new Error('请先配置授权网关');
    const url = new URL(base + '/oauth/start');
    url.searchParams.set('provider', provider);
    url.searchParams.set('redirect_uri', redirectUri);
    const popup = global.open(url.toString(), 'folia-oauth', 'width=480,height=720');
    if (!popup) throw new Error('弹窗被浏览器拦截，请允许弹窗后重试');
    return popup;
  }

  async function fetchGatewayLibrary(provider, token) {
    const base = gateway();
    if (!base) throw new Error('请先配置授权网关');
    const url = new URL(base + '/library');
    url.searchParams.set('provider', provider);
    url.searchParams.set('token', token);
    let response;
    try {
      response = await fetch(url.toString(), { cache: 'no-store' });
    } catch (error) {
      throw new Error('无法连接授权网关，请检查 CORS 与地址');
    }
    if (!response.ok) throw new Error(`授权网关返回 ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.songs) ? payload.songs : [];
  }

  function parseLrc(text) {
    if (!text) return [];
    const lines = [];
    const pattern = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    String(text).split(/\r?\n/).forEach((row) => {
      const stamps = [];
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(row))) {
        const minutes = Number(match[1]);
        const seconds = Number(match[2]);
        const fraction = match[3] ? Number(('0.' + match[3]).slice(0, 4)) : 0;
        stamps.push(minutes * 60 + seconds + fraction);
      }
      if (!stamps.length) return;
      const body = row.replace(pattern, '').trim();
      if (!body) return;
      stamps.forEach((start) => lines.push({ start, text: body }));
    });
    lines.sort((a, b) => a.start - b.start);
    return lines.map((line, index) => ({
      index,
      text: line.text,
      tr: '',
      start: line.start,
      end: lines[index + 1] ? lines[index + 1].start - 0.05 : line.start + 6,
    }));
  }

  function mapGatewaySongs(songs, providerLabel) {
    return songs.map((song, index) => {
      const lyrics = song.lyrics ? parseLrc(song.lyrics) : (Array.isArray(song.lyrics) ? song.lyrics : []);
      return {
        id: `gateway:${providerLabel}:${song.id || index}`,
        title: song.title || song.name || '未命名音轨',
        titleEn: song.album || 'Remote Track',
        artist: song.artist || '未知艺术家',
        album: song.album || '在线曲库',
        year: song.year || null,
        bpm: null,
        keyName: '',
        mood: '',
        duration: Number(song.duration) || 0,
        remote: true,
        sourceLabel: providerLabel,
        streamUrl: song.streamUrl || song.url || '',
        cover: song.coverUrl || song.cover || null,
        lyrics,
      };
    });
  }

  global.FoliaSources = {
    normalizeServer,
    ping,
    randomSongs,
    streamUrl,
    coverUrl,
    mapSubsonicSongs,
    fetchAudioBuffer,
    saveGateway,
    gateway,
    openAuth,
    fetchGatewayLibrary,
    mapGatewaySongs,
    parseLrc,
    readStore,
    writeStore,
  };
})(window);