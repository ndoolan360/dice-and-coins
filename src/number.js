import { addHistoryEntry } from './history.js';

const numberResult = document.getElementById('number-result');
const numberMin = document.getElementById('number-min');
const numberMax = document.getElementById('number-max');
const numberPick = document.getElementById('number-pick');

function updateNumberParams() {
  const url = new URL(window.location);
  const min = parseInt(numberMin.value, 10);
  const max = parseInt(numberMax.value, 10);

  if (min === 1 || isNaN(min)) {
    url.searchParams.delete('min');
  } else {
    url.searchParams.set('min', min);
  }

  if (max === 100 || isNaN(max)) {
    url.searchParams.delete('max');
  } else {
    url.searchParams.set('max', max);
  }

  history.replaceState(null, '', url);
}

function loadNumberFromParams() {
  const params = new URL(window.location).searchParams;

  const min = parseInt(params.get('min'), 10);
  if (!isNaN(min)) {
    numberMin.value = min;
  }

  const max = parseInt(params.get('max'), 10);
  if (!isNaN(max)) {
    numberMax.value = max;
  }

  updateNumberParams();
}

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
    updateNumberParams();
  }

  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  numberResult.textContent = result;
  addHistoryEntry(`🔢 ${result} (${min}–${max})`);
}

export function initNumber() {
  numberPick.addEventListener('click', pickNumber);
  numberMin.addEventListener('input', updateNumberParams);
  numberMax.addEventListener('input', updateNumberParams);
  loadNumberFromParams();
}
