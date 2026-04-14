import { addHistoryEntry } from './history.js';

const diceTray = document.getElementById('dice-tray');
const diceRoll = document.getElementById('dice-roll');
const diceClear = document.getElementById('dice-clear');
const diceSum = document.getElementById('dice-sum');
const diceBreakdown = document.getElementById('dice-breakdown');
const diceSelector = document.getElementById('dice-selector');

let isRolling = false;

function updateControls() {
  const hasDice = diceTray.querySelector('.die') !== null;
  diceRoll.disabled = isRolling || !hasDice;
  diceClear.disabled = isRolling || !hasDice;
}

function addDie(sides) {
  const template = document.getElementById(`d${sides}-template`);
  if (!template) return;

  const clone = template.content.cloneNode(true);
  const li = clone.querySelector('.die');

  li.querySelector('.die-remove').addEventListener('click', () => {
    li.remove();
    updateControls();
  });

  diceTray.appendChild(clone);
  updateControls();
}

function rollDice() {
  const dice = diceTray.querySelectorAll('.die > span');
  if (dice.length === 0) return;

  isRolling = true;
  updateControls();

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
    diceSum.textContent = sum;
    diceBreakdown.textContent =
      results.length > 1 ? results.join(' + ') : '';

    const description = aggregateDieTypes(dieTypes);
    if (results.length > 1) {
      addHistoryEntry(`\u{1F3B2} ${description}: ${results.join(' + ')} = ${sum}`);
    } else {
      addHistoryEntry(`\u{1F3B2} ${description}: ${sum}`);
    }

    isRolling = false;
    updateControls();
  }, 650);
}

function clearDice() {
  diceTray.querySelectorAll('.die').forEach((die) => die.remove());
  diceSum.textContent = '???';
  diceBreakdown.textContent = '';
  updateControls();
}

export function initDice() {
  diceSelector.querySelectorAll('button[data-die]').forEach((btn) => {
    btn.addEventListener('click', () => addDie(btn.dataset.die));
  });

  diceRoll.addEventListener('click', rollDice);
  diceClear.addEventListener('click', clearDice);
  updateControls();
}

function aggregateDieTypes(dieTypes) {
  const counts = dieTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([type, count]) => `${count}${type}`)
    .join(' + ');
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

export function gotoRoll(element, facenum) {
  const dieType = element?.classList?.[0];
  if (!dieType || diceRotations[dieType] === undefined) {
    console.warn(`No rotations defined for die type ${dieType}`);
    return;
  }

  const max = Number(Math.max(...Object.keys(diceRotations[dieType])));
  const roll = ((facenum - 1) % max) + 1;
  const rotation = diceRotations[dieType][roll];

  element.style.setProperty('--rot-x', (rotation.x ?? 0) + 'deg');
  element.style.setProperty('--rot-y', (rotation.y ?? 0) + 'deg');
  element.style.setProperty('--rot-z', (rotation.z ?? 0) + 'deg');
}
