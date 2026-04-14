const history = document.getElementById('history');
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

  history.classList.remove('history-notify');
  if (!history.open) {
    requestAnimationFrame(() => history.classList.add('history-notify'));
  }

  const stored = JSON.parse(sessionStorage.getItem('history') ?? '[]');
  stored.unshift(text);
  sessionStorage.setItem('history', JSON.stringify(stored));
}

function onHistoryNotifyEnd(e) {
  if (e.target === history) {
    history.classList.remove('history-notify');
  }
}

function clearHistory() {
  historyList.innerHTML = '';
  history.classList.remove('history-notify');
  sessionStorage.removeItem('history');
}

export function initHistory() {
  history.addEventListener('animationend', onHistoryNotifyEnd);
  historyClear.addEventListener('click', clearHistory);

  const stored = JSON.parse(sessionStorage.getItem('history') ?? '[]');
  for (const text of stored) {
    const li = document.createElement('li');
    li.textContent = text;
    historyList.append(li);
  }
}
