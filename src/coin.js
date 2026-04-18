import { addHistoryEntry } from './history.js';

const coinInner = document.getElementById('coin-inner');
const coinResult = document.getElementById('coin-result');
const coinFlip = document.getElementById('coin-flip');
const coinDisplay = document.getElementById('coin-display');

let totalRotation = 0;

function flipCoin() {
  const flipDuration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--coin-flip-duration')) * 1000;
  coinFlip.disabled = true;

  const isHeads = Math.random() < 0.5;
  const targetFace = isHeads ? 0 : 180;

  if (flipDuration > 0) {
    const extraSpins = Math.ceil(Math.random() * 2);
    totalRotation += (3 + extraSpins) * 360;
  }

  const remainder = totalRotation % 360;
  totalRotation = totalRotation - remainder + targetFace;

  coinResult.textContent = '…';
  coinInner.style.transform = `rotateX(${totalRotation}deg)`;

  const result = isHeads ? 'Heads' : 'Tails';

  setTimeout(() => {
    coinResult.textContent = result;
    addHistoryEntry(`🪙 ${result}`);
    coinFlip.disabled = false;
  }, flipDuration > 0 ? flipDuration + 50 : 0);
}

export function initCoin() {
  coinFlip.addEventListener('click', flipCoin);
  coinInner.addEventListener('click', flipCoin);
}
