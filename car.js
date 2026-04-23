// car.js
// ─────────────────────────────────────────────────────────────
// Car mesh (chassis + cabin + 4 wheels) + physics update.
// Internal state: position, velocity, heading.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene } from "./scene.js";

// ── Tuning constants ─────────────────────────────────────────
const ACCEL = 80.0;   // units/s²
const MAX_SPEED = 80.0;   // units/s
const FRICTION = 0.88;  // velocity multiplier per frame (damping)
const STEER_RATE = 25;   // rad/s at full speed
const WORLD_BOUND = 13.5;  // ±world boundary (car turns back at edge)

// ── State ─────────────────────────────────────────────────────
let velocity = 0;          // signed scalar (forward+)
let heading = 0;          // radians (Y-axis rotation)
const carPosition = new THREE.Vector3(0, 0, 0);

// ── Joystick input (written by main.js) ───────────────────────
// When active = true, updateCar uses direct heading+magnitude mode
// instead of the Arrow-key arcade steering mode.
const joyInput = { active: false, nx: 0, ny: 0, mag: 0 };

// ── Mesh construction ─────────────────────────────────────────
const carGroup = new THREE.Group();

// Chassis — matte anthracite
const chassisMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6, metalness: 0.6 });
const chassisGeo = new THREE.BoxGeometry(0.52, 0.16, 0.96);
const chassis = new THREE.Mesh(chassisGeo, chassisMat);
chassis.position.y = 0.12;
chassis.castShadow = true;
chassis.receiveShadow = true;
carGroup.add(chassis);

// Cabin — near-black
const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.85 });
const cabinGeo = new THREE.BoxGeometry(0.40, 0.14, 0.46);
const cabin = new THREE.Mesh(cabinGeo, cabinMat);
cabin.position.set(0, 0.27, -0.05);
cabin.castShadow = true;
carGroup.add(cabin);

// Windscreen accent (thin white strip)
const windMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.9 });
const windGeo = new THREE.BoxGeometry(0.38, 0.03, 0.03);
const wind = new THREE.Mesh(windGeo, windMat);
wind.position.set(0, 0.28, 0.19);
carGroup.add(wind);

// Headlights — cool white emissive boxes
const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0, roughness: 0.1, metalness: 0.5 });
[[-0.15, 0], [0.15, 0]].forEach(([ox]) => {
  const geo = new THREE.BoxGeometry(0.07, 0.04, 0.03);
  const m = new THREE.Mesh(geo, hlMat);
  m.position.set(ox, 0.12, 0.49);
  carGroup.add(m);
});

// Tail lights — dark grey emissive
const tlMat = new THREE.MeshStandardMaterial({ color: 0x666666, emissive: 0x888888, emissiveIntensity: 0.8, roughness: 0.2 });
[[-0.15, 0], [0.15, 0]].forEach(([ox]) => {
  const geo = new THREE.BoxGeometry(0.07, 0.04, 0.03);
  const m = new THREE.Mesh(geo, tlMat);
  m.position.set(ox, 0.12, -0.49);
  carGroup.add(m);
});

// Wheels — 4 cylinders
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.85, metalness: 0.3 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.35, metalness: 0.95 });

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

// Headlight point light — neutral white (follows car)
const headlightLight = new THREE.PointLight(0xffffff, 0.9, 4.0);
headlightLight.position.set(0, 0.3, 0.6);
carGroup.add(headlightLight);

scene.add(carGroup);

// ── Update (called each frame) ────────────────────────────────
const _moveDir = new THREE.Vector3();

function updateCar(keys, delta) {
  if (joyInput.active && joyInput.mag > 0.08) {
    // ── Joystick: direct-direction mode ──────────────────────
    // Camera sits at carZ+10, so screen-up = world -Z = heading PI.
    // atan2(joyX, joyY) maps joystick screen coords to world heading:
    //   stick up  (joyY=-1) → atan2(0,-1) = PI  = -Z ✓
    //   stick right(joyX=1) → atan2(1, 0) = PI/2 = +X ✓
    const targetHeading = Math.atan2(joyInput.nx, joyInput.ny);

    // Shortest-path heading lerp — snappy but not jarring
    let diff = targetHeading - heading;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    heading += diff * Math.min(1, 10 * delta);

    // Speed proportional to stick displacement
    velocity += ACCEL * joyInput.mag * delta;

  } else if (!joyInput.active) {
    // ── Keyboard: original tank-turn arcade steering ─────────
    const speedFactor = Math.abs(velocity) / MAX_SPEED;
    const steerAmount = STEER_RATE * speedFactor * delta;

    if (keys["ArrowLeft"] || keys["KeyA"]) heading += steerAmount;
    if (keys["ArrowRight"] || keys["KeyD"]) heading -= steerAmount;

    if (keys["ArrowUp"] || keys["KeyW"]) velocity += ACCEL * delta;
    if (keys["ArrowDown"] || keys["KeyS"]) velocity -= ACCEL * delta;
  }

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

export { carGroup, carPosition, updateCar, joyInput };
