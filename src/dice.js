import { addHistoryEntry } from './history.js';

const diceTray = document.getElementById('dice-tray');
const diceRoll = document.getElementById('dice-roll');
const diceClear = document.getElementById('dice-clear');
const diceSum = document.getElementById('dice-sum');
const diceBreakdown = document.getElementById('dice-breakdown');
const diceResult = document.getElementById('dice-result');
const diceControls = document.getElementById('dice-controls');
const diceSelector = document.getElementById('dice-selector');
const diceMod = document.getElementById('dice-modifier-input');
const diceColourInput = document.getElementById('dice-colour');

function getDieType(element, { considerOnlyShape = false } = {}) {
  if (considerOnlyShape) return element?.classList?.[1];
  return element?.dataset?.type ?? element?.classList?.[1];
}

function getContrastColour(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return lum > 0.179 ? '#000000' : '#ffffff';
}

function applyDiceColour(hex) {
  document.documentElement.style.setProperty('--dice-colour', hex);
  document.documentElement.style.setProperty('--dice-text', getContrastColour(hex));
}

function resolveColourToHex(colour) {
  const el = document.createElement('div');
  el.style.color = colour;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const accentRaw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
const DEFAULT_DICE_COLOUR = resolveColourToHex(accentRaw || 'royalblue');

function updateColourParam(hex) {
  const url = new URL(window.location);
  if (hex.toLowerCase() === DEFAULT_DICE_COLOUR) {
    url.searchParams.delete('colour');
  } else {
    url.searchParams.set('colour', hex.replace('#', ''));
  }
  history.replaceState(null, '', url);
}

function loadColourFromParams() {
  const raw = new URL(window.location).searchParams.get('colour');
  const hex = raw ? '#' + raw : DEFAULT_DICE_COLOUR;
  diceColourInput.value = hex;
  applyDiceColour(hex);
}

const VALID_DICE = new Set(['d4', 'd6', 'd8', 'd10', 'd%', 'd12', 'd20']);

let isRolling = false;

function animateCount(element, target, duration = 600, onComplete) {
  if (duration <= 0) {
    element.textContent = target;
    onComplete?.();
    return;
  }
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(eased * target);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  }
  requestAnimationFrame(step);
}

function updateControls() {
  const dieCount = diceTray.querySelectorAll('.die-wrapper').length;
  const hasDice = dieCount > 0;
  diceRoll.disabled = isRolling || !hasDice;
  diceClear.disabled = isRolling || !hasDice;
  diceRoll.textContent = dieCount >= 2 ? 'Roll All' : 'Roll';
}

function updateDiceParams() {
  const url = new URL(window.location);
  const dice = diceTray.querySelectorAll('.die-wrapper > .die');
  const mod = parseInt(diceMod.value, 10) || 0;

  const parts = [];
  if (dice.length > 0) {
    const types = Array.from(dice, getDieType);
    parts.push(aggregateDieTypes(types, ' '));
  }
  if (mod !== 0) parts.push(String(mod));
  else if (!diceMod.validity.badInput) diceMod.value = '';

  if (parts.length === 0) {
    url.searchParams.delete('dice');
  } else {
    url.searchParams.set('dice', parts.join(' ').replace(' -', '-'));
  }
  history.replaceState(null, '', url);
}

function addDie(sides) {
  const template = document.getElementById(`${sides}-template`);
  if (!template) return;

  const clone = template.content.cloneNode(true);
  const li = clone.querySelector('.die-wrapper');

  li.querySelector('.die-remove').addEventListener('click', () => {
    li.remove();
    updateControls();
    updateDiceParams();
  });

  const singleRollBtn = li.querySelector('.die-roll-single');
  singleRollBtn.addEventListener('click', () => rollSingleDie(li));
  singleRollBtn.addEventListener("mouseenter", hintBrowser);
  singleRollBtn.addEventListener("animationEnd", removeHint);

  const lockBtn = li.querySelector('.die-lock');
  lockBtn.addEventListener('click', () => {
    const locked = li.dataset.locked === 'true';
    li.dataset.locked = String(!locked);
    lockBtn.setAttribute('aria-pressed', String(!locked));
  });

  const die = li.querySelector('.die');
  setupDieGrab(die, li);

  diceTray.appendChild(clone);
  updateControls();
  updateDiceParams();
}

function showRollResults(results, dieTypes, incrementDuration) {
  const mod = parseInt(diceMod.value, 10) || 0;
  const total = results.reduce((a, b) => a + b, 0) + mod;

  const description = aggregateDieTypes(dieTypes)
  const rollStr = results.join(' + ');
  const modStr = mod === 0 ? '' :
    mod < 0 ? ` - ${-mod}` : ` + ${mod}`;
  if (results.length > 1 || mod !== 0) {
    addHistoryEntry(`🎲 ${description}${modStr}: (${rollStr}${modStr}) ${total}`);
    diceBreakdown.textContent = `${rollStr}${modStr}`;
  } else {
    addHistoryEntry(`🎲 ${description}: ${total}`);
    if (results.length > 1) diceBreakdown.textContent = rollStr;
  }

  const hasBumped = Array.from(diceTray.querySelectorAll('.die-wrapper'))
    .some(w => w.dataset.bumped === 'true');
  if (hasBumped) {
    diceResult.dataset.bumped = 'true';
  } else {
    diceResult.removeAttribute('data-bumped');
  }

  animateCount(diceSum, total, incrementDuration, () => {
    isRolling = false;
    updateControls();
  });
}

function rollDice() {
  const dice = diceTray.querySelectorAll('.die-wrapper > .die');
  if (dice.length === 0) return;
  const style = getComputedStyle(document.documentElement);
  const spinDuration = parseFloat(style.getPropertyValue('--dice-spin-duration')) * 1000;
  const incrementDuration = parseFloat(style.getPropertyValue('--dice-increment-duration')) * 1000;

  isRolling = true;
  updateControls();
  if (spinDuration > 0) diceSum.textContent = '…';
  diceBreakdown.textContent = '';

  const results = [];
  const dieTypes = [];

  dice.forEach((die, i) => {
    const wrapper = die.closest('.die-wrapper');
    const dieType = getDieType(die);
    dieTypes.push(dieType);
    if (wrapper?.dataset.locked === 'true') {
      results.push(parseInt(wrapper.dataset.value ?? '1', 10));
      return;
    }
    const max = Object.keys(diceRotations[getDieType(die, { considerOnlyShape: true })]).length;
    const position = Math.floor(Math.random() * max) + 1;
    const faceEl = die.querySelector(`.face-${position}`);
    const faceValue = faceEl != null ? parseInt(faceEl.textContent, 10) : position;
    results.push(faceValue);
    if (wrapper) {
      wrapper.dataset.value = String(faceValue);
      wrapper.dataset.bumped = 'false';
    }
    die.setAttribute('aria-label', `${dieType} showing ${faceValue}`);
    setTimeout(() => gotoRoll(die, position), i * 100);
  });

  setTimeout(() => {
    showRollResults(results, dieTypes, incrementDuration);
  }, spinDuration > 0 ? spinDuration + 50 : 0);
}

function rollSingleDie(wrapper) {
  if (isRolling) return;
  const style = getComputedStyle(document.documentElement);
  const spinDuration = parseFloat(style.getPropertyValue('--dice-spin-duration')) * 1000;
  const incrementDuration = parseFloat(style.getPropertyValue('--dice-increment-duration')) * 1000;

  isRolling = true;
  updateControls();
  if (spinDuration > 0) diceSum.textContent = '…';
  diceBreakdown.textContent = '';

  const die = wrapper.querySelector('.die');
  const dieType = getDieType(die);
  const max = Object.keys(diceRotations[getDieType(die, { considerOnlyShape: true })]).length;
  const position = Math.floor(Math.random() * max) + 1;
  const faceEl = die.querySelector(`.face-${position}`);
  const faceValue = faceEl != null ? parseInt(faceEl.textContent, 10) : position;
  wrapper.dataset.value = String(faceValue);
  wrapper.dataset.bumped = 'false';
  diceResult.dataset.bumped = 'false';
  gotoRoll(die, position);
  die.setAttribute('aria-label', `${dieType} showing ${faceValue}`);

  setTimeout(() => {
    const allWrappers = Array.from(diceTray.querySelectorAll('.die-wrapper'));
    const allResults = allWrappers.map(w => parseInt(w.dataset.value ?? '1', 10));
    const allTypes = allWrappers.map(w => getDieType(w.querySelector('.die')));
    showRollResults(allResults, allTypes, incrementDuration);
  }, spinDuration > 0 ? spinDuration + 50 : 0);
}

function clearDice() {
  diceTray.querySelectorAll('.die-wrapper').forEach((die) => die.remove());
  diceSum.textContent = '';
  diceBreakdown.textContent = '';
  diceMod.value = '';
  updateControls();
  updateDiceParams();
}

export function initDice() {
  diceSelector.querySelectorAll('button[data-die]').forEach((btn) => {
    btn.addEventListener('click', () => addDie(btn.dataset.die));
  });

  diceRoll.addEventListener('click', rollDice);
  diceRoll.addEventListener("mouseenter", hintBrowser);
  diceRoll.addEventListener("animationEnd", removeHint);
  diceControls.addEventListener('submit', e => {
    e.preventDefault();
    rollDice();
  });
  diceClear.addEventListener('click', clearDice);
  diceMod.addEventListener('input', updateDiceParams);
  diceColourInput.addEventListener('input', e => {
    applyDiceColour(e.target.value);
    updateColourParam(e.target.value);
  });
  updateControls();
  loadColourFromParams();
  loadDiceFromParams();
}

function hintBrowser() {
  this.style.willChange = "transform";
}

function removeHint() {
  this.style.willChange = "auto";
}

function parseDiceParam(param) {
  const dice = [];
  let mod = 0;
  const groups = param.replaceAll('-', ' -').split(' ').filter(Boolean);

  // If the last segment is a plain integer, treat it as the flat mod
  const last = groups[groups.length - 1];
  if (/^-?\d+$/.test(last)) {
    mod = parseInt(groups.pop(), 10);
  }

  for (const group of groups) {
    const match = group.match(/^(\d*)(d(?:\d+|%))$/);
    if (!match || !VALID_DICE.has(match[2])) continue;
    const count = match[1] ? parseInt(match[1], 10) : 1;
    for (let i = 0; i < count; i++) {
      dice.push(match[2]);
    }
  }
  return { dice, mod };
}

function loadDiceFromParams() {
  const diceParam = new URL(window.location).searchParams.get('dice');
  if (!diceParam) return;

  const { dice, mod } = parseDiceParam(diceParam);
  if (mod !== 0) diceMod.value = mod;
  for (const sides of dice) {
    addDie(sides);
  }
  if (dice.length > 0) rollDice();
}

function aggregateDieTypes(dieTypes, separator = ' + ') {
  const counts = dieTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => (a[0] === 'd%' ? 10.5 : parseInt(a[0].slice(1))) - (b[0] === 'd%' ? 10.5 : parseInt(b[0].slice(1))))
    .map(([type, count]) => `${count}${type}`)
    .join(separator);
}

const RAD2DEG = 180 / Math.PI;
const tetrahedronDihedralAngle = Math.acos(1 / 3) * RAD2DEG;
const octahedronDihedralAngle = Math.acos(-1 / 3) * RAD2DEG;
const d10DihedralAngle = Math.acos(Math.sqrt((5 - Math.sqrt(5)) / 5)) * RAD2DEG;
const dodecahedronDihedralAngle = Math.acos(-1 / Math.sqrt(5)) * RAD2DEG;
const icosahedronDihedralAngle = Math.acos(-Math.sqrt(5) / 3) * RAD2DEG;
const icosahedronSkew = Math.acos(Math.sqrt(5 / 8)) * RAD2DEG;
const icosahedronRingX = Math.acos(1 / Math.sqrt(6)) * RAD2DEG;
const icosahedronRingY = Math.acos(Math.sqrt(2 / 3)) * RAD2DEG;

const diceRotations = {
  d4: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: tetrahedronDihedralAngle, y: 180, z: 120 },
    "3": { x: tetrahedronDihedralAngle, y: 180, z: -120 },
    "4": { x: tetrahedronDihedralAngle, y: 180, z: 0 }
  },
  d6: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: 90, y: 0, z: 0 },
    "3": { x: 0, y: 90, z: 0 },
    "4": { x: 0, y: -90, z: 0 },
    "5": { x: -90, y: 0, z: 0 },
    "6": { x: 180, y: 0, z: 0 }
  },
  d8: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: -tetrahedronDihedralAngle, y: 0, z: -60 },
    "3": { x: -tetrahedronDihedralAngle, y: 0, z: 60 },
    "4": { x: -tetrahedronDihedralAngle, y: 0, z: 180 },
    "5": { x: octahedronDihedralAngle, y: 0, z: 180 },
    "6": { x: octahedronDihedralAngle, y: 0, z: 60 },
    "7": { x: octahedronDihedralAngle, y: 0, z: -60 },
    "8": { x: 180, y: 0, z: 0 }
  },
  d10: {
    "1": { x: -d10DihedralAngle, y: 0, z: 0 },
    "2": { x: -d10DihedralAngle, y: -72, z: 0 },
    "3": { x: -d10DihedralAngle, y: -144, z: 0 },
    "4": { x: -d10DihedralAngle, y: 144, z: 0 },
    "5": { x: -d10DihedralAngle, y: 72, z: 0 },
    "6": { x: 180 - d10DihedralAngle, y: 72, z: 0 },
    "7": { x: 180 - d10DihedralAngle, y: 144, z: 0 },
    "8": { x: 180 - d10DihedralAngle, y: -144, z: 0 },
    "9": { x: 180 - d10DihedralAngle, y: -72, z: 0 },
    "10": { x: 180 - d10DihedralAngle, y: 0, z: 0 }
  },
  d12: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: dodecahedronDihedralAngle + 180, y: 0, z: -36 },
    "3": { x: dodecahedronDihedralAngle, y: 0, z: -36 },
    "4": { x: dodecahedronDihedralAngle + 180, y: 0, z: -108 },
    "5": { x: dodecahedronDihedralAngle, y: 0, z: -108 },
    "6": { x: dodecahedronDihedralAngle + 180, y: 0, z: 180 },
    "7": { x: dodecahedronDihedralAngle, y: 0, z: 180 },
    "8": { x: dodecahedronDihedralAngle + 180, y: 0, z: 108 },
    "9": { x: dodecahedronDihedralAngle, y: 0, z: 108 },
    "10": { x: dodecahedronDihedralAngle + 180, y: 0, z: 36 },
    "11": { x: dodecahedronDihedralAngle, y: 0, z: 36 },
    "12": { x: -180, y: 0, z: 0 }
  },
  d20: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: icosahedronDihedralAngle, y: 0, z: -60 },
    "3": { x: -icosahedronRingX, y: -icosahedronRingY, z: 30 - icosahedronSkew },
    "4": { x: 180 - icosahedronRingX, y: icosahedronRingY, z: icosahedronSkew - 30 },
    "5": { x: -icosahedronRingX, y: -icosahedronRingY, z: -(90 + icosahedronSkew) },
    "6": { x: 180 - icosahedronRingX, y: -icosahedronRingY, z: 150 - icosahedronSkew },
    "7": { x: icosahedronDihedralAngle - 180, y: 0, z: 60 },
    "8": { x: icosahedronDihedralAngle, y: 0, z: -180 },
    "9": { x: -icosahedronRingX, y: icosahedronRingY, z: icosahedronSkew - 150 },
    "10": { x: 180 - icosahedronRingX, y: icosahedronRingY, z: 90 + icosahedronSkew },
    "11": { x: -icosahedronRingX, y: icosahedronRingY, z: 90 + icosahedronSkew },
    "12": { x: 180 - icosahedronRingX, y: icosahedronRingY, z: icosahedronSkew - 150 },
    "13": { x: icosahedronDihedralAngle - 180, y: 0, z: -180 },
    "14": { x: icosahedronDihedralAngle, y: 0, z: 60 },
    "15": { x: -icosahedronRingX, y: -icosahedronRingY, z: 150 - icosahedronSkew },
    "16": { x: 180 - icosahedronRingX, y: -icosahedronRingY, z: -(90 + icosahedronSkew) },
    "17": { x: -icosahedronRingX, y: icosahedronRingY, z: icosahedronSkew - 30 },
    "18": { x: 180 - icosahedronRingX, y: -icosahedronRingY, z: 30 - icosahedronSkew },
    "19": { x: icosahedronDihedralAngle - 180, y: 0, z: -60 },
    "20": { x: -180, y: 0, z: 0 }
  }
};

function findNearestFace(die) {
  const shapeType = getDieType(die, { considerOnlyShape: true });
  const rotations = diceRotations[shapeType];

  const rawX = parseFloat(die.style.getPropertyValue('--rot-x')) || 0;
  const rawY = parseFloat(die.style.getPropertyValue('--rot-y')) || 0;
  const rawZ = parseFloat(die.style.getPropertyValue('--rot-z')) || 0;

  // For CSS transform rotateX(rx) rotateY(ry) rotateZ(rz), the matrix is
  // M = Rx * Ry * Rz. Each face's outward normal in die-local space is
  // M_face^T * (0,0,1), computed by applying Rx^T then Ry^T then Rz^T to (0,0,1).
  function faceNormal(rx, ry, rz) {
    const DEG = Math.PI / 180;
    const ax = rx * DEG, ay = ry * DEG, az = rz * DEG;
    let x = 0, y = 0, z = 1;
    // Rx^T
    let yr = y * Math.cos(ax) + z * Math.sin(ax);
    let zr = -y * Math.sin(ax) + z * Math.cos(ax);
    y = yr; z = zr;
    // Ry^T
    let xr = x * Math.cos(ay) - z * Math.sin(ay);
    zr = x * Math.sin(ay) + z * Math.cos(ay);
    x = xr; z = zr;
    // Rz^T
    xr = x * Math.cos(az) + y * Math.sin(az);
    yr = -x * Math.sin(az) + y * Math.cos(az);
    return [xr, yr, z];
  }

  // Camera direction (+Z world) expressed in the die's local frame.
  const [dlx, dly, dlz] = faceNormal(rawX, rawY, rawZ);

  let bestFace = 1;
  let bestDot = -Infinity;

  for (const [face, rot] of Object.entries(rotations)) {
    const [nx, ny, nz] = faceNormal(rot.x, rot.y, rot.z);
    const dot = dlx * nx + dly * ny + dlz * nz;
    if (dot > bestDot) {
      bestDot = dot;
      bestFace = parseInt(face);
    }
  }

  return bestFace;
}

function snapToFace(die, facenum) {
  const shapeType = getDieType(die, { considerOnlyShape: true });
  const rotation = diceRotations[shapeType][String(facenum)];

  const rawX = parseFloat(die.style.getPropertyValue('--rot-x')) || 0;
  const rawY = parseFloat(die.style.getPropertyValue('--rot-y')) || 0;
  const rawZ = parseFloat(die.style.getPropertyValue('--rot-z')) || 0;

  const snapX = Math.round((rawX - rotation.x) / 360) * 360 + rotation.x;
  const snapY = Math.round((rawY - rotation.y) / 360) * 360 + rotation.y;
  const snapZ = Math.round((rawZ - rotation.z) / 360) * 360 + rotation.z;

  die.style.setProperty('--rot-x', snapX.toFixed(3) + 'deg');
  die.style.setProperty('--rot-y', snapY.toFixed(3) + 'deg');
  die.style.setProperty('--rot-z', snapZ.toFixed(3) + 'deg');
}

function updateResultAfterBump() {
  const allWrappers = Array.from(diceTray.querySelectorAll('.die-wrapper'));
  if (allWrappers.length === 0) return;
  if (allWrappers.some(w => !w.dataset.value)) return;

  const mod = parseInt(diceMod.value, 10) || 0;
  const allResults = allWrappers.map(w => parseInt(w.dataset.value, 10));
  const total = allResults.reduce((a, b) => a + b, 0) + mod;

  diceSum.textContent = String(total);
  diceResult.dataset.bumped = 'true';

  const rollStr = allResults.join(' + ');
  const modStr = mod === 0 ? '' : mod < 0 ? ` - ${-mod}` : ` + ${mod}`;
  if (allResults.length > 1 || mod !== 0) {
    diceBreakdown.textContent = `${rollStr}${modStr}`;
  }
}

function setupDieGrab(die, wrapper) {
  let isDragging = false;
  let startX, startY, startQuat;

  // Quaternion helpers — [x, y, z, w] convention.
  function quatFromAxisAngle(ax, ay, az, angle) {
    const s = Math.sin(angle / 2);
    return [ax * s, ay * s, az * s, Math.cos(angle / 2)];
  }

  function quatMul([x1, y1, z1, w1], [x2, y2, z2, w2]) {
    return [
      w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
      w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
      w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
      w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    ];
  }

  // Convert CSS rotateX(rx)*rotateY(ry)*rotateZ(rz) Euler angles (degrees)
  // to the equivalent quaternion Q = Qx*Qy*Qz.
  function quatFromEuler(rx, ry, rz) {
    const DEG = Math.PI / 180;
    return quatMul(
      quatMul(quatFromAxisAngle(1, 0, 0, rx * DEG),
        quatFromAxisAngle(0, 1, 0, ry * DEG)),
      quatFromAxisAngle(0, 0, 1, rz * DEG));
  }

  // Decompose quaternion back into Rx*Ry*Rz Euler angles (degrees).
  // Uses the standard ZYX decomposition of the combined rotation matrix:
  //   M[0][2] = sin(ry)          = 2(xz + wy)
  //   M[1][2] = -sin(rx)*cos(ry) = 2(yz - wx)
  //   M[2][2] = cos(rx)*cos(ry)  = 1 - 2(x²+y²)
  //   M[0][1] = -sin(rz)*cos(ry) = 2(xy - wz)
  //   M[0][0] = cos(rz)*cos(ry)  = 1 - 2(y²+z²)
  function quatToEuler([x, y, z, w]) {
    const RAD2DEG = 180 / Math.PI;
    const sinRy = Math.max(-1, Math.min(1, 2 * (x * z + w * y)));
    const ry = Math.asin(sinRy) * RAD2DEG;
    let rx, rz;
    if (Math.abs(sinRy) < 0.9999) {
      rx = Math.atan2(-2 * (y * z - w * x), 1 - 2 * (x * x + y * y)) * RAD2DEG;
      rz = Math.atan2(-2 * (x * y - w * z), 1 - 2 * (y * y + z * z)) * RAD2DEG;
    } else {
      // Gimbal lock (ry ≈ ±90°): fix rz = 0, absorb into rx.
      rx = Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z)) * RAD2DEG;
      rz = 0;
    }
    return { x: rx, y: ry, z: rz };
  }

  function onPointerDown(e) {
    if (wrapper.dataset.locked === 'true') return;
    if (isRolling) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button')) return;

    e.preventDefault();
    isDragging = true;
    die.setPointerCapture(e.pointerId);

    startX = e.clientX;
    startY = e.clientY;

    const rawX = parseFloat(die.style.getPropertyValue('--rot-x')) || 0;
    const rawY = parseFloat(die.style.getPropertyValue('--rot-y')) || 0;
    const rawZ = parseFloat(die.style.getPropertyValue('--rot-z')) || 0;
    startQuat = quatFromEuler(rawX, rawY, rawZ);

    die.style.transition = 'transform 0s';
    document.body.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    // Rotation axis is perpendicular to the drag direction in screen space.
    // Dragging right (+dx) → rotate around screen +Y.
    // Dragging down  (+dy) → rotate around screen -X (CSS Y is down, right-hand rule).
    const axisX = -dy / dist;
    const axisY = dx / dist;

    // π radians per full die diameter gives a natural 1:1 surface-drag feel.
    const diameter = wrapper.getBoundingClientRect().width || 100;
    const angle = (dist / diameter) * Math.PI;

    // Apply the world-space drag rotation on top of the captured start orientation.
    const qDrag = quatFromAxisAngle(axisX, axisY, 0, angle);
    const euler = quatToEuler(quatMul(qDrag, startQuat));

    die.style.setProperty('--rot-x', euler.x.toFixed(3) + 'deg');
    die.style.setProperty('--rot-y', euler.y.toFixed(3) + 'deg');
    die.style.setProperty('--rot-z', euler.z.toFixed(3) + 'deg');
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';

    die.style.transition = 'transform 0.2s ease';
    const facePos = findNearestFace(die);
    snapToFace(die, facePos);

    const faceEl = die.querySelector(`.face-${facePos}`);
    const faceValue = faceEl ? parseInt(faceEl.textContent, 10) : facePos;
    wrapper.dataset.value = String(faceValue);
    wrapper.dataset.bumped = 'true';
    die.setAttribute('aria-label', `${getDieType(die)} showing ${faceValue}`);

    setTimeout(() => {
      die.style.transition = '';
      updateResultAfterBump();
    }, 250);
  }

  die.addEventListener('pointerdown', onPointerDown);
  die.addEventListener('pointermove', onPointerMove);
  die.addEventListener('pointerup', onPointerUp);
  die.addEventListener('pointercancel', onPointerUp);
}

export function gotoRoll(element, facenum) {
  const shapeType = getDieType(element, { considerOnlyShape: true });
  if (!shapeType || diceRotations[shapeType] === undefined) {
    console.warn(`No rotations defined for die type ${getDieType(element)}`);
    return;
  }

  const max = Number(Math.max(...Object.keys(diceRotations[shapeType])));
  const roll = ((facenum - 1) % max) + 1;
  const rotation = diceRotations[shapeType][roll];

  const currentX = parseInt(element.style.getPropertyValue('--rot-x'), 10) || 0;
  const newX = currentX + 1080 + rotation.x - (currentX % 360);

  const currentY = parseInt(element.style.getPropertyValue('--rot-y'), 10) || 0;
  const yRoll = Math.random() < 0.5 ? -720 : 720;
  const newY = currentY + yRoll + rotation.y - (currentY % 360);

  element.style.setProperty('--rot-x', newX.toFixed(3) + 'deg');
  element.style.setProperty('--rot-y', newY.toFixed(3) + 'deg');
  element.style.setProperty('--rot-z', rotation.z.toFixed(3) + 'deg');
}
