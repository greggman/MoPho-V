"use strict";

const platforms = {
  linux: { name: 'Linux', ext: '.AppImage', },
  mac:   { name: 'MacOS', ext: '.dmg', },
  win:   { name: 'Windows', ext: '.exe', },
};

getLatestReleaseAssets()
  .then(extractPlatformAssets)
  .then(renderLinks);

const isMobileRE = /iPod|iPad|iPhone|Android/i;
if (isMobileRE.test(navigator.userAgent)) {
  document.querySelectorAll('video').forEach((video) => {
    const img = new Image();
    img.src = video.src.replace('.mp4', '.gif');
    video.parentElement.appendChild(img);
    video.parentElement.removeChild(video);
  });
}

function getLatestReleaseAssets() {
  return fetch('https://api.github.com/repos/greggman/MoPho-V/releases/latest', {
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    method: 'GET', // *GET, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *same-origin
  }).then((res) => {
    return res.json();
  });
}

function extractPlatformAssets(data) {
  const info = {};
  for (const [platform, platformInfo] of Object.entries(platforms)) {
    for (const asset of data.assets) {
      if (asset.name.endsWith(platformInfo.ext)) {
        info[platform] = asset;
        break;
      }
    }
  }
  return info;
}

function renderLinks(info) {
  const platform = getPlatform();
  const main = info[platform];
  if (main) {
    addButton('#dl-main', platform, main, "main");
  }
  for (const [plat, asset] of Object.entries(info)) {
    // if (asset !== main) {
      addButton('#dl-other', plat, asset);
    // }
  }
}

function addElement(parent, type, content, className) {
  const elem = document.createElement(type);
  elem.textContent = content;
  if (className) {
    elem.className = className;
  }
  parent.appendChild(elem);
}

function addButton(id, platName, asset, extraClass = "") {
  const elem = document.querySelector(id);
  const a = document.createElement('a');
  a.href = asset.browser_download_url;
  addElement(a, 'div', asset.name, 'name');
  addElement(a, 'div', `For ${platforms[platName].name}`, 'plat');
  a.className = `dl-button ${extraClass}`;
  elem.appendChild(a);
}

function getPlatform() {
  const platform = navigator.platform;
  if ((/mac/i).test(platform)) {
    return 'mac';
  } else if ((/win/i).test(platform)) {
    return 'win';
  } else if ((/linux/i).test(platform)) {
    return 'linux';
  }
  return '';
}
