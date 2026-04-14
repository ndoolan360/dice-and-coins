import { addHistoryEntry } from './history.js';

const diceTray = document.getElementById('dice-tray');
const diceRoll = document.getElementById('dice-roll');
const diceClear = document.getElementById('dice-clear');
const diceSum = document.getElementById('dice-sum');
const diceBreakdown = document.getElementById('dice-breakdown');
const diceSelector = document.getElementById('dice-selector');
const diceBase = document.getElementById('dice-base');

const VALID_DICE = new Set(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);

let isRolling = false;

function animateCount(element, target, duration = 600) {
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateControls() {
  const hasDice = diceTray.querySelector('.die') !== null;
  diceRoll.disabled = isRolling || !hasDice;
  diceClear.disabled = isRolling || !hasDice;
}

function updateDiceParams() {
  const url = new URL(window.location);
  const dice = diceTray.querySelectorAll('.die > span');
  const base = parseInt(diceBase.value, 10) || 0;

  const parts = [];
  if (dice.length > 0) {
    const types = Array.from(dice, (die) => die.classList[0]);
    parts.push(aggregateDieTypes(types, ' '));
  }
  if (base !== 0) parts.push(String(base));

  if (parts.length === 0) {
    url.searchParams.delete('dice');
  } else {
    url.searchParams.set('dice', parts.join(' '));
  }
  history.replaceState(null, '', url);
}

function addDie(sides) {
  const template = document.getElementById(`${sides}-template`);
  if (!template) return;

  const clone = template.content.cloneNode(true);
  const li = clone.querySelector('.die');

  li.querySelector('.die-remove').addEventListener('click', () => {
    li.remove();
    updateControls();
    updateDiceParams();
  });

  diceTray.appendChild(clone);
  updateControls();
  updateDiceParams();
}

function rollDice() {
  const dice = diceTray.querySelectorAll('.die > span');
  if (dice.length === 0) return;

  isRolling = true;
  updateControls();
  diceSum.textContent = '...';
  diceBreakdown.textContent = '';

  const results = [];
  const dieTypes = [];

  dice.forEach((die) => {
    const dieType = die.classList[0];
    const max = parseInt(dieType.slice(1), 10);
    const roll = Math.floor(Math.random() * max) + 1;
    results.push(roll);
    dieTypes.push(dieType);
    gotoRoll(die, roll);
    die.setAttribute('aria-label', `${dieType} showing ${roll}`);
  });

  const sum = results.reduce((a, b) => a + b, 0);

  // Update display after CSS transition completes
  setTimeout(() => {
    const base = parseInt(diceBase.value, 10) || 0;
    const total = sum + base;

    animateCount(diceSum, total);

    const breakdownParts = results.length > 1 ? [...results] : [];
    if (base !== 0) breakdownParts.push(`${base} (base)`);
    diceBreakdown.textContent = breakdownParts.join(' + ');

    const description = aggregateDieTypes(dieTypes);
    const rollStr = results.join(' + ');
    const baseStr = base !== 0 ? ` + ${base} (base)` : '';
    if (results.length > 1 || base !== 0) {
      addHistoryEntry(`\u{1F3B2} ${description}: ${rollStr}${baseStr} = ${total}`);
    } else {
      addHistoryEntry(`\u{1F3B2} ${description}: ${total}`);
    }

    isRolling = false;
    updateControls();
  }, 2050);
}

function clearDice() {
  diceTray.querySelectorAll('.die').forEach((die) => die.remove());
  diceSum.textContent = '???';
  diceBreakdown.textContent = '';
  updateControls();
  updateDiceParams();
}

export function initDice() {
  diceSelector.querySelectorAll('button[data-die]').forEach((btn) => {
    btn.addEventListener('click', () => addDie(btn.dataset.die));
  });

  diceRoll.addEventListener('click', rollDice);
  diceClear.addEventListener('click', clearDice);
  diceBase.addEventListener('input', updateDiceParams);
  updateControls();
  loadDiceFromParams();
}

function parseDiceParam(param) {
  const dice = [];
  let base = 0;
  const groups = param.split(' ');

  // If the last segment is a plain integer, treat it as the flat base
  const last = groups[groups.length - 1];
  if (/^-?\d+$/.test(last)) {
    base = parseInt(groups.pop(), 10);
  }

  for (const group of groups) {
    const match = group.match(/^(\d*)(d\d+)$/);
    if (!match || !VALID_DICE.has(match[2])) continue;
    const count = match[1] ? parseInt(match[1], 10) : 1;
    for (let i = 0; i < count; i++) {
      dice.push(match[2]);
    }
  }
  return { dice, base };
}

function loadDiceFromParams() {
  const diceParam = new URL(window.location).searchParams.get('dice');
  if (!diceParam) return;

  const { dice, base } = parseDiceParam(diceParam);
  for (const sides of dice) {
    addDie(sides);
  }
  if (base !== 0) diceBase.value = base;
}

function aggregateDieTypes(dieTypes, separator = ' + ') {
  const counts = dieTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))
    .map(([type, count]) => `${count}${type}`)
    .join(separator);
}

const diceRotations = {
  "d4": {
    "1": { "x": -19.47, "y": 0, "z": 0 },
    "2": { "x": -19.47, "y": -120, "z": 0 },
    "3": { "x": -19.47, "y": -240, "z": 0 },
    "4": { "x": -90, "y": 0, "z": 180 }
  },
  "d6": {
    "1": { "x": 0, "y": 0, "z": 0 },
    "2": { "x": 90, "y": 90, "z": 0 },
    "3": { "x": 90, "y": 180, "z": 90 },
    "4": { "x": 0, "y": -90, "z": 180 },
    "5": { "x": 90, "y": 0, "z": 180 },
    "6": { "x": 180, "y": 0, "z": 90 }
  },
  "d8": {
    "1": { "x": -35.26, "y": 0, "z": 0 },
    "2": { "x": -215.26, "y": -90, "z": 0 },
    "3": { "x": -35.26, "y": -270, "z": 0 },
    "4": { "x": -215.26, "y": -180, "z": 0 },
    "5": { "x": -35.26, "y": -180, "z": 0 },
    "6": { "x": -215.26, "y": -270, "z": 0 },
    "7": { "x": -35.26, "y": -90, "z": 0 },
    "8": { "x": -215.26, "y": 0, "z": 0 }
  },
  "d10": {
    "1": { "x": -221.97, "y": -108, "z": 0 },
    "2": { "x": -41.97, "y": -36, "z": 0 },
    "3": { "x": -221.97, "y": -324, "z": 0 },
    "4": { "x": -41.97, "y": -252, "z": 0 },
    "5": { "x": -221.97, "y": -252, "z": 0 },
    "6": { "x": -41.97, "y": -324, "z": 0 },
    "7": { "x": -221.97, "y": -36, "z": 0 },
    "8": { "x": -41.97, "y": -108, "z": 0 },
    "9": { "x": -221.97, "y": -180, "z": 0 },
    "10": { "x": -41.97, "y": -180, "z": 0 }
  },
  "d12": {
    "1": { "x": -90, "y": 0, "z": 0 },
    "2": { "x": -153.43, "y": -252, "z": 0 },
    "3": { "x": 26.57, "y": -36, "z": 0 },
    "4": { "x": -153.43, "y": -180, "z": 0 },
    "5": { "x": -153.43, "y": -36, "z": 0 },
    "6": { "x": -153.43, "y": -108, "z": 0 },
    "7": { "x": 26.57, "y": -180, "z": 0 },
    "8": { "x": 26.57, "y": -324, "z": 0 },
    "9": { "x": 26.57, "y": -252, "z": 0 },
    "10": { "x": -153.43, "y": -324, "z": 0 },
    "11": { "x": 26.57, "y": -108, "z": 0 },
    "12": { "x": -270, "y": 0, "z": 0 }
  },
  "d20": {
    "1": { "x": 10.73, "y": 0, "z": 0 },
    "2": { "x": 10.73, "y": -216, "z": 0 },
    "3": { "x": -52.62, "y": -324, "z": 0 },
    "4": { "x": 127.38, "y": 36, "z": 0 },
    "5": { "x": 127.38, "y": -108, "z": 0 },
    "6": { "x": -169.27, "y": 144, "z": 0 },
    "7": { "x": -169.27, "y": -72, "z": 0 },
    "8": { "x": -52.62, "y": -180, "z": 0 },
    "9": { "x": 10.73, "y": -72, "z": 0 },
    "10": { "x": -52.62, "y": -108, "z": 0 },
    "11": { "x": 127.38, "y": 108, "z": 0 },
    "12": { "x": -169.27, "y": -144, "z": 0 },
    "13": { "x": 127.38, "y": 180, "z": 0 },
    "14": { "x": 10.73, "y": -144, "z": 0 },
    "15": { "x": 10.73, "y": -288, "z": 0 },
    "16": { "x": -52.62, "y": -252, "z": 0 },
    "17": { "x": -52.62, "y": -36, "z": 0 },
    "18": { "x": 127.38, "y": -36, "z": 0 },
    "19": { "x": -169.27, "y": 72, "z": 0 },
    "20": { "x": -169.27, "y": 0, "z": 0 }
  }
};

const dieRotX = new WeakMap();
const dieRotY = new WeakMap();

export function gotoRoll(element, facenum) {
  const dieType = element?.classList?.[0];
  if (!dieType || diceRotations[dieType] === undefined) {
    console.warn(`No rotations defined for die type ${dieType}`);
    return;
  }

  const max = Number(Math.max(...Object.keys(diceRotations[dieType])));
  const roll = ((facenum - 1) % max) + 1;
  const rotation = diceRotations[dieType][roll];

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

  element.style.setProperty('--rot-x', newX + 'deg');
  element.style.setProperty('--rot-y', newY + 'deg');
  element.style.setProperty('--rot-z', (rotation.z ?? 0) + 'deg');
}
