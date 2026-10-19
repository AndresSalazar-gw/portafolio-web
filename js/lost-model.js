/* Modelo 3D de Lost files: assets/models/chicken-jockey.obj (hecho en Blender).
   three.js 0.160.0 por importmap (solo en lost-files.html).
   El .mtl no existe: los colores se asignan por nombre de objeto. Sin WebGL, la figura queda oculta. */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const figure = document.querySelector('[data-model]');
const canvas = figure && figure.querySelector('canvas');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const MODEL_URL = 'assets/models/chicken-jockey.obj';
const COLORS = {
  'Cuerpo': 0xf2f0ec, 'cabeza': 0xf2f0ec,                          // blanco
  'hocico': 0xf5b82e, 'pata_der.': 0xf5b82e, 'pata_izq.': 0xf5b82e, // amarillo
  'cosita': 0xd63a2f,                                               // rojo
  'cabezota': 0x5a9e4b, 'mano_izq.': 0x5a9e4b, 'mano_der.': 0x5a9e4b, // verde
  'cuerpo': 0x3fb6c9,                                               // celeste
  'pierna_dar.': 0x2b3f8f, 'pierna_izq.': 0x2b3f8f,                 // azul
};
const FALLBACK_COLOR = 0xf2f0ec;

if (figure && canvas) {
  init().catch((err) => {
    figure.classList.add('is-failed');
    console.warn('[lost-model] no se pudo mostrar el modelo:', err);
  });
}

async function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    figure.classList.add('is-failed'); // sin WebGL: se oculta y libera su espacio
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // sombra blanda

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3355ff, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 14;
  sun.shadow.blurSamples = 20;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
  scene.add(sun);

  /* ---------- Modelo ---------- */
  const obj = await new OBJLoader().loadAsync(MODEL_URL);
  obj.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshStandardMaterial({
      color: COLORS[child.name] ?? FALLBACK_COLOR,
      flatShading: true, // estilo Minecraft
      roughness: 0.85,
      metalness: 0,
    });
    child.castShadow = true;
  });

  // Centrar y escalar con el bounding box: el lado más largo mide 2.4 y queda apoyado en y = 0
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2.4 / Math.max(size.x, size.y, size.z);
  obj.scale.setScalar(scale);
  obj.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  const height = size.y * scale;

  const floater = new THREE.Group(); // flotación
  floater.add(obj);
  scene.add(floater);

  // Piso invisible que solo recibe la sombra (se ve sobre el azul de la página)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.ShadowMaterial({ color: 0x00104f, opacity: 0.4 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- Cámara + arrastrar para rotar ---------- */
  const target = new THREE.Vector3(0, height * 0.5, 0);
  camera.position.set(3.4, height * 0.5 + 1.5, 5.2);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.9;
  controls.maxPolarAngle = 1.45;
  controls.autoRotate = !reduce;   // gira lento solo
  controls.autoRotateSpeed = 1.1;
  controls.update();

  figure.classList.remove('is-failed');
  figure.classList.add('is-ready');

  /* ---------- Tamaño ---------- */
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ---------- Loop en el ticker central de GSAP (pausa fuera de pantalla) ---------- */
  const clock = new THREE.Clock();
  const tick = () => {
    const t = clock.getElapsedTime();
    if (!reduce) floater.position.y = 0.12 + Math.sin(t * 1.2) * 0.08; // flota suave
    controls.update();
    renderer.render(scene, camera);
  };
  if (reduce) floater.position.y = 0.12;
  // Un solo requestAnimationFrame en todo el sitio: si GSAP está, el modelo se dibuja en su ticker
  const start = () => (window.gsap ? gsap.ticker.add(tick) : renderer.setAnimationLoop(tick));
  const stop = () => (window.gsap ? gsap.ticker.remove(tick) : renderer.setAnimationLoop(null));
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(canvas);
}
