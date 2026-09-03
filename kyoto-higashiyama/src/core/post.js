import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { PAL } from './palette.js';

/* ------------------------------------------------------------------ *
 * The 3D-to-2D pipeline.
 *
 *   scene  ->  rtScene (colour + depth texture)
 *          ->  ink pass    : screen-space line work derived from depth
 *          ->  grade pass  : anime colour grade + linear->sRGB
 *          ->  fxaa pass   : clean up the line work, straight to screen
 *
 * **Lines come from a second difference of linearised depth, not a Sobel.**
 * A first difference (or any image-gradient edge filter) fires wherever the
 * surface is grazing the camera, which on a street means the road inks solid
 * from about fifteen metres out and every roof slope gets a dirty edge.  The
 * second difference is flat across *any* planar surface no matter how oblique,
 * so it only fires on real silhouettes and real creases.
 *
 * Positive curvature -- the near side of a silhouette, a convex ridge, the
 * corner of a building -- inks strongly.  Negative curvature -- inside corners,
 * where a wall meets the ground, the valley of a roof -- inks faintly, which is
 * exactly the lighter contact line an animator draws.  Those two weights being
 * different is a large part of why the output reads as drawn.
 *
 * Higashiyama adds one thing the flat original did not need: `uNearBoost`.  The
 * route climbs, so a great deal of it is looked at *down* a slope with the far
 * end of the street eighty metres away and forty metres below.  Distance fade
 * alone then thins the ink on exactly the part of the frame that carries the
 * composition -- the roofs stacking downhill.  The boost re-weights by height
 * difference rather than by distance so a roofscape below the camera keeps its
 * lines.
 * ------------------------------------------------------------------ */

const INK_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uNear: { value: 0.25 },
    uFar: { value: 900 },
    uInk: { value: new THREE.Color(PAL.ink) },
    uThickness: { value: 1.35 },
    /* Sensitivity, and it is the one number in the pipeline most worth
     * sweeping against renders rather than reasoning about.  0.0040 was the
     * first guess and it produced an image with almost no line work in it at
     * all: a Kyoto street is mostly large co-planar surfaces meeting at shallow
     * angles, so the second difference is genuinely small over most of the
     * frame, and the threshold has to come down to meet it.  0.0018 puts a line
     * on every eave, every post, every fence rail and every roofline against the
     * sky without inking the paving. */
    uSens: { value: 0.0018 },
    uConcave: { value: 0.013 },
    uConcaveAmount: { value: 0.44 },
    uFadeStart: { value: 62.0 },
    uFadeEnd: { value: 165.0 },
    uStrength: { value: 1.0 },
    uSkyDepth: { value: 620.0 },
    uInkMix: { value: 0.18 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4( position.xy, 0.0, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uTexel;
    uniform float uNear, uFar;
    uniform vec3 uInk;
    uniform float uThickness, uSens, uConcave, uConcaveAmount;
    uniform float uFadeStart, uFadeEnd, uStrength, uSkyDepth, uInkMix;
    varying vec2 vUv;

    float linearDepth( vec2 uv ) {
      float d = texture2D( tDepth, uv ).x;
      return -perspectiveDepthToViewZ( d, uNear, uFar );
    }

    void main() {
      vec3 col = texture2D( tDiffuse, vUv ).rgb;

      vec2 t = uTexel * uThickness;
      float dc = linearDepth( vUv );

      if ( dc > uSkyDepth ) {
        gl_FragColor = vec4( col, 1.0 );
        return;
      }

      float dl = linearDepth( vUv - vec2( t.x, 0.0 ) );
      float dr = linearDepth( vUv + vec2( t.x, 0.0 ) );
      float du = linearDepth( vUv + vec2( 0.0, t.y ) );
      float dd = linearDepth( vUv - vec2( 0.0, t.y ) );

      // second difference of linear depth, normalised by distance
      float sx = ( dl + dr - 2.0 * dc ) / dc;
      float sy = ( du + dd - 2.0 * dc ) / dc;

      float convex  = max( 0.0,  sx ) + max( 0.0,  sy );
      float concave = max( 0.0, -sx ) + max( 0.0, -sy );

      float edge = smoothstep( uSens * 0.32, uSens, convex );
      edge = max( edge, smoothstep( uConcave, uConcave * 3.4, concave ) * uConcaveAmount );

      /* Distance fade, so the far end of a long street dissolves into haze
       * instead of turning into a mat of black lines.  Held off in the lower
       * half of the frame: looking down a slope, that is the roofscape, and it
       * is the composition. */
      float below = smoothstep( 0.52, 0.16, vUv.y );
      float fadeStart = mix( uFadeStart, uFadeStart * 2.1, below );
      float fadeEnd   = mix( uFadeEnd,   uFadeEnd * 1.7,   below );
      edge *= 1.0 - smoothstep( fadeStart, fadeEnd, dc );
      edge *= uStrength;

      // ink keeps a whisper of the underlying hue so it never looks pasted on
      vec3 line = mix( uInk, col * 0.42, uInkMix );
      gl_FragColor = vec4( mix( col, line, clamp( edge, 0.0, 1.0 ) ), 1.0 );
    }
  `,
};

const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uShadowTint: { value: new THREE.Color(0xaba6ce) },
    uLightTint: { value: new THREE.Color(0xfff6e6) },
    uSaturation: { value: 1.10 },
    uLift: { value: 0.030 },
    uVignette: { value: 0.14 },
    uWarmth: { value: 0.045 },
    uPaper: { value: 0.0 },
  },
  vertexShader: INK_SHADER.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uShadowTint, uLightTint;
    uniform float uSaturation, uLift, uVignette, uWarmth, uPaper;
    varying vec2 vUv;

    vec3 linearToSRGB( vec3 c ) {
      return mix( c * 12.92, 1.055 * pow( max( c, vec3( 0.0031308 ) ), vec3( 1.0 / 2.4 ) ) - 0.055,
                  step( 0.0031308, c ) );
    }

    void main() {
      vec3 c = texture2D( tDiffuse, vUv ).rgb;
      float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );

      // split-tone: cool violet in the darks, warm paper white in the lights
      float k = smoothstep( 0.02, 0.55, l );
      c *= mix( uShadowTint, uLightTint, k );

      // overall warmth, like afternoon light coming through blossom
      c += vec3( uWarmth, uWarmth * 0.45, 0.0 ) * l * 0.35;

      // shadows stay readable -- never crushed to black
      c = c + uLift * ( 1.0 - k );

      c = mix( vec3( l ), c, uSaturation );

      /* A faint warm cast over the whole frame, which is what a painted
       * background on paper does and a render does not.  Off by default; the
       * sunset preset turns it up. */
      c = mix( c, c * vec3( 1.04, 0.99, 0.93 ) + vec3( 0.02, 0.014, 0.006 ), uPaper );

      float r = length( vUv - 0.5 ) * 1.42;
      c *= 1.0 - uVignette * pow( clamp( r, 0.0, 1.0 ), 2.6 );

      gl_FragColor = vec4( linearToSRGB( max( c, vec3( 0.0 ) ) ), 1.0 );
    }
  `,
};

const FXAA_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2() },
  },
  vertexShader: INK_SHADER.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    varying vec2 vUv;

    float luma( vec3 c ) { return dot( c, vec3( 0.299, 0.587, 0.114 ) ); }

    void main() {
      vec3 cM = texture2D( tDiffuse, vUv ).rgb;
      vec3 cNW = texture2D( tDiffuse, vUv + vec2( -uTexel.x, -uTexel.y ) ).rgb;
      vec3 cNE = texture2D( tDiffuse, vUv + vec2(  uTexel.x, -uTexel.y ) ).rgb;
      vec3 cSW = texture2D( tDiffuse, vUv + vec2( -uTexel.x,  uTexel.y ) ).rgb;
      vec3 cSE = texture2D( tDiffuse, vUv + vec2(  uTexel.x,  uTexel.y ) ).rgb;

      float lM = luma( cM ), lNW = luma( cNW ), lNE = luma( cNE ),
            lSW = luma( cSW ), lSE = luma( cSE );
      float lMin = min( lM, min( min( lNW, lNE ), min( lSW, lSE ) ) );
      float lMax = max( lM, max( max( lNW, lNE ), max( lSW, lSE ) ) );

      vec2 dir = vec2(
        -( ( lNW + lNE ) - ( lSW + lSE ) ),
         ( ( lNW + lSW ) - ( lNE + lSE ) )
      );
      float reduce = max( ( lNW + lNE + lSW + lSE ) * 0.25 * 0.18, 1.0 / 128.0 );
      float rcp = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + reduce );
      dir = clamp( dir * rcp, vec2( -8.0 ), vec2( 8.0 ) ) * uTexel;

      vec3 rgbA = 0.5 * (
        texture2D( tDiffuse, vUv + dir * ( 1.0 / 3.0 - 0.5 ) ).rgb +
        texture2D( tDiffuse, vUv + dir * ( 2.0 / 3.0 - 0.5 ) ).rgb );
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D( tDiffuse, vUv - dir * 0.5 ).rgb +
        texture2D( tDiffuse, vUv + dir * 0.5 ).rgb );

      float lB = luma( rgbB );
      gl_FragColor = vec4( ( lB < lMin || lB > lMax ) ? rgbA : rgbB, 1.0 );
    }
  `,
};

function makeQuad(def) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(def.uniforms),
    vertexShader: def.vertexShader,
    fragmentShader: def.fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  return { quad: new FullScreenQuad(mat), mat };
}

/** Grade presets, one per time of day.  See `systems/time.js`. */
export const GRADE = {
  day: {
    shadow: 0xaba6ce, light: 0xfff6e6, saturation: 1.10,
    lift: 0.030, vignette: 0.14, warmth: 0.045, paper: 0.0,
  },
  morning: {
    shadow: 0xa8aed2, light: 0xfff2e0, saturation: 1.06,
    lift: 0.038, vignette: 0.12, warmth: 0.030, paper: 0.10,
  },
  sunset: {
    shadow: 0x9c8cb8, light: 0xffe3bc, saturation: 1.18,
    lift: 0.026, vignette: 0.20, warmth: 0.090, paper: 0.34,
  },
  dusk: {
    shadow: 0x7e7aae, light: 0xf0d8c0, saturation: 1.12,
    lift: 0.048, vignette: 0.24, warmth: 0.055, paper: 0.22,
  },
};

export class Pipeline {
  constructor(renderer, scene, camera, { pixelBudget = 4.6e6 } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.pixelBudget = pixelBudget;
    this.size = new THREE.Vector2(1, 1);

    const opts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace,
    };
    this.rtScene = new THREE.WebGLRenderTarget(2, 2, opts);
    this.rtScene.depthTexture = new THREE.DepthTexture(2, 2);
    this.rtScene.depthTexture.format = THREE.DepthFormat;
    this.rtScene.depthTexture.type = THREE.UnsignedIntType;
    this.rtScene.depthTexture.minFilter = THREE.NearestFilter;
    this.rtScene.depthTexture.magFilter = THREE.NearestFilter;

    this.rtA = new THREE.WebGLRenderTarget(2, 2, { ...opts, depthBuffer: false });
    this.rtB = new THREE.WebGLRenderTarget(2, 2, {
      ...opts, type: THREE.UnsignedByteType, depthBuffer: false,
    });

    this.ink = makeQuad(INK_SHADER);
    this.grade = makeQuad(GRADE_SHADER);
    this.fxaa = makeQuad(FXAA_SHADER);

    this.ink.mat.uniforms.tDepth.value = this.rtScene.depthTexture;
    this.enabled = { ink: true, grade: true, fxaa: true };
    this.setGrade('day');
  }

  setGrade(name) {
    const g = typeof name === 'string' ? GRADE[name] || GRADE.day : name;
    const u = this.grade.mat.uniforms;
    u.uShadowTint.value.set(g.shadow);
    u.uLightTint.value.set(g.light);
    u.uSaturation.value = g.saturation;
    u.uLift.value = g.lift;
    u.uVignette.value = g.vignette;
    u.uWarmth.value = g.warmth;
    u.uPaper.value = g.paper;
    this.gradeName = typeof name === 'string' ? name : 'custom';
  }

  /** Resolution scale: supersample a little on low-DPI screens for clean ink. */
  setSize(w, h) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    let scale = this.forceScale || (dpr < 1.5 ? 1.5 : Math.min(dpr, 2));
    if (w * h * scale * scale > this.pixelBudget) {
      scale = Math.max(1, Math.sqrt(this.pixelBudget / (w * h)));
    }
    this.scale = scale;
    const rw = Math.max(2, Math.floor(w * scale));
    const rh = Math.max(2, Math.floor(h * scale));
    this.size.set(rw, rh);

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, true);

    this.rtScene.setSize(rw, rh);
    this.rtA.setSize(rw, rh);
    this.rtB.setSize(rw, rh);

    const texel = new THREE.Vector2(1 / rw, 1 / rh);
    this.ink.mat.uniforms.uTexel.value.copy(texel);
    this.fxaa.mat.uniforms.uTexel.value.copy(texel);
    this.ink.mat.uniforms.uNear.value = this.camera.near;
    this.ink.mat.uniforms.uFar.value = this.camera.far;
    // scale ink weight with resolution so lines stay ~2 device px
    this.ink.mat.uniforms.uThickness.value = 1.05 + 0.55 * scale;
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(this.scene, this.camera);

    /* Snapshot the scene's own cost before the post passes overwrite it.
     * `renderer.info.render` is reset at the start of every `render()` call, so
     * reading it after the pipeline has finished reports the last full-screen
     * quad -- one draw call and two triangles -- which is a very convincing and
     * completely useless number.  The QA harness reads `sceneInfo`. */
    this.sceneInfo = {
      calls: r.info.render.calls,
      triangles: r.info.render.triangles,
      lines: r.info.render.lines,
      points: r.info.render.points,
    };

    let src = this.rtScene.texture;

    if (this.enabled.ink) {
      this.ink.mat.uniforms.tDiffuse.value = src;
      r.setRenderTarget(this.rtA);
      this.ink.quad.render(r);
      src = this.rtA.texture;
    }

    const last = this.enabled.fxaa ? this.rtB : null;
    this.grade.mat.uniforms.tDiffuse.value = src;
    r.setRenderTarget(last);
    this.grade.quad.render(r);

    if (this.enabled.fxaa) {
      this.fxaa.mat.uniforms.tDiffuse.value = this.rtB.texture;
      r.setRenderTarget(null);
      this.fxaa.quad.render(r);
    }
    r.setRenderTarget(null);
  }

  dispose() {
    [this.rtScene, this.rtA, this.rtB].forEach((rt) => rt.dispose());
    [this.ink, this.grade, this.fxaa].forEach((p) => {
      p.quad.dispose();
      p.mat.dispose();
    });
  }
}
