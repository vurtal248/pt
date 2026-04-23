// scene.js
// ─────────────────────────────────────────────────────────────
// Renderer, camera, scene initialisation.
// Bird's-eye only — no orbit, no pan controls.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";

// ── Renderer ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x060606, 1);
document.getElementById("canvas-host").appendChild(renderer.domElement);

// ── Scene ────────────────────────────────────────────────────
const scene = new THREE.Scene();

// Fog — pure dark, desaturated
scene.fog = new THREE.FogExp2(0x060606, 0.055);

// ── Camera ───────────────────────────────────────────────────
// Fixed bird's-eye — tilted slightly for perspective but never rotated by user
const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);
camera.position.set(0, 14, 10);
camera.lookAt(0, 0, 0);

// ── Ground plane ─────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(60, 60);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x080808,
  roughness: 0.98,
  metalness: 0.02,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Grid helper ──────────────────────────────────────────────
// Two layers: coarse + fine for diorama-map feel
const gridCoarse = new THREE.GridHelper(60, 30, 0x282828, 0x282828);
gridCoarse.position.y = 0.002;
scene.add(gridCoarse);

const gridFine = new THREE.GridHelper(60, 120, 0x111111, 0x111111);
gridFine.position.y = 0.001;
scene.add(gridFine);

// ── Lights ───────────────────────────────────────────────────

// 1. Ambient — cool neutral, just enough to read dark surfaces
const ambientLight = new THREE.AmbientLight(0x888888, 0.5);
scene.add(ambientLight);

// 2. Key light — clean white from upper-right, casts shadows
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(12, 20, -8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 60;
keyLight.shadow.camera.left = -20;
keyLight.shadow.camera.right = 20;
keyLight.shadow.camera.top = 20;
keyLight.shadow.camera.bottom = -20;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// 3. Rim light — dim cool fill from opposite side
const rimLight = new THREE.DirectionalLight(0xcccccc, 0.5);
rimLight.position.set(-10, 8, 12);
scene.add(rimLight);

// ── Resize handler ───────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, renderer };
