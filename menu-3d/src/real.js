// Real-world material from photo scans (Poly Haven, CC0): a studio HDRI for lighting and reflections,
// a scanned bread-crust surface used as fine detail on every crust, and scanned models (the croissant).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let detail = null;
export function crustDetail(repeat = 3) {
  if (!detail) {
    detail = new THREE.TextureLoader().load('assets/3d/crust_nor.jpg');
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping; detail.colorSpace = THREE.NoColorSpace; detail.anisotropy = 8;
  }
  const t = detail.clone(); t.repeat.set(repeat, repeat); t.needsUpdate = true;   // clones share the image, each with its own tiling
  return t;
}

const gltfs = new Map();
export function loadModel(url) {
  if (!gltfs.has(url)) gltfs.set(url, new Promise((res, rej) => new GLTFLoader().load(url, (g) => res(g.scene), undefined, rej)));
  return gltfs.get(url);
}

export function studioHDR(renderer, scene, intensity = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load('assets/3d/studio.hdr', (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(t).texture;
    scene.environmentIntensity = intensity;
    t.dispose();
  }, undefined, () => {});
}
