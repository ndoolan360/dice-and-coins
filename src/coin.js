import { addHistoryEntry } from './history.js';

const coinInner = document.getElementById('coin-inner');
const coinResult = document.getElementById('coin-result');
const coinFlip = document.getElementById('coin-flip');

let totalRotation = 0;

function flipCoin() {
  coinFlip.disabled = true;

  const isHeads = Math.random() < 0.5;
  const targetFace = isHeads ? 0 : 180;

  // Add 3–5 full rotations for a dramatic spin
  const extraSpins = (3 + Math.floor(Math.random() * 3)) * 360;
  totalRotation += extraSpins;

  // Snap to the correct face
  const remainder = totalRotation % 360;
  totalRotation = totalRotation - remainder + targetFace;

  coinInner.style.transition = 'transform 0.8s ease-out';
  coinInner.style.transform = `rotateX(${totalRotation}deg)`;

  const result = isHeads ? 'Heads' : 'Tails';

  setTimeout(() => {
    coinResult.textContent = result;
    addHistoryEntry(`🪙 ${result}`);
    coinFlip.disabled = false;
  }, 850);
}

export function initCoin() {
  coinFlip.addEventListener('click', flipCoin);
}
