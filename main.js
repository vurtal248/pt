// main.js
// ─────────────────────────────────────────────────────────────
// App entry point — wires scene, car, nodes, UI.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene, camera, renderer } from "./scene.js";
import { carPosition, updateCar } from "./car.js";
import { buildNodes, getNearestNode, pulseNode, updateRipples } from "./nodes.js";
import { showPanel, hidePanel, updateHUD } from "./ui.js";

// ── Build world ───────────────────────────────────────────────
buildNodes();

// ── Input ─────────────────────────────────────────────────────
const keys = {};

window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup",   (e) => { keys[e.code] = false; });

// ── Virtual joystick (touch) ──────────────────────────────────
// Maps each button element to the key code it simulates.
// Using touchstart/touchend so holding the button registers as held.
const joyMap = {
  "jbtn-fwd":   "ArrowUp",
  "jbtn-rev":   "ArrowDown",
  "jbtn-left":  "ArrowLeft",
  "jbtn-right": "ArrowRight",
};

Object.entries(joyMap).forEach(([id, code]) => {
  const btn = document.getElementById(id);
  if (!btn) return;

  const press   = (e) => { e.preventDefault(); keys[code] = true;  btn.classList.add("pressed"); };
  const release = (e) => { e.preventDefault(); keys[code] = false; btn.classList.remove("pressed"); };

  // Touch events — primary mobile path
  btn.addEventListener("touchstart",  press,   { passive: false });
  btn.addEventListener("touchend",    release, { passive: false });
  btn.addEventListener("touchcancel", release, { passive: false });

  // Mouse fallback (useful in DevTools mobile simulation)
  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup",   release);
  btn.addEventListener("mouseleave", release);
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
  updateCar(keys, delta);

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
