// main.js
// ─────────────────────────────────────────────────────────────
// App entry point — wires scene, car, nodes, UI.
// ─────────────────────────────────────────────────────────────

import * as THREE from "https://unpkg.com/three@0.128.0/build/three.module.js";
import { scene, camera, renderer } from "./scene.js";
import { carPosition, updateCar, joyInput } from "./car.js";
import { buildNodes, getNearestNode, pulseNode, updateRipples } from "./nodes.js";
import { showPanel, hidePanel, updateHUD } from "./ui.js";

// ── Build world ───────────────────────────────────────────────
buildNodes();

// ── Input ─────────────────────────────────────────────────────
const keys = {};

window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup",   (e) => { keys[e.code] = false; });

// ── Analog joystick (touch) ────────────────────────────────────
// A circular base + draggable knob replaces the old 4-button D-pad.
// The normalised knob offset maps to the same Arrow key flags that
// car.js already reads — no physics changes required.
;(function () {
  const base = document.getElementById("joy-base");
  const knob = document.getElementById("joy-knob");
  if (!base || !knob) return;

  const RADIUS   = 39;    // max px knob can travel from centre (base r=65, knob r=26)
  const DEADZONE = 0.22;  // normalised threshold before input registers

  let active  = false;
  let originX = 0;
  let originY = 0;

  function applyKnob(nx, ny) {
    // nx, ny normalised [-1, 1]
    const px = nx * RADIUS;
    const py = ny * RADIUS;
    // knob is centred via translate(-50%,-50%); additional offset stacked on top
    knob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;

    const mag = Math.hypot(nx, ny);

    // Send high-res vector data to car.js instead of discrete Arrow keys
    joyInput.nx = nx;
    joyInput.ny = ny;
    joyInput.mag = mag;
    joyInput.active = true;

    // Glow base ring when actively steering
    base.classList.toggle("moving", mag > DEADZONE);
  }

  function onStart(e) {
    e.preventDefault();
    active = true;
    knob.classList.add("active");
    const pt = e.touches ? e.touches[0] : e;
    const r  = base.getBoundingClientRect();
    originX  = r.left + r.width  / 2;
    originY  = r.top  + r.height / 2;
    onMove(e);
  }

  function onMove(e) {
    if (!active) return;
    e.preventDefault();
    const pt  = e.touches ? e.touches[0] : e;
    const dx  = pt.clientX - originX;
    const dy  = pt.clientY - originY;
    const len = Math.hypot(dx, dy);
    // Clamp within radius
    const scale = len > RADIUS ? RADIUS / len : 1;
    applyKnob((dx * scale) / RADIUS, (dy * scale) / RADIUS);
  }

  function onEnd(e) {
    if (!active) return;
    e.preventDefault();
    active = false;
    knob.classList.remove("active");
    // Spring-reset — CSS transition on #joy-knob animates this
    knob.style.transform = "translate(-50%, -50%)";
    
    // Clear analog input
    joyInput.active = false;
    joyInput.nx = 0;
    joyInput.ny = 0;
    joyInput.mag = 0;
    
    base.classList.remove("moving");
  }

  // Touch — primary mobile path
  base.addEventListener("touchstart",  onStart, { passive: false });
  base.addEventListener("touchmove",   onMove,  { passive: false });
  base.addEventListener("touchend",    onEnd,   { passive: false });
  base.addEventListener("touchcancel", onEnd,   { passive: false });

  // Mouse fallback (useful in DevTools mobile simulation)
  base.addEventListener("mousedown",    onStart);
  window.addEventListener("mousemove",  onMove);
  window.addEventListener("mouseup",    onEnd);
})();

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
