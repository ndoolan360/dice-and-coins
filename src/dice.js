import { addHistoryEntry } from './history.js';

const diceTray = document.getElementById('dice-tray');
const diceRoll = document.getElementById('dice-roll');
const diceClear = document.getElementById('dice-clear');
const diceSum = document.getElementById('dice-sum');
const diceBreakdown = document.getElementById('dice-breakdown');
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

  li.querySelector('.die-roll-single').addEventListener('click', () => rollSingleDie(li));

  const lockBtn = li.querySelector('.die-lock');
  lockBtn.addEventListener('click', () => {
    const locked = li.dataset.locked === 'true';
    li.dataset.locked = String(!locked);
    lockBtn.setAttribute('aria-pressed', String(!locked));
  });

  diceTray.appendChild(clone);
  updateControls();
  updateDiceParams();
}

function showRollResults(results, dieTypes, incrementDuration) {
  const mod = parseInt(diceMod.value, 10) || 0;
  const total = results.reduce((a, b) => a + b, 0) + mod;

  let breakdownParts = [];
  if (results.length > 1) {
    breakdownParts = [...results];
    if (mod !== 0) breakdownParts.push(mod);
  } else if (mod !== 0) {
    breakdownParts = [results[0], mod];
  }
  diceBreakdown.textContent = breakdownParts.join(' + ').replaceAll('+ -', '- ');

  const description = aggregateDieTypes(dieTypes);
  const rollStr = results.join(' + ');
  const modStr = mod !== 0 ? ` + ${mod}` : '';
  if (results.length > 1 || mod !== 0) {
    addHistoryEntry(`🎲 ${description}${modStr}: (${rollStr}${modStr}) ${total}`);
  } else {
    addHistoryEntry(`🎲 ${description}: ${total}`);
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

  dice.forEach((die) => {
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
    if (wrapper) wrapper.dataset.value = String(faceValue);
    gotoRoll(die, position);
    die.setAttribute('aria-label', `${dieType} showing ${faceValue}`);
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

const radToDeg = (angle) => angle * (180 / Math.PI);
const d10Tilt = radToDeg(-Math.asin(Math.pow(5, -0.25)));
const d12Tilt = radToDeg(Math.atan(2));

const diceRotations = {
  d4: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: radToDeg(Math.acos(1 / 3)), y: 180, z: 120 },
    "3": { x: radToDeg(Math.acos(1 / 3)), y: 180, z: 240 },
    "4": { x: radToDeg(Math.acos(1 / 3)), y: 180, z: 0 }
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
    "2": { x: radToDeg(-Math.acos(1 / 3)), y: 0, z: 300 },
    "3": { x: radToDeg(-Math.acos(1 / 3)), y: 0, z: 60 },
    "4": { x: radToDeg(-Math.acos(1 / 3)), y: 0, z: 180 },
    "5": { x: radToDeg(Math.acos(-1 / 3)), y: 0, z: 180 },
    "6": { x: radToDeg(Math.acos(-1 / 3)), y: 0, z: 60 },
    "7": { x: radToDeg(Math.acos(-1 / 3)), y: 0, z: 300 },
    "8": { x: 180, y: 0, z: 0 }
  },
  d10: {
    "1": { x: d10Tilt, y: 0, z: 0 },
    "2": { x: d10Tilt, y: -72, z: 0 },
    "3": { x: d10Tilt, y: -144, z: 0 },
    "4": { x: d10Tilt, y: -216, z: 0 },
    "5": { x: d10Tilt, y: -288, z: 0 },
    "6": { x: d10Tilt - 180, y: -288, z: 0 },
    "7": { x: d10Tilt - 180, y: -216, z: 0 },
    "8": { x: d10Tilt - 180, y: -144, z: 0 },
    "9": { x: d10Tilt - 180, y: -72, z: 0 },
    "10": { x: d10Tilt - 180, y: 0, z: 0 }
  },
  d12: {
    "1": { x: 0, y: 0, z: 0 },
    "2": { x: -d12Tilt, y: 0, z: 324 },
    "3": { x: 180 - d12Tilt, y: 0, z: 324 },
    "4": { x: -d12Tilt, y: 0, z: 252 },
    "5": { x: 180 - d12Tilt, y: 0, z: 252 },
    "6": { x: -d12Tilt, y: 0, z: 180 },
    "7": { x: 180 - d12Tilt, y: 0, z: 180 },
    "8": { x: -d12Tilt, y: 0, z: 108 },
    "9": { x: 180 - d12Tilt, y: 0, z: 108 },
    "10": { x: -d12Tilt, y: 0, z: 36 },
    "11": { x: 180 - d12Tilt, y: 0, z: 36 },
    "12": { x: -180, y: 0, z: 0 }
  },
  d20: {
    "1": { x: 10.73, y: 0, z: 0 },
    "2": { x: 10.73, y: -216, z: 0 },
    "3": { x: -52.62, y: -324, z: 0 },
    "4": { x: 127.38, y: 36, z: 0 },
    "5": { x: 127.38, y: -108, z: 0 },
    "6": { x: -169.27, y: 144, z: 0 },
    "7": { x: -169.27, y: -72, z: 0 },
    "8": { x: -52.62, y: -180, z: 0 },
    "9": { x: 10.73, y: -72, z: 0 },
    "10": { x: -52.62, y: -108, z: 0 },
    "11": { x: 127.38, y: 108, z: 0 },
    "12": { x: -169.27, y: -144, z: 0 },
    "13": { x: 127.38, y: 180, z: 0 },
    "14": { x: 10.73, y: -144, z: 0 },
    "15": { x: 10.73, y: -288, z: 0 },
    "16": { x: -52.62, y: -252, z: 0 },
    "17": { x: -52.62, y: -36, z: 0 },
    "18": { x: 127.38, y: -36, z: 0 },
    "19": { x: -169.27, y: 72, z: 0 },
    "20": { x: -169.27, y: 0, z: 0 }
  }
};

const dieRotX = new WeakMap();
const dieRotY = new WeakMap();

export function gotoRoll(element, facenum) {
  const shapeType = getDieType(element, { considerOnlyShape: true });
  if (!shapeType || diceRotations[shapeType] === undefined) {
    console.warn(`No rotations defined for die type ${getDieType(element)}`);
    return;
  }

  const max = Number(Math.max(...Object.keys(diceRotations[shapeType])));
  const roll = ((facenum - 1) % max) + 1;
  const rotation = diceRotations[shapeType][roll];

  const targetX = rotation.x ?? 0;
  const currentX = dieRotX.get(element) ?? 0;
  const extraX = 2 * 360;
  const newX = currentX + extraX + ((targetX - currentX - extraX) % 360 + 360) % 360;
  dieRotX.set(element, newX);

  const targetY = rotation.y ?? 0;
  const currentY = dieRotY.get(element) ?? 0;
  const extraY = (Math.random() - 0.5) * 360;
  const newY = currentY + extraY + ((targetY - currentY - extraY) % 360 + 360) % 360;
  dieRotY.set(element, newY);

  element.style.setProperty('--rot-x', newX + 0.001 + 'deg');
  element.style.setProperty('--rot-y', newY + 0.001 + 'deg');
  element.style.setProperty('--rot-z', (rotation.z ?? 0) + 0.001 + 'deg');
}
