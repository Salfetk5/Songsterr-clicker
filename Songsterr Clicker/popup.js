document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('power-toggle');
  const label = document.getElementById('status-label');
  const createFolderBtn = document.getElementById('create-folder-btn');
  const folderNameInput = document.getElementById('folder-name-input');
  const playlistsList = document.getElementById('playlists-list');

  let db = { folders: {} };
  let folderToAnimate = null;

  // Функция обновления текста и цвета статуса
  function updateLabel(state) {
    if (state) { 
      label.textContent = "Работает"; 
      label.style.color = "#2ecc71"; 
    } else { 
      label.textContent = "Выключен"; 
      label.style.color = "#ff4444"; 
    }
  }

  // Функция генерации иконки (ON/OFF) на панели браузера
  function updateIcon(enabled) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = enabled ? '#2ecc71' : '#ff4444';
    ctx.beginPath(); ctx.arc(16, 16, 14, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(enabled ? 'ON' : 'OFF', 16, 16);
    const imageData = ctx.getImageData(0, 0, 32, 32);
    chrome.action.setIcon({ imageData: imageData }).catch(() => {});
  }

  // Загружаем настройки лимитированно, разделяя тумблер и плейлисты
  chrome.storage.local.get(['enabled', 'playlists'], (data) => {
    // Если в памяти еще ничего нет, ставим true по дефолту
    const isEnabled = data.enabled !== false; 
    toggle.checked = isEnabled;
    
    db = data.playlists && data.playlists.folders ? data.playlists : { folders: {} };
    
    updateLabel(isEnabled);
    updateIcon(isEnabled);
    renderPlaylists();
  });

  // Четкое сохранение состояния тумблера
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      updateLabel(isEnabled);
      updateIcon(isEnabled);
    });
  });

  createFolderBtn.addEventListener('click', () => {
    const folderName = folderNameInput.value.trim();
    if (!folderName) return;
    if (!db.folders[folderName]) {
      db.folders[folderName] = [];
      saveData();
      folderNameInput.value = '';
    }
  });

  folderNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createFolderBtn.click();
  });

  function addCurrentTrackTo(folderName) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.url || !currentTab.url.includes("songsterr.com")) {
        alert("Откройте вкладку Songsterr!");
        return;
      }
      let cleanTitle = currentTab.title
        .replace(" Tab by ", " - ")
        .replace(" | Songsterr Tabs with Rhythm", "")
        .replace(" | Songsterr Tabs", "");

      if (db.folders[folderName].some(t => t.url === currentTab.url)) {
        alert("Этот трек уже есть в этой папке!");
        return;
      }
      db.folders[folderName].push({ title: cleanTitle, url: currentTab.url });
      folderToAnimate = folderName;
      saveData();
    });
  }

  function saveData() {
    chrome.storage.local.set({ playlists: db }, () => { 
      renderPlaylists(); 
    });
  }

  function renderPlaylists() {
    playlistsList.innerHTML = '';
    const folders = Object.keys(db.folders);
    if (folders.length === 0) {
      playlistsList.innerHTML = '<div style="color:#666;font-size:11px;text-align:center;padding:15px;">Папок пока нет</div>';
      return;
    }
    folders.forEach(folderName => {
      const folderDiv = document.createElement('div');
      folderDiv.className = 'folder';
      const header = document.createElement('div');
      header.className = 'folder-header';
      const isTarget = (folderName === folderToAnimate);
      const counterClass = isTarget ? 'class="counter-animate"' : '';
      header.innerHTML = `<span>📁 ${folderName} <span ${counterClass}>(${db.folders[folderName].length})</span></span>`;
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'folder-actions';

      const addBtn = document.createElement('span');
      addBtn.className = 'add-to-folder-btn'; addBtn.textContent = '➕';
      addBtn.onclick = (e) => { e.stopPropagation(); addCurrentTrackTo(folderName); };

      const delFolder = document.createElement('span');
      delFolder.className = 'delete-btn'; delFolder.textContent = '❌';
      delFolder.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Удалить папку "${folderName}"?`)) { delete db.folders[folderName]; saveData(); }
      };

      actionsDiv.appendChild(addBtn); actionsDiv.appendChild(delFolder);
      header.appendChild(actionsDiv);

      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'folder-items';

      db.folders[folderName].forEach((track, index) => {
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        const link = document.createElement('a');
        link.className = 'track-link'; link.href = track.url; link.target = '_blank'; link.textContent = track.title;

        const delTrack = document.createElement('span');
        delTrack.className = 'delete-btn'; delTrack.textContent = '×';
        delTrack.onclick = () => { db.folders[folderName].splice(index, 1); saveData(); };

        trackItem.appendChild(link); trackItem.appendChild(delTrack);
        itemsDiv.appendChild(trackItem);
      });
      folderDiv.appendChild(header); folderDiv.appendChild(itemsDiv);
      playlistsList.appendChild(folderDiv);
    });
    folderToAnimate = null;
  }
});