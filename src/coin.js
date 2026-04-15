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
    // Add 3–5 full rotations for a dramatic spin
    const extraSpins = (3 + Math.floor(Math.random() * 3)) * 360;
    totalRotation += extraSpins;
  }

  // Snap to the correct face
  const remainder = totalRotation % 360;
  totalRotation = totalRotation - remainder + targetFace;

  coinResult.textContent = '…';
  coinInner.style.transition = flipDuration > 0 ? `transform ${flipDuration / 1000}s ease-out` : 'none';
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
  coinDisplay.addEventListener('click', flipCoin);
}
