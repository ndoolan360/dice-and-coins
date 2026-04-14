const historyList = document.getElementById('history-list');
const historyClear = document.getElementById('history-clear');

export function addHistoryEntry(text) {
  const li = document.createElement('li');
  li.textContent = text;
  li.classList.add('history-item--new');
  li.addEventListener('animationend', () => {
    li.classList.remove('history-item--new');
  });
  historyList.prepend(li);

  const stored = JSON.parse(sessionStorage.getItem('history') ?? '[]');
  stored.unshift(text);
  sessionStorage.setItem('history', JSON.stringify(stored));
}

function clearHistory() {
  historyList.innerHTML = '';
  sessionStorage.removeItem('history');
}

export function initHistory() {
  historyClear.addEventListener('click', clearHistory);

  const stored = JSON.parse(sessionStorage.getItem('history') ?? '[]');
  for (const text of stored) {
    const li = document.createElement('li');
    li.textContent = text;
    historyList.append(li);
  }
}
