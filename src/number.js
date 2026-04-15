import { addHistoryEntry } from './history.js';

const numberResult = document.getElementById('number-result');
const numberMin = document.getElementById('number-min');
const numberMax = document.getElementById('number-max');
const numberPick = document.getElementById('number-pick');

let isPicking = false;

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

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickNumber() {
  if (isPicking) return;

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

  const finalResult = randomInRange(min, max);
  const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--number-scramble-duration')) * 1000;

  if (duration === 0) {
    numberResult.textContent = finalResult;
    addHistoryEntry(`🔢 (${min}–${max}): ${finalResult}`);
    return;
  }

  isPicking = true;
  numberPick.disabled = true;
  const startTime = performance.now();
  let lastSwap = 0;

  function scramble(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out
    const interval = 50 + 150 * (progress * progress);

    if (now - lastSwap >= interval) {
      lastSwap = now;
      numberResult.textContent = randomInRange(min, max);
    }

    if (progress < 1) {
      requestAnimationFrame(scramble);
    } else {
      numberResult.textContent = finalResult;
      addHistoryEntry(`🔢 (${min}–${max}): ${finalResult}`);
      isPicking = false;
      numberPick.disabled = false;
    }
  }

  requestAnimationFrame(scramble);
}

export function initNumber() {
  numberPick.addEventListener('click', pickNumber);
  numberMin.addEventListener('input', updateNumberParams);
  numberMax.addEventListener('input', updateNumberParams);
  loadNumberFromParams();
}
