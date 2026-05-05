// main.js
// ─────────────────────────────────────────────────────────────
// App entry point — wires scene, car, nodes, UI.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene, camera, renderer } from "./scene.js";
import { carPosition, updateCar, initCar, driveTo } from "./car.js";
import { buildNodes, getNearestNode, pulseNode, updateRipples, nodePositions } from "./nodes.js";
import { showPanel, hidePanel, updateHUD } from "./ui.js";

// ── Build world ───────────────────────────────────────────────
buildNodes();

// ── State ─────────────────────────────────────────────────────
let currentNodeIndex = 0;
if (nodePositions.length > 0) {
  initCar(nodePositions[currentNodeIndex]);
}

// ── Input & Navigation ────────────────────────────────────────
function goToNode(direction) {
  if (nodePositions.length === 0) return;
  // Calculate new index with wrap-around
  currentNodeIndex = (currentNodeIndex + direction + nodePositions.length) % nodePositions.length;
  driveTo(nodePositions[currentNodeIndex]);
}

// Keyboard (discrete presses)
window.addEventListener("keydown", (e) => {
  if (e.repeat) return; // Prevent continuous firing if key held
  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    goToNode(-1);
  } else if (e.code === "ArrowRight" || e.code === "KeyD") {
    goToNode(1);
  }
});

// Mobile / Mouse tap on left/right screen halves
window.addEventListener("pointerdown", (e) => {
  // Ignore clicks inside the panel or UI
  if (e.target.closest('#panel') || e.target.closest('#controls')) return;
  
  if (e.clientX < window.innerWidth / 2) {
    goToNode(-1);
  } else {
    goToNode(1);
  }
});

// ── Camera follow state ───────────────────────────────────────
// Camera lerps toward a target offset above the car
const CAM_OFFSET   = new THREE.Vector3(0, 14, 10);
const CAM_LERP     = 0.06;   // lower = smoother / more cinematic lag
const _camTarget   = new THREE.Vector3();
const _lerpPos     = new THREE.Vector3().copy(camera.position);
const _lookTarget  = new THREE.Vector3();
const _lerpLook    = new THREE.Vector3();

// ── Clock ─────────────────────────────────────────────────────
const clock = new THREE.Clock();

// ── Nearest node tracking ─────────────────────────────────────
let lastNearest = -1;

// ── Loop ─────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);

  const delta = Math.min(clock.getDelta(), 0.05);   // cap delta at 50 ms

  // 1. Move car
  updateCar(delta);

  // 2. Ripple animations
  updateRipples(delta);

  // 3. Nearest node check
  const nearest = getNearestNode(carPosition);

  if (nearest !== lastNearest) {
    lastNearest = nearest;
    if (nearest >= 0) {
      pulseNode(nearest);
      showPanel(nearest);
    } else {
      hidePanel();
    }
  }

  // 4. HUD
  updateHUD(carPosition);

  // 5. Camera soft-follow
  _camTarget.set(
    carPosition.x + CAM_OFFSET.x,
    CAM_OFFSET.y,
    carPosition.z + CAM_OFFSET.z
  );
  _lerpPos.lerp(_camTarget, CAM_LERP);
  camera.position.copy(_lerpPos);

  // Camera always looks slightly ahead of the car, not dead center
  _lookTarget.set(carPosition.x, 0, carPosition.z);
  _lerpLook.lerp(_lookTarget, CAM_LERP * 1.5);
  camera.lookAt(_lerpLook);

  // 6. Render
  renderer.render(scene, camera);
}

loop();
