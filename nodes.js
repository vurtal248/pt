// nodes.js
// ─────────────────────────────────────────────────────────────
// Builds node meshes, edge lines, and ripple rings.
// Tracks which node the car is nearest.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene } from "./scene.js";
import { projects } from "./projects.js";

// ── Constants ────────────────────────────────────────────────
const ARRIVAL_RADIUS = 1.8;    // how close car must be
const NODE_RADIUS    = 0.38;   // ring geometry radius
const DOT_RADIUS     = 0.12;

// Materials
const ringMat  = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8 });
const dotMat   = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6,  roughness: 0.2, metalness: 0.5 });
const edgeMat  = new THREE.LineBasicMaterial({ color: 0x303030, transparent: true, opacity: 0.60 });
const rippleMat= new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide });

// Internal state
let activeNodeIndex = -1;
const nodePositions = [];      // THREE.Vector3 world positions
const rippleRings   = [];      // one per node
const rippleStates  = [];      // { active, t }

// ── Build ─────────────────────────────────────────────────────
function buildNodes() {
  // Compute world positions
  projects.forEach((p) => {
    nodePositions.push(new THREE.Vector3(p.position[0], 0, p.position[1]));
  });

  // Node meshes
  projects.forEach((p, i) => {
    const pos = nodePositions[i];
    const group = new THREE.Group();
    group.position.copy(pos);

    // Outer ring (torus)
    const torusGeo = new THREE.TorusGeometry(NODE_RADIUS, 0.04, 8, 48);
    const torus = new THREE.Mesh(torusGeo, ringMat.clone());
    torus.rotation.x = Math.PI / 2;
    torus.castShadow = true;
    group.add(torus);

    // Centre dot
    const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 12, 8);
    const dot = new THREE.Mesh(dotGeo, dotMat.clone());
    dot.castShadow = true;
    group.add(dot);

    // Vertical accent column — thin dim cylinder pointing up
    const colGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.6, 6);
    const colMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.1, transparent: true, opacity: 0.35 });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.y = 0.3;
    group.add(col);

    scene.add(group);

    // Ripple ring (flat torus growing outward on arrival)
    const rippleGeo = new THREE.RingGeometry(0.0, 0.05, 48);
    const ripple = new THREE.Mesh(rippleGeo, rippleMat.clone());
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.copy(pos);
    ripple.position.y = 0.01;
    scene.add(ripple);
    rippleRings.push(ripple);
    rippleStates.push({ active: false, t: 0 });

    // Floating label sprite (canvas texture)
    _addLabel(group, p.title);
  });

  // Edge lines — connect adjacent nodes in order, plus close ring
  const points = nodePositions.map((v) => v.clone().setY(0.02));
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const geo = new THREE.BufferGeometry().setFromPoints([points[i], points[next]]);
    const line = new THREE.Line(geo, edgeMat.clone());
    scene.add(line);
  }

  return { nodePositions };
}

// ── Floating label ────────────────────────────────────────────
function _addLabel(parent, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 48);
  ctx.font = "bold 22px 'DM Mono', monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 24);

  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8 });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.2, 0.42, 1);
  sprite.position.set(0, 0.85, 0);
  parent.add(sprite);
}

// ── Nearest node ─────────────────────────────────────────────
function getNearestNode(carPos) {
  let closest = -1;
  let closestDist = Infinity;

  nodePositions.forEach((np, i) => {
    const dx = carPos.x - np.x;
    const dz = carPos.z - np.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }
  });

  return closestDist <= ARRIVAL_RADIUS ? closest : -1;
}

// ── Pulse / ripple animation ──────────────────────────────────
function pulseNode(index) {
  if (index < 0 || index >= rippleStates.length) return;
  rippleStates[index].active = true;
  rippleStates[index].t = 0;
}

// Called from main loop each frame
function updateRipples(delta) {
  rippleStates.forEach((state, i) => {
    if (!state.active) return;
    state.t += delta * 0.7;            // 0 → 1 in ~1.4 s

    const scale = 0.3 + state.t * ARRIVAL_RADIUS * 2.5;
    rippleRings[i].scale.set(scale, scale, 1);

    const opacity = Math.max(0, 0.55 * (1 - state.t));
    rippleRings[i].material.opacity = opacity;

    if (state.t >= 1) {
      state.active = false;
      state.t = 0;
      rippleRings[i].material.opacity = 0;
      rippleRings[i].scale.set(1, 1, 1);
    }
  });
}

export { buildNodes, getNearestNode, pulseNode, updateRipples, nodePositions };
