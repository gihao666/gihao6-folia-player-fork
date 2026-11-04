/* Folia Session — self-hosted online music platform bridge */
(function (global) {
  'use strict';

  const parseLrc = global.FoliaSources.parseLrc;
  const CONFIG_KEY = 'folia.online.configs';
  const DEFAULT_BASE = { netease: 'http://localhost:3000', qq: 'http://localhost:3200' };
  const COOKIE_KEY = 'folia.online.cookies';

  const PROVIDERS = {
    netease: { name: '网易云音乐', supportsQr: true },
    qq: { name: 'QQ音乐', supportsQr: true },
  };

  function readJson(storage, key, fallback) {
    try {
      const value = JSON.parse(storage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      void error;
    }
  }

  function baseOf(provider) {
    const configs = readJson(localStorage, CONFIG_KEY, {});
    return (configs[provider] && configs[provider].base) || DEFAULT_BASE[provider] || '';
  }

  function saveBase(provider, raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('请填写 API 地址');
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('API 地址必须以 http:// 或 https:// 开头');
    }
    const configs = readJson(localStorage, CONFIG_KEY, {});
    configs[provider] = { ...(configs[provider] || {}), base: url.origin + url.pathname.replace(/\/+$/, '') };
    writeJson(localStorage, CONFIG_KEY, configs);
    return configs[provider].base;
  }

  function cookieOf(provider) {
    const cookies = readJson(sessionStorage, COOKIE_KEY, {});
    return cookies[provider] || '';
  }

  function saveCookie(provider, cookie) {
    const cookies = readJson(sessionStorage, COOKIE_KEY, {});
    cookies[provider] = String(cookie || '');
    writeJson(sessionStorage, COOKIE_KEY, cookies);
  }

  function clearCookie(provider) {
    const cookies = readJson(sessionStorage, COOKIE_KEY, {});
    delete cookies[provider];
    writeJson(sessionStorage, COOKIE_KEY, cookies);
  }

  const enc = (value) => encodeURIComponent(String(value));

  function attachCookie(url, provider) {
    const cookie = cookieOf(provider);
    if (!cookie) return url;
    const target = new URL(url);
    target.searchParams.set('cookie', cookie);
    return target.toString();
  }

  async function getJson(url) {
    let response;
    try {
      response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    } catch (error) {
      throw new Error('无法连接 API：请检查地址、HTTPS 与允许凭据的 CORS 配置');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('API 拒绝了请求：请确认已登录并允许 CORS credentials');
    }
    if (!response.ok) throw new Error(`API 返回 HTTP ${response.status}`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('API 返回的不是 JSON，请确认地址正确');
    }
  }

  function mapNetease(song) {
    const album = song.al || song.album || {};
    const artists = Array.isArray(song.ar)
      ? song.ar
      : (Array.isArray(song.artists) ? song.artists : []);
    const artist = artists
      .map((item) => item && item.name)
      .filter(Boolean)
      .join(' / ');
    return {
      id: `netease:${song.id}`,
      provider: 'netease',
      remoteId: String(song.id),
      title: song.name || song.title || '未命名音轨',
      titleEn: album.name || 'NetEase',
      artist: artist || song.artist || '未知艺术家',
      album: album.name || '在线曲库',
      year: null,
      bpm: null,
      keyName: '',
      mood: '',
      duration: Math.round((Number(song.dt || song.duration) || 0) / 1000),
      remote: true,
      sourceLabel: '网易云音乐',
      streamUrl: '',
      cover: album.picUrl || album.pic_url || null,
      lyrics: [],
    };
  }

  function mapQq(item) {
    const singers = Array.isArray(item.singer)
      ? item.singer.map((singer) => singer.name).filter(Boolean)
      : [item.singer].filter(Boolean);
    const songmid = String(item.songmid || item.mid || item.songMid || '');
    const albummid = String(item.albummid || item.albumMid || '');
    return {
      id: `qq:${songmid}`,
      provider: 'qq',
      remoteId: songmid,
      title: item.songname || item.name || item.title || '未命名音轨',
      titleEn: item.albumname || item.albumName || 'QQ Music',
      artist: singers.join(' / ') || '未知艺术家',
      album: item.albumname || item.albumName || '在线曲库',
      year: null,
      bpm: null,
      keyName: '',
      mood: '',
      duration: Number(item.interval) || Math.round((Number(item.duration) || 0) / 1000),
      remote: true,
      sourceLabel: 'QQ音乐',
      streamUrl: '',
      cover: albummid ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albummid}.jpg` : null,
      lyrics: [],
    };
  }

  async function startLogin(provider, base) {
    if (!PROVIDERS[provider] || !PROVIDERS[provider].supportsQr) {
      throw new Error('该平台暂不支持网页扫码登录');
    }
    const channel = provider === 'qq' ? 'wechat' : '';
    const channelQuery = channel ? `channel=${channel}&` : '';
    const keyBody = await getJson(`${base}/login/qr/key?${channelQuery}timestamp=${Date.now()}`);
    const key = String((keyBody && keyBody.data && keyBody.data.unikey) || '');
    if (!key) throw new Error('API 未返回二维码 key');
    const qrBody = await getJson(`${base}/login/qr/create?key=${enc(key)}&qrimg=true&timestamp=${Date.now()}`);
    const image = String((qrBody && qrBody.data && qrBody.data.qrimg) || '');
    if (!image) throw new Error('API 未返回二维码图片');
    return { key, image };
  }

  async function checkLogin(provider, base, key) {
    const body = await getJson(attachCookie(`${base}/login/qr/check?key=${enc(key)}&timestamp=${Date.now()}`, provider));
    const code = Number(body && body.code);
    if (code === 803) {
      const cookie = (body && body.cookie) || (body && body.data && body.data.cookie);
      if (cookie) saveCookie(provider, cookie);
      return { state: 'confirmed' };
    }
    if (code === 800) return { state: 'expired' };
    if (code === 802) return { state: 'scanned' };
    if (code === 801) return { state: 'waiting' };
    return { state: 'error', message: (body && body.message) || `code ${code}` };
  }

  async function search(provider, base, keyword) {
    if (provider === 'netease') {
      const body = await getJson(attachCookie(`${base}/search?keywords=${enc(keyword)}&type=1&limit=20&timestamp=${Date.now()}`, provider));
      const songs = (body && body.result && body.result.songs) || [];
      return songs.map(mapNetease);
    }
    if (provider === 'qq') {
      const body = await getJson(attachCookie(`${base}/search?keyword=${enc(keyword)}&type=song&page=1&limit=20&timestamp=${Date.now()}`, provider));
      const items = (body && body.items) || [];
      return items.map(mapQq).filter((track) => track.remoteId);
    }
    throw new Error('该平台暂不支持网页搜索');
  }

  async function resolve(song) {
    const provider = song.provider;
    const base = baseOf(provider);
    if (!base) throw new Error('请先配置 API 地址');
    if (provider === 'netease') {
      const body = await getJson(attachCookie(`${base}/song/url/v1?id=${enc(song.remoteId)}&level=exhigh&timestamp=${Date.now()}`, provider));
      const entry = body && body.data && body.data[0];
      const url = entry && entry.url;
      if (!url) throw new Error('网易云未返回播放地址（可能无版权或未登录）');
      let lyrics = [];
      try {
        const lyricBody = await getJson(attachCookie(`${base}/lyric?id=${enc(song.remoteId)}&timestamp=${Date.now()}`, provider));
        lyrics = parseLrc(lyricBody && lyricBody.lrc && lyricBody.lrc.lyric);
      } catch (error) {
        console.warn('[Folia] 歌词加载失败：', error);
      }
      return { url, lyrics };
    }
    if (provider === 'qq') {
      const body = await getJson(attachCookie(`${base}/getMusicPlay/${enc(song.remoteId)}?quality=standard&timestamp=${Date.now()}`, provider));
      const map = (body && body.data && body.data.playUrl) || {};
      const entry = map[song.remoteId] || Object.values(map)[0];
      const url = entry && entry.url;
      if (!url) throw new Error('QQ音乐未返回播放地址（可能无版权或未登录）');
      let lyrics = [];
      try {
        const lyricBody = await getJson(attachCookie(`${base}/getLyric?songmid=${enc(song.remoteId)}&isFormat=1&timestamp=${Date.now()}`, provider));
        const payload = (lyricBody && lyricBody.response) || lyricBody || {};
        const raw = payload.lyric;
        if (typeof raw === 'string') {
          lyrics = parseLrc(raw);
        } else if (raw && Array.isArray(raw.lines)) {
          lyrics = raw.lines.map((line, index) => ({
            index,
            text: line.txt || line.text || '',
            tr: '',
            start: (Number(line.time) || 0) / 1000,
            end: index + 1 < raw.lines.length ? (Number(raw.lines[index + 1].time) || 0) / 1000 - 0.05 : (Number(line.time) || 0) / 1000 + 6,
          })).filter((line) => line.text);
        } else if (raw && typeof raw.lyric === 'string') {
          lyrics = parseLrc(raw.lyric);
        }
      } catch (error) {
        console.warn('[Folia] QQ 歌词加载失败：', error);
      }
      return { url, lyrics };
    }
    throw new Error('该平台暂不支持网页播放');
  }

  function logout(provider) {
    clearCookie(provider);
  }

  global.FoliaOnline = {
    PROVIDERS,
    baseOf,
    saveBase,
    cookieOf,
    startLogin,
    checkLogin,
    search,
    resolve,
    logout,
  };
})(window);