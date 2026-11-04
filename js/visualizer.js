/* Folia Session — WebGL visual surface + generative cover art */
(function (global) {
  'use strict';

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    uniform float uLevel;
    uniform vec3 uBg;
    uniform vec3 uDeep;
    uniform vec3 uAccent;
    uniform vec3 uAccent2;
    uniform sampler2D uFreq;
    uniform float uDetail;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = p * 2.02 + vec2(17.3, 9.1);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p = (gl_FragCoord.xy - uRes * 0.5) / min(uRes.x, uRes.y);
      float t = uTime * 0.042;

      vec2 q = p * 1.18;
      float warp = fbm(q * 1.35 + vec2(t * 0.8, -t * 0.62));
      float n = fbm(q + vec2(warp * 0.92, warp * 0.68) + vec2(-t * 0.42, t * 0.54));
      float n2 = fbm(q * 2.55 + vec2(-t * 0.66, t * 0.34));
      float n3 = uDetail > 0.5 ? fbm(q * 0.6 + vec2(t * 0.22, t * 0.18)) : n * 0.62;

      vec3 color = uBg;
      color = mix(color, uDeep, smoothstep(0.12, 0.92, n3));
      color = mix(color, uAccent, pow(smoothstep(0.52, 0.96, n2), 2.2) * (0.10 + uBass * 0.55));
      color = mix(color, uAccent2, pow(smoothstep(0.58, 0.98, n), 2.6) * (0.06 + uMid * 0.48));

      if (uDetail > 0.5) {
        float band = sin((p.y * 3.1 + n * 2.6 + t * 2.0) * 3.14159) * 0.5 + 0.5;
        color += uAccent * pow(band, 10.0) * (0.04 + uTreble * 0.30) * smoothstep(1.0, 0.05, length(p));
      }

      float glow = exp(-length(p * vec2(0.9, 1.25)) * 1.55);
      color += uAccent * glow * (0.045 + uLevel * 0.20);

      float fx = uv.x;
      float f = texture2D(uFreq, vec2(fx, 0.5)).r;
      float yLine = 0.045 + f * 0.12;
      float line = smoothstep(0.012, 0.0, abs(uv.y - yLine)) * (0.25 + f * 0.9);
      color += mix(uAccent, uAccent2, fx) * line * (0.16 + uBass * 0.5);

      float fall = smoothstep(0.0, 0.16, uv.y) * smoothstep(0.42, 0.0, abs(uv.y - yLine));
      color += mix(uAccent, uAccent2, fx) * fall * 0.035 * uLevel;

      float halo = smoothstep(1.25, 0.2, length(p * vec2(0.95, 1.1)));
      color += vec3(0.008, 0.010, 0.014) * halo;

      if (uDetail > 0.5) {
        float starField = hash(floor(gl_FragCoord.xy * 0.7) + floor(uTime * 1.5));
        color += vec3(step(0.99935, starField)) * (0.35 + uTreble * 0.9) * smoothstep(1.1, 0.1, length(p));
      }

      float vignette = smoothstep(1.5, 0.35, length(p * vec2(0.82, 1.05)));
      color *= mix(0.52, 1.0, vignette);

      float grain = (hash(gl_FragCoord.xy + uTime * 1.7) - 0.5) * 0.032;
      color += grain;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log || 'shader compile failed');
    }
    return shader;
  }

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const int = parseInt(full, 16);
    return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
  }

  class VisualSurface {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null;
      this.program = null;
      this.freqTexture = null;
      this.positions = null;
      this.uni = {};
      this.info = { type: '未启用', renderer: '不可用', vendor: '' };
      this.ready = false;
      this.dpr = 1;
      this.width = 0;
      this.height = 0;
      this.fallback = false;
      this.quality = 1;
      this.maxPixels = 2200000;
    }

    init() {
      const attrs = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      };
      let gl = null;
      try {
        gl = this.canvas.getContext('webgl2', attrs);
        if (gl) this.info.type = 'WebGL 2';
      } catch (error) {
        void error;
      }
      if (!gl) {
        try {
          gl = this.canvas.getContext('webgl', attrs) || this.canvas.getContext('experimental-webgl', attrs);
          if (gl) this.info.type = 'WebGL 1';
        } catch (error) {
          void error;
        }
      }
      if (!gl) {
        this.fallback = true;
        this.info = { type: 'CSS 回退', renderer: '当前环境未启用 WebGL', vendor: '' };
        document.documentElement.classList.add('no-webgl');
        return false;
      }
      this.gl = gl;
      this.isWebGL2 = !!(global.WebGL2RenderingContext && gl instanceof global.WebGL2RenderingContext);

      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          this.info.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
          this.info.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        } else {
          this.info.renderer = gl.getParameter(gl.RENDERER) || '';
          this.info.vendor = gl.getParameter(gl.VENDOR) || '';
        }
      } catch (error) {
        this.info.renderer = 'Renderer 信息受保护';
      }

      try {
        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
        }
        this.program = program;
        gl.useProgram(program);

        this.positions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positions);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        this.uni = {
          res: gl.getUniformLocation(program, 'uRes'),
          time: gl.getUniformLocation(program, 'uTime'),
          bass: gl.getUniformLocation(program, 'uBass'),
          mid: gl.getUniformLocation(program, 'uMid'),
          treble: gl.getUniformLocation(program, 'uTreble'),
          level: gl.getUniformLocation(program, 'uLevel'),
          bg: gl.getUniformLocation(program, 'uBg'),
          deep: gl.getUniformLocation(program, 'uDeep'),
          accent: gl.getUniformLocation(program, 'uAccent'),
          accent2: gl.getUniformLocation(program, 'uAccent2'),
          freq: gl.getUniformLocation(program, 'uFreq'),
          detail: gl.getUniformLocation(program, 'uDetail'),
        };

        this.freqTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.freqTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.isWebGL2 ? gl.R8 : gl.LUMINANCE, 1, 1, 0,
          this.isWebGL2 ? gl.RED : gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(1));
        gl.uniform1i(this.uni.freq, 0);

        this.canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          this.ready = false;
        });
        this.canvas.addEventListener('webglcontextrestored', () => {
          this.ready = false;
          this.init();
        });

        const software = /swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(this.info.renderer || '');
        if (software) {
          this.quality = 0.45;
          this.maxPixels = 620000;
        } else if (this.width * this.height > 0 && this.info.type === 'WebGL 1') {
          this.quality = 0.85;
          this.maxPixels = 1600000;
        }
        if (/[?&]hq=1/.test(global.location.search)) {
          this.quality = 1;
          this.maxPixels = 2600000;
        }
        gl.uniform1f(this.uni.detail, this.quality);
        this.ready = true;
        this.resize();
        return true;
      } catch (error) {
        console.warn('[Folia] WebGL 初始化失败，使用 CSS 回退：', error);
        this.fallback = true;
        this.info = { type: 'CSS 回退', renderer: String(error.message || error), vendor: '' };
        document.documentElement.classList.add('no-webgl');
        return false;
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(2, Math.max(1, global.devicePixelRatio || 1));
      const maxPixels = this.maxPixels || 2200000;
      const desired = Math.max(1, rect.width * rect.height * dpr * dpr);
      const scale = desired > maxPixels ? Math.max(0.62, Math.sqrt(maxPixels / Math.max(1, rect.width * rect.height))) : dpr;
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (this.width === width && this.height === height) return;
      this.width = width;
      this.height = height;
      this.dpr = scale;
      this.canvas.width = width;
      this.canvas.height = height;
      if (this.gl) {
        this.gl.viewport(0, 0, width, height);
        this.gl.uniform2f(this.uni.res, width, height);
      }
    }

    setPalette(palette) {
      if (!this.gl || !this.ready) return;
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.uniform3fv(this.uni.bg, hexToRgb(palette.bg));
      gl.uniform3fv(this.uni.deep, hexToRgb(palette.deep));
      gl.uniform3fv(this.uni.accent, hexToRgb(palette.accent));
      gl.uniform3fv(this.uni.accent2, hexToRgb(palette.accent2));
    }

    render(time, bands, freq) {
      if (!this.gl || !this.ready) return;
      this.resize();
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.uniform1f(this.uni.time, time);
      gl.uniform1f(this.uni.bass, bands.bass);
      gl.uniform1f(this.uni.mid, bands.mid);
      gl.uniform1f(this.uni.treble, bands.treble);
      gl.uniform1f(this.uni.level, bands.level);
      gl.bindTexture(gl.TEXTURE_2D, this.freqTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, this.isWebGL2 ? gl.R8 : gl.LUMINANCE, freq.length, 1, 0,
        this.isWebGL2 ? gl.RED : gl.LUMINANCE, gl.UNSIGNED_BYTE, freq);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function makeCover(song, size) {
    const px = size || 768;
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    const { hueA, hueB, hueC, seed, style } = song.art;
    const rand = (function (s) {
      let a = s >>> 0;
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })(seed * 131 + 7);

    const base = ctx.createLinearGradient(0, 0, px, px);
    base.addColorStop(0, `hsl(${hueA} 66% 19%)`);
    base.addColorStop(0.55, `hsl(${hueB} 70% 14%)`);
    base.addColorStop(1, `hsl(${hueC} 52% 11%)`);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, px, px);

    const blobs = [
      { x: 0.22, y: 0.26, r: 0.56, hue: hueA, alpha: 0.66 },
      { x: 0.78, y: 0.7, r: 0.52, hue: hueB, alpha: 0.58 },
      { x: 0.6, y: 0.15, r: 0.34, hue: hueC, alpha: 0.42 },
    ];
    ctx.globalCompositeOperation = 'screen';
    blobs.forEach((blob) => {
      const gradient = ctx.createRadialGradient(
        px * blob.x, px * blob.y, 0,
        px * blob.x, px * blob.y, px * blob.r,
      );
      gradient.addColorStop(0, `hsla(${blob.hue}, 95%, 72%, ${blob.alpha})`);
      gradient.addColorStop(0.42, `hsla(${blob.hue}, 90%, 50%, ${blob.alpha * 0.6})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, px, px);
    });

    ctx.globalCompositeOperation = 'source-over';

    if (style === 'wave') {
      for (let line = 0; line < 26; line++) {
        const offset = line / 26;
        ctx.beginPath();
        for (let x = 0; x <= px; x += 6) {
          const nx = x / px;
          const y = px * (0.34 + offset * 0.52) + Math.sin(nx * 6.2 + offset * 7 + seed) * px * 0.045
            + Math.sin(nx * 13.4 + offset * 3) * px * 0.018;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hueA}, 85%, ${68 - offset * 22}%, ${0.05 + offset * 0.1})`;
        ctx.lineWidth = 1 + offset * 1.6;
        ctx.stroke();
      }
    }

    if (style === 'grid') {
      ctx.save();
      ctx.translate(px * 0.5, px * 0.62);
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * px * 0.055, 0);
        ctx.lineTo(i * px * 0.24, px * 0.5);
        ctx.strokeStyle = `hsla(${hueA}, 90%, 65%, .22)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      for (let i = 1; i < 12; i++) {
        const y = Math.pow(i / 12, 2.1) * px * 0.5;
        ctx.beginPath();
        ctx.moveTo(-px, y);
        ctx.lineTo(px, y);
        ctx.strokeStyle = `hsla(${hueB}, 90%, 60%, .18)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
      const sun = ctx.createRadialGradient(px * 0.5, px * 0.4, 0, px * 0.5, px * 0.4, px * 0.24);
      sun.addColorStop(0, `hsla(${hueA}, 100%, 78%, .8)`);
      sun.addColorStop(0.5, `hsla(${hueA}, 95%, 58%, .35)`);
      sun.addColorStop(1, 'transparent');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, px, px);
    }

    if (style === 'orbit') {
      ctx.save();
      ctx.translate(px * 0.52, px * 0.46);
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, px * (0.08 + i * 0.033), px * (0.06 + i * 0.028), i * 0.28, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${i % 2 ? hueA : hueC}, 85%, 70%, ${0.25 - i * 0.012})`;
        ctx.lineWidth = 1 + (i % 3) * 0.6;
        ctx.stroke();
      }
      const moon = ctx.createRadialGradient(px * 0.06, -px * 0.12, 0, px * 0.06, -px * 0.12, px * 0.22);
      moon.addColorStop(0, `hsla(${hueA}, 95%, 88%, .95)`);
      moon.addColorStop(0.5, `hsla(${hueA}, 90%, 68%, .3)`);
      moon.addColorStop(1, 'transparent');
      ctx.fillStyle = moon;
      ctx.fillRect(-px, -px, px * 2, px * 2);
      ctx.restore();
    }

    for (let i = 0; i < 9000; i++) {
      const x = rand() * px;
      const y = rand() * px;
      const alpha = rand() * 0.10;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 1.1, 1.1);
    }

    const vignette = ctx.createRadialGradient(px / 2, px / 2, px * 0.12, px / 2, px / 2, px * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, px, px);

    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.lineWidth = 2;
    roundRect(ctx, 10, 10, px - 20, px - 20, px * 0.045);
    ctx.stroke();

    return canvas.toDataURL('image/jpeg', 0.88);
  }

  global.FoliaVisual = {
    VisualSurface,
    makeCover,
    hexToRgb,
  };
})(window);