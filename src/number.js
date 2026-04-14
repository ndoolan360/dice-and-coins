import { addHistoryEntry } from './history.js';

const numberResult = document.getElementById('number-result');
const numberMin = document.getElementById('number-min');
const numberMax = document.getElementById('number-max');
const numberPick = document.getElementById('number-pick');

function pickNumber() {
  let min = parseInt(numberMin.value, 10);
  let max = parseInt(numberMax.value, 10);

  if (isNaN(min) || isNaN(max)) {
    numberResult.textContent = '?';
    return;
  }

  if (min > max) {
    [min, max] = [max, min];
    numberMin.value = min;
    numberMax.value = max;
  }

  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  numberResult.textContent = result;
  addHistoryEntry(`🔢 ${result} (${min}–${max})`);
}

export function initNumber() {
  numberPick.addEventListener('click', pickNumber);
}
