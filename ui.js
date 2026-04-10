// ui.js
// ─────────────────────────────────────────────────────────────
// Project panel DOM management + HUD.
// ─────────────────────────────────────────────────────────────

import { projects } from "./projects.js";

// ── DOM refs ─────────────────────────────────────────────────
const panel        = document.getElementById("panel");
const panelTitle   = document.getElementById("panel-title");
const panelTag     = document.getElementById("panel-tag");
const panelDesc    = document.getElementById("panel-desc");
const panelImg     = document.getElementById("panel-img");
const hudX         = document.getElementById("hud-x");
const hudZ         = document.getElementById("hud-z");
const hudNode      = document.getElementById("hud-node");

// ── State ─────────────────────────────────────────────────────
let _activeIndex   = -1;
let _debounceTimer = null;

// ── Panel show / hide ─────────────────────────────────────────
export function showPanel(index) {
  if (index === _activeIndex) return;

  // Debounce — rapid node skimming won't flash
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _activeIndex = index;
    _populate(index);
    panel.classList.add("visible");
    panel.classList.remove("hiding");
  }, 120);
}

export function hidePanel() {
  if (_activeIndex === -1) return;
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _activeIndex = -1;
    panel.classList.remove("visible");
    panel.classList.add("hiding");
    hudNode.textContent = "—";
  }, 120);
}

function _populate(index) {
  const p = projects[index];
  panelTitle.textContent = p.title;
  panelTag.textContent   = p.tag;
  panelDesc.textContent  = p.desc;
  hudNode.textContent    = `#${String(index).padStart(2, "0")} ${p.title}`;

  // Image — conditional, fade-in on load
  if (p.image) {
    panelImg.style.opacity = "0";
    panelImg.style.display = "block";
    panelImg.src = p.image;
    panelImg.onload = () => {
      panelImg.style.transition = "opacity 0.4s ease";
      panelImg.style.opacity = "1";
    };
    panelImg.onerror = () => { panelImg.style.display = "none"; };
  } else {
    panelImg.style.display = "none";
    panelImg.src = "";
  }
}

// ── HUD coordinates ───────────────────────────────────────────
export function updateHUD(carPos) {
  hudX.textContent = carPos.x.toFixed(2);
  hudZ.textContent = carPos.z.toFixed(2);
}
