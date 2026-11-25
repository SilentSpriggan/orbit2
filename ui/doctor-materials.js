import * as THREE from 'three';

// Keep the source UVs, skinning and expression shapes. Surface response is
// independent from identity, so both doctors share the same lighting model.
export const AVATAR_QUALITY = {
  balanced: { pixelRatio: 1.5, shadowSize: 512, idleFPS: 24, activeFPS: 45 },
  high: { pixelRatio: 2, shadowSize: 1024, idleFPS: 30, activeFPS: 60 }
};

function clothingMask(mesh) {
  const position = mesh.geometry.attributes.position;
  const values = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i), x = Math.abs(position.getX(i));
    const neckline = .105 - 1.45 * Math.max(0, .08 - x);
    values[i] = THREE.MathUtils.smoothstep(neckline - y, 0, .008);
  }
  mesh.geometry.setAttribute('orbitClothing', new THREE.BufferAttribute(values, 1));
}

function physicalFrom(source, options) {
  const material = new THREE.MeshPhysicalMaterial({
    color: source.color, map: source.map, normalMap: source.normalMap,
    normalScale: source.normalScale?.clone(), side: source.side,
    transparent: source.transparent, opacity: source.opacity,
    alphaTest: source.alphaTest, depthWrite: source.depthWrite,
    metalness: 0, roughness: .48, ...options
  });
  material.name = `ORBIT studio / ${options.name || 'skin and fabric'}`;
  return material;
}

export async function createDoctorMaterials(renderer) {
  let poreMap = null;
  if (!renderer.isSoftwareRenderer) {
    try {
      poreMap = await new THREE.TextureLoader().loadAsync(new URL('./assets/avatar/skin-microdetail.png', import.meta.url).href);
      poreMap.wrapS = poreMap.wrapT = THREE.RepeatWrapping;
      // This image is sampled as height/roughness data, never as skin colour.
      poreMap.colorSpace = THREE.NoColorSpace;
      poreMap.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    } catch { /* Original normal maps still provide a complete avatar. */ }
  }
  const originals = new Set();
  function apply(mesh, persona) {
    const source = mesh.material;
    if (!source || Array.isArray(source)) return;
    originals.add(source);
    const part = mesh.userData.partName || mesh.name;
    const isEye = /^h_[LR]_eye$/i.test(part);
    const isGland = /gland/i.test(part);
    const isTeeth = /teeth/i.test(part);
    const isHair = /wig/i.test(part);
    const material = physicalFrom(source, isEye || isGland ? {
      name: isEye ? 'cornea' : 'tear line', normalMap: null,
      roughness: isEye ? .16 : .23, clearcoat: .85,
      clearcoatRoughness: .06, ior: 1.38, specularIntensity: .72
    } : isTeeth ? {
      name: 'enamel', roughness: .31, clearcoat: .14, ior: 1.46, specularIntensity: .35
    } : isHair ? {
      name: 'hair', roughness: .66, sheen: .24,
      sheenRoughness: .55, sheenColor: new THREE.Color(0x6b4c35), specularIntensity: .32
    } : {
      name: 'skin and woven scrubs', roughness: .49, ior: 1.4,
      specularIntensity: .4, clearcoat: .025, clearcoatRoughness: .48,
      sheen: .08, sheenColor: new THREE.Color(0xb09b89), sheenRoughness: .8
    });
    if (material.normalMap) material.normalScale.set(.68, .68);
    if (material.map) material.map.anisotropy = renderer.isSoftwareRenderer ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    material.envMapIntensity = isEye ? .85 : .4;
    mesh.material = material;
    mesh.castShadow = !isEye && !isGland;
    mesh.receiveShadow = !isEye && !isGland;
    if (isEye || isGland || isTeeth || isHair) return;

    clothingMask(mesh);
    material.userData.orbitPink = persona === 'female'; // Also used by the CPU fallback.
    material.userData.orbitSurface = 'skin-fabric';
    material.onBeforeCompile = shader => {
      shader.uniforms.orbitPores = { value: poreMap };
      shader.vertexShader = 'attribute float orbitClothing; varying float vOrbitClothing; varying vec2 vOrbitUV;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOrbitClothing = orbitClothing; vOrbitUV = uv;');
      shader.fragmentShader = `
        varying float vOrbitClothing;
        varying vec2 vOrbitUV;
        uniform sampler2D orbitPores;
        vec3 orbitRelief(vec3 eyePosition, vec3 surfaceNormal, float height) {
          vec3 sx = dFdx(eyePosition), sy = dFdy(eyePosition);
          vec3 rx = cross(sy, surfaceNormal), ry = cross(surfaceNormal, sx);
          float det = dot(sx, rx);
          vec3 gradient = sign(det) * (dFdx(height) * rx + dFdy(height) * ry);
          return normalize(abs(det) * surfaceNormal - gradient);
        }
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        float orbitCloth = clamp(vOrbitClothing, 0.0, 1.0);
        // The source scrubs are blue and skin is warm: keep skin (arms, hands, V-neck) out of the fabric tint.
        orbitCloth *= 1.0 - smoothstep(1.25, 1.7, diffuseColor.r / max(diffuseColor.b, .01));
        // Atlas hair is darker than exposed skin. Avoid giving it skin gloss.
        float orbitSkin = (1.0 - orbitCloth) * smoothstep(.09, .25, diffuseColor.r);
        ${persona === 'female' ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.34,.115,.17) * clamp(length(diffuseColor.rgb)*2.0,.65,1.0), orbitCloth);' : 'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.76,.86,.93), orbitCloth);'}
        float orbitPore = ${poreMap ? 'dot(texture2D(orbitPores, vOrbitUV * 5.0).rgb, vec3(.299,.587,.114))' : '.5'};
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        roughnessFactor = mix(.69, .47 + (orbitPore - .6) * .18, orbitSkin);
        roughnessFactor = mix(roughnessFactor, .88, orbitCloth);
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        // Derivative-filtered weave avoids moiré when the portrait is small.
        vec2 weaveUV = vOrbitUV * 1100.0;
        float weaveFade = 1.0 - smoothstep(.35, 1.5, max(fwidth(weaveUV.x), fwidth(weaveUV.y)));
        float weave = sin(weaveUV.x * 6.283185) * sin(weaveUV.y * 6.283185) * weaveFade;
        float relief = (orbitPore - .6) * .000085 * orbitSkin + weave * .000012 * orbitCloth;
        normal = orbitRelief(-vViewPosition, normal, relief);
      `);
      // A restrained warm edge approximates soft skin scattering. This is not
      // a multilayer subsurface solver and adds no backlight to fabric or hair.
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float skinEdge = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
        outgoingLight += diffuseColor.rgb * vec3(.14,.045,.025) * skinEdge * orbitSkin;
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey = () => `orbit-studio-v2-${persona}-${Boolean(poreMap)}`;
  }
  return { apply, hasDetail: Boolean(poreMap), dispose() { poreMap?.dispose(); for (const m of originals) m.dispose(); } };
}

export function createDoctorStudio(scene, renderer) {
  const disposable = [];
  const hemisphere = new THREE.HemisphereLight(0xdce6ef, 0x776558, .72);
  const key = new THREE.DirectionalLight(0xffede0, 2.55);
  key.position.set(-.48, .65, .85);
  key.target.position.set(0, .15, 0);
  const fill = new THREE.DirectionalLight(0xdbe8ff, .75);
  fill.position.set(.7, .28, .55);
  const rim = new THREE.DirectionalLight(0xe8f2ff, 1.65);
  rim.position.set(.36, .55, -.5);
  scene.add(hemisphere, key, key.target, fill, rim);
  if (!renderer.isSoftwareRenderer) {
    key.castShadow = true;
    Object.assign(key.shadow.camera, { left: -.38, right: .38, top: .42, bottom: -.32, near: .1, far: 2.2 });
    key.shadow.bias = -.00025;
    key.shadow.normalBias = .0005;
    key.shadow.radius = 3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Local studio softboxes provide broad, coherent eye and metal reflections.
    // A generated radiance environment means no HDR download or extra service.
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x7b858d);
    const box = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial({ color: 0x4e5963, side: THREE.BackSide }));
    envScene.add(box);
    for (const [x, y, z, width, height, intensity] of [[-1.7,1.1,1.5,1.2,2.4,5], [1.8,.5,1.2,.9,1.8,2], [0,2,-1,2,1,3]]) {
      const light = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide }));
      light.position.set(x,y,z); light.lookAt(0,0,0); envScene.add(light);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(envScene, .04, .1, 10);
    scene.environment = environment.texture;
    disposable.push(environment);
    pmrem.dispose();
    envScene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });

    // Keep illumination and reflections while leaving the avatar's stage clear.
    scene.background = null;
  }
  return {
    setQuality(value) {
      if (renderer.isSoftwareRenderer) return;
      const q = AVATAR_QUALITY[value] || AVATAR_QUALITY.balanced;
      key.shadow.mapSize.set(q.shadowSize, q.shadowSize);
      key.shadow.map?.dispose(); key.shadow.map = null;
    },
    dispose() { key.shadow.map?.dispose(); disposable.forEach(o => o.dispose()); }
  };
}
