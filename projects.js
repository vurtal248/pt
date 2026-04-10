// projects.js
// ─────────────────────────────────────────────────────────────
// Single source of truth for portfolio nodes.
// Add / edit entries here; everything else auto-updates.
// position: [x, z] in world-space units (Y is always 0).
// image: relative path or null.
// ─────────────────────────────────────────────────────────────

export const projects = [
  {
    title: "Verses",
    tag: "JS, HTML, CSS, BIBLE",
    desc: "A simple, and clean website that provides a Bible verse everytime you refresh it.",
    image: null,
    position: [0, -6],
  },
  {
    title: "B-Stats",
    tag: "JS, HTML, CSS, BASKETBALL",
    desc: "A basketball stats website that tracks player stats and is able to predict the players future stats based off of their past stats.",
    image: "./Assets/BStats.png",
    position: [6, -2],
  },
];
