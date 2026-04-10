// car.js
// ─────────────────────────────────────────────────────────────
// Car mesh (chassis + cabin + 4 wheels) + physics update.
// Internal state: position, velocity, heading.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene } from "./scene.js";

// ── Tuning constants ─────────────────────────────────────────
const ACCEL = 20.0;   // units/s²
const MAX_SPEED = 20.0;   // units/s
const FRICTION = 0.88;  // velocity multiplier per frame (damping)
const STEER_RATE = 8;   // rad/s at full speed
const WORLD_BOUND = 13.5;  // ±world boundary (car turns back at edge)

// ── State ─────────────────────────────────────────────────────
let velocity = 0;          // signed scalar (forward+)
let heading = 0;          // radians (Y-axis rotation)
const carPosition = new THREE.Vector3(0, 0, 0);

// ── Mesh construction ─────────────────────────────────────────
const carGroup = new THREE.Group();

// Chassis
const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.7 });
const chassisGeo = new THREE.BoxGeometry(0.52, 0.16, 0.96);
const chassis = new THREE.Mesh(chassisGeo, chassisMat);
chassis.position.y = 0.12;
chassis.castShadow = true;
chassis.receiveShadow = true;
carGroup.add(chassis);

// Cabin
const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0d0d22, roughness: 0.3, metalness: 0.8 });
const cabinGeo = new THREE.BoxGeometry(0.40, 0.14, 0.46);
const cabin = new THREE.Mesh(cabinGeo, cabinMat);
cabin.position.set(0, 0.27, -0.05);
cabin.castShadow = true;
carGroup.add(cabin);

// Windscreen accent (thin amber strip)
const windMat = new THREE.MeshStandardMaterial({ color: 0xf5a623, emissive: 0xf5a623, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.9 });
const windGeo = new THREE.BoxGeometry(0.38, 0.03, 0.03);
const wind = new THREE.Mesh(windGeo, windMat);
wind.position.set(0, 0.28, 0.19);
carGroup.add(wind);

// Headlights — two small amber emissive boxes
const hlMat = new THREE.MeshStandardMaterial({ color: 0xffe080, emissive: 0xffe080, emissiveIntensity: 2.2, roughness: 0.1, metalness: 0.5 });
[[-0.15, 0], [0.15, 0]].forEach(([ox]) => {
  const geo = new THREE.BoxGeometry(0.07, 0.04, 0.03);
  const m = new THREE.Mesh(geo, hlMat);
  m.position.set(ox, 0.12, 0.49);
  carGroup.add(m);
});

// Tail lights — red emissive
const tlMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 1.5, roughness: 0.1 });
[[-0.15, 0], [0.15, 0]].forEach(([ox]) => {
  const geo = new THREE.BoxGeometry(0.07, 0.04, 0.03);
  const m = new THREE.Mesh(geo, tlMat);
  m.position.set(ox, 0.12, -0.49);
  carGroup.add(m);
});

// Wheels — 4 cylinders
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.4 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.4, metalness: 0.9 });

function makeWheel(x, z) {
  const g = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14);
  const tire = new THREE.Mesh(tireGeo, wheelMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rimGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.075, 8);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  g.position.set(x, 0.1, z);
  return g;
}

const wheels = [
  makeWheel(-0.3, 0.33),
  makeWheel(0.3, 0.33),
  makeWheel(-0.3, -0.33),
  makeWheel(0.3, -0.33),
];
wheels.forEach((w) => carGroup.add(w));

// Headlight point light (follows car)
const headlightLight = new THREE.PointLight(0xffe08060, 1.4, 4.0);
headlightLight.position.set(0, 0.3, 0.6);
carGroup.add(headlightLight);

scene.add(carGroup);

// ── Update (called each frame) ────────────────────────────────
const _moveDir = new THREE.Vector3();

function updateCar(keys, delta) {
  // ── Steering ─────────────────────────────────────────────
  // Scale steer by speed — no spinning in place
  const speedFactor = Math.abs(velocity) / MAX_SPEED;
  const steerAmount = STEER_RATE * speedFactor * delta;

  if (keys["ArrowLeft"] || keys["KeyA"]) heading += steerAmount;
  if (keys["ArrowRight"] || keys["KeyD"]) heading -= steerAmount;

  // ── Acceleration ─────────────────────────────────────────
  if (keys["ArrowUp"] || keys["KeyW"]) velocity += ACCEL * delta;
  if (keys["ArrowDown"] || keys["KeyS"]) velocity -= ACCEL * delta;

  // ── Friction / coast ─────────────────────────────────────
  velocity *= Math.pow(FRICTION, delta * 60);   // framerate-independent

  // Clamp speed
  velocity = Math.max(-MAX_SPEED * 0.5, Math.min(MAX_SPEED, velocity));

  // ── Move ─────────────────────────────────────────────────
  _moveDir.set(Math.sin(heading), 0, Math.cos(heading));
  const move = velocity * delta;
  const nx = carPosition.x + _moveDir.x * move;
  const nz = carPosition.z + _moveDir.z * move;

  // World boundary clamping — gentle bounce
  carPosition.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, nx));
  carPosition.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, nz));

  // ── Wheel spin (visual) ───────────────────────────────────
  const spinAngle = velocity * delta * 5;
  wheels.forEach((w) => {
    w.children[0].rotation.x += spinAngle;
  });

  // ── Apply to group ────────────────────────────────────────
  carGroup.position.set(carPosition.x, 0, carPosition.z);
  carGroup.rotation.y = heading;
}

export { carGroup, carPosition, updateCar };
