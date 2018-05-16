import * as happyfuntimes from 'happyfuntimes/dist/hft';

const client = new happyfuntimes.GameClient();
client.on('connect', () => { log('connect'); });
client.on('disconnect', () => { log('disconnect'); });
client.on('updateFiles', (data) => {
  log('updateFiles', JSON.stringify(data, null, 2));
  const seen = {};
  for (const [folderName, folder] of Object.entries(data)) {
    for (const [file, fileInfo] of Object.entries(folder.files)) {
      if (fileInfo.bad || fileInfo.archiveName) {
        return;
      }
      const url = fileInfo.thumbnail && fileInfo.thumbnail.url;
      if (url && !seen[url]) {
        seen[url] = true;
        const img = new Image();
        img.src = url;
        img.width = "256";
        document.body.appendChild(img);
      }
      {
        const img = new Image();
        img.src = fileInfo.url;
        img.width = "256";
        document.body.appendChild(img);
      }
    }
  }
});

function log(...args) {
  const elem = document.createElement("pre");
  elem.textContent = [...args].join(' ');
  document.body.appendChild(elem);
}

