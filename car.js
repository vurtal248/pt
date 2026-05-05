// car.js
// ─────────────────────────────────────────────────────────────
// Car mesh (chassis + cabin + 4 wheels) + physics update.
// Internal state: position, velocity, heading.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene } from "./scene.js";

// ── Tuning constants ─────────────────────────────────────────
const MOVE_DURATION = 1.2;  // seconds to travel to next node
const TURN_SPEED = 12.0;    // rotation responsiveness

// ── State ─────────────────────────────────────────────────────
const carPosition = new THREE.Vector3(0, 0, 0);
let heading = 0;          // radians (Y-axis rotation)

// ── Pathing State ─────────────────────────────────────────────
const startPos = new THREE.Vector3();
const targetPos = new THREE.Vector3();
let isMoving = false;
let moveProgress = 0;

// Easing function
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

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

// ── API ───────────────────────────────────────────────────────

function initCar(pos) {
  carPosition.copy(pos);
  startPos.copy(pos);
  targetPos.copy(pos);
  heading = 0;
  
  carGroup.position.set(carPosition.x, 0, carPosition.z);
  carGroup.rotation.y = heading;
}

function driveTo(pos) {
  startPos.copy(carPosition); // ease from current position (handles mid-transit clicks)
  targetPos.copy(pos);
  moveProgress = 0;
  isMoving = true;
}

// ── Update (called each frame) ────────────────────────────────

function updateCar(delta) {
  if (isMoving) {
    moveProgress += delta / MOVE_DURATION;
    if (moveProgress >= 1) {
      moveProgress = 1;
      isMoving = false;
    }

    const t = easeInOutCubic(moveProgress);
    const oldX = carPosition.x;
    const oldZ = carPosition.z;

    carPosition.lerpVectors(startPos, targetPos, t);

    // Calculate heading based on displacement this frame
    const dx = carPosition.x - oldX;
    const dz = carPosition.z - oldZ;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.0001) {
      const targetHeading = Math.atan2(dx, dz);
      // Shortest-path heading lerp
      let diff = targetHeading - heading;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      heading += diff * Math.min(1, TURN_SPEED * delta);
    }

    // Wheel spin based on distance traveled
    const spinAngle = (dist / delta) * delta * 5;
    wheels.forEach((w) => {
      w.children[0].rotation.x += spinAngle;
    });
  }

  // ── Apply to group ────────────────────────────────────────
  carGroup.position.set(carPosition.x, 0, carPosition.z);
  carGroup.rotation.y = heading;
}

export { carGroup, carPosition, initCar, driveTo, updateCar };
