/*
Copyright 2018, Greggman.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials provided
      with the distribution.

    * Neither the name of Greggman. nor the names of their
      contributors may be used to endorse or promote products derived
      from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import * as happyfuntimes from 'happyfuntimes/dist/hft';
import _ from 'lodash';
import AFRAME from '../../../3rdparty/aframe/aframe';
import {getOrientationInfo} from '../../lib/rotatehelper';

const THREE = AFRAME.THREE;

class LoadingImage {
  constructor(url) {
    const img = new Image();
    this.url = url;
    this.img = img;
    this.promises = [];
    img.addEventListener('load', () => {
      this.isLoaded = true;
      const promises = this.promises;
      this.promises = [];
      promises.forEach((p) => {
        p.resolve(img);
      });
    });
    img.addEventListener('error', () => {
      this.isBad = true;
      const promises = this.promises;
      this.promises = [];
      promises.forEach((p) => {
        p.reject(url);
      });
    });
    img.src = url;
  }
  get() {
    if (this.isBad) {
      return Promise.reject(this.url);
    }
    if (this.isLoaded) {
      return Promise.resolve(this.img);
    }
    return new Promise((resolve, reject) => {
      this.promises.push({resolve, reject});
    });
  }
}

class ImageCache {
  constructor() {
    this.imageInfos = {};
  }
  getImage(url) {
    let info = this.imageInfos[url];
    if (!info) {
      const img = new LoadingImage(url);
      info = {
        refCount: 0,
        img: img,
      };
      this.imageInfos[url] = info;
    }
    ++info.refCount;
    return info.img.get();
  }
  releaseImage(img) {
    const info = this.imageInfos[img.url];
    --info.refCount;
    if (info.refCount === 0) {
      delete this.imageInfos[img.url];
    }
  }
}

const imageCache = new ImageCache();

AFRAME.registerComponent('thumbnail', {
  schema: {
    file: {},
  },
  init() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D('mesh', mesh);
    this.texture = texture;
    this.material = material;
    this.ctx = ctx;
    this.requestId = 0;

    this.el.addEventListener('click', (e) => {
      console.log(e);
    });
  },
  requestImage(file) {
    const requestId = ++this.requestId;
    this.url = file.url;
    imageCache.getImage(file.thumbnail.url).then((img) => {
      if (requestId !== this.requestId) {
        return;
      }
      const ctx = this.ctx;
      const thumbnail = file.thumbnail;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 256, 256);
      ctx.drawImage(
        img,
        thumbnail.x, thumbnail.y, thumbnail.width, thumbnail.height,
        0, 0, 256, 256
      );
      let xAspect = file.width / file.height;
      let yAspect = 1;
      if (xAspect > 1) {
        yAspect = 1 / xAspect;
        xAspect = 1;
      }
      const info = getOrientationInfo(file, file.orientation);
      const width  = info.rotation % 180 ? yAspect : xAspect; // * info.scale[0];
      const height = info.rotation % 180 ? xAspect : yAspect; // * info.scale[1];
      // thumb.elem.setAttribute('rotation', {x: 0, y: 0, z: 360 - info.rotation});
      this.el.setAttribute('scale', {x: width, y: height, z: 1});
      this.texture.needsUpdate = true;
    }).catch(() => {
      if (requestId !== this.requestId) {
        return;
      }
      this.fillImage();
    });
  },
  fillImage() {
    const ctx = this.ctx;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 256, 256);
    ctx.font = '100px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', 128, 128);
    this.el.setAttribute('scale', {x: 1, y: 1, z: 1});
    this.texture.needsUpdate = true;
  },
  setState(x, y, z, opacity) {
    this.el.object3D.position.set(x, y, z);
    this.material.opacity = opacity;
  },
  update() {
    const file = this.data.file;
    if (file === this.oldFile) {
      return;
    }
    this.oldFile = file;
    if (file) {
      this.requestImage(file);
    }
  }
});

AFRAME.registerComponent('imagegrid', {
  schema: {
    across: { type: 'int', default: 3, },
    down: { type: 'int', default: 3, },
    spacing: { type: 'number', default: 1, },
  },
  init() {
    this.thumbs = [];
    this.el.addEventListener('setImages', this.setImages.bind(this));
  },
  setImages(e) {
    this.files = e.detail.files;
    this.scrollY = e.detail.scrollY;

    const data = this.data;
    const across = data.across;
    const down = data.down;
    const spacing = data.spacing;
    const maxX = (across - 1);
    const maxY = (down - 1);

    const startLine = this.scrollY | 0;
    const start = startLine * this.data.across;
    const end = Math.min(start + this.thumbs.length, this.files.length);
    const unusedThumbs = this.thumbs.slice();
    const thumbsThatMatchFiles = {};
    for (let i = 0; i < this.thumbs.length; ++i) {
      const ndx = start + i;
      if (ndx >= end) {
        break;
      }
      const file = this.files[ndx];
      for (let j = 0; j < unusedThumbs.length; ++j) {
        const thumb = unusedThumbs[j];
        if (thumb.url === file.url) {
          thumbsThatMatchFiles[file.url] = unusedThumbs.splice(j, 1)[0];
          break;
        }
      }
    }

    for (let i = 0; i < this.thumbs.length; ++i) {
      const ndx = start + i;
      let thumb;
      if (ndx < end) {
        const file = this.files[ndx];
        thumb = thumbsThatMatchFiles[file.url];
        if (!thumb) {
          thumb = unusedThumbs.pop();
          this.loadImage(thumb, file);
        }
      } else {
        thumb = unusedThumbs.pop();
      }
      const x = ndx % across;
      const y = (ndx / across | 0) - this.scrollY;
      const u = x / maxX;
      const v = y / maxY;
      const px = maxX * ( u - .5) * spacing;
      const py = maxY * ( v - .5) * spacing * -1;
      const pz = 0;
      const opacity = y < 1
        ? y
        : y > (maxY - 1)
          ? 1 - (y - (maxY - 1))
          : 1;
      thumb.elem.components.thumbnail.setState(px, py, pz, opacity);
    }
  },
  loadImage(thumb, file) {
    thumb.elem.setAttribute('thumbnail', {file: file});
  },
  update() {
    const data = this.data;
    const across = data.across;
    const down = data.down;
    const needed = across * down;
    while (this.thumbs.length < needed) {
      const elem = document.createElement('a-entity');
      elem.setAttribute('thumbnail', {});
      this.el.appendChild(elem);
      this.thumbs.push({
        elem: elem,
      });
    }
  },
  remove() {

  }
});

AFRAME.registerComponent('viewer', {
  scheme: {
    src: {type: 'string'},
  },
  init() {
    this.img = this.el.querySelector('.img');
  },
  setFile(file) {
    const url = file.url;
    console.log('viewer:', file);
    this.img.setAttribute('src', url);
    const onload = () => {
      this.img.removeEventListener('materialtextureloaded', onload);
      const info = getOrientationInfo(file, file.orientation);
      const aspect = info.width / info.height;
      let scaleX = 1;
      let scaleY = 1 / aspect;
      if (info.rotation % 180) {
        scaleY = 1;
        scaleX = 1 / aspect;
      }
      const scale = 5; // 10;
      const width  = scale * info.scale[0] * scaleX;
      const height = scale * info.scale[1] * scaleY;
      // const width  = info.rotation % 180 ? yAspect : xAspect; // * info.scale[0];
      // const height = info.rotation % 180 ? xAspect : yAspect; // * info.scale[1];
      this.img.setAttribute('rotation', { x: 0, y: 0, z: 360 - info.rotation});
      this.img.setAttribute('scale', {x: width, y: height, z: 1});
    };
    this.img.addEventListener('materialtextureloaded', onload);
  },
});

AFRAME.registerComponent('mophov', {
  init() {
    const client = new happyfuntimes.GameClient();

    this.client = client;
    this.password = undefined;
    this.triedOnce = false;

    this.files = [];
    this.newFiles = [];
    this.images = [];
    this.imageGrid = this.el.querySelector('#imagegrid');
    this.scrollY = 0;
    this.across = 7;  // FIX

    this.viewer = this.el.querySelector('.viewer');

    this.showFiles = _.debounce(this.showFiles.bind(this), 250);

    window.addEventListener('keydown', (e) => {
      const file = this.files[(e.keyCode - 48) % this.files.length];
      console.log('setUrl:', file.url);
      this.viewer.components.viewer.setFile(file);
    });

    // setInterval((e) => {
    //   const file = this.files[Math.random() * this.files.length | 0];
    //   console.log('setUrl:', file.url);
    //   this.viewer.components.viewer.setFile(file);
    // }, 5000);

    // I have no idea what I'm doing here or where to look up best
    // practices. I can't do HTTPS because certs for ip addresses
    // I don't want random person at coffeeshop to see list
    // of files so I want to prevent them logging in. Not really
    // sure what to do.
    // Suppose I could encrypt data on websocket but seems like
    // overkill for now. Submit a PR if you have ideas
    client.on('connect', this.login.bind(this));

    // we send a 'login' cmd.
    // in response we'll either get a
    // `login: {needPassword: true}` in which
    // case we ask for a password and send the `login` cmd again
    // or a `login: {needPassword: false}`
    // in which case `updateFiles` cmds will start appearing

    client.on('disconnect', () => {
      console.log('disconnected');
    });

    client.on('login', (data) => {
      if (data.needPassword) {
        // show password dialog
        this.showPassword();
      } else {
        // we logged in
        this.hidePassword();
      }
    });

    client.on('updateFiles', (folders) => {
      for (const folder of Object.values(folders)) {
        this.newFiles = this.newFiles.concat(Object.values(folder.files).filter(goodFile));
      }
      this.newFiles.sort(sortFn);
      this.showFiles();
    });

    const setScrollY = (v) => {
      const max = Math.ceil(this.files.length / this.across);
      this.scrollY = Math.max(0, Math.min(max, v));
    };

    this.wheelHandler = (e) => {
      setScrollY(this.scrollY + e.deltaY * 0.01);
      this.setImages();
    };

    window.addEventListener('wheel', this.wheelHandler);

    const dd = this.el.querySelector('#dd');
    let controllerTouched = false;
    let controllerStart = true;
    let startPos;
    let scrollYStart;
    const scrollSpeed = 1;

    dd.addEventListener('trackpadtouchstart', () => {
      controllerTouched = true;
      controllerStart = true;
    });

    dd.addEventListener('axismove', (e) => {
      if (!controllerTouched) {
        return;
      }
      if (controllerStart) {
        controllerStart = false;
        startPos = {x: e.detail.axis[0], y: e.detail.axis[1], };
        scrollYStart = this.scrollY;
      } else {
        const delta = {
          x: e.detail.axis[0] - startPos.x,
          y: e.detail.axis[1] - startPos.y,
        };
        setScrollY(scrollYStart + delta.y * scrollSpeed);
        this.setImages();
      }
    });

    dd.addEventListener('trackpadtouchend', () => {
      controllerTouched = false;
    });

    /*
    [
      'trackpadchanged',
      'trackpadmove',
      'trackpaddown',
      'trackpadup',
      'trackpadtouchstart',
      'trackpadtouchmove',
      'trackpadtouchend',
      'axismove',
      'buttonchanged',
      'buttonup',
      'buttondown',
      'touchstart',
      'touchend',
    ].forEach((event) => {
      dd.addEventListener(event, (e) => {
        console.log(event, e);
      });
    });
    */
  },
  setImages() {
    this.imageGrid.emit('setImages', {
      files: this.files,
      scrollY: this.scrollY,
    });
  },
  remove() {
    window.removeEventListener('wheel', this.wheelHandler);
  },
  login() {
    this.client.sendCmd('login', {password: this.password});
  },
  showPassword() {
    this.passwordForm.className = this.triedOnce ? 'error' : '';
    this.passwordUI.style.display = 'block';
    this.passwordElem.focus();
  },
  hidePassword() {
    this.triedOnce = false;
    //    this.passwordUI.style.display = 'none';
  },
  showFiles() {
    this.files = this.newFiles.slice();
    this.setImages();
  },
});

function sortFn(a, b) {
  if (a.sortName < b.sortName) {
    return -1;
  } else if (a.sortName > b.sortName) {
    return 1;
  } else {
    return 0;
  }
}

function goodFile(file) {
  return !file.archiveName && !file.bad;
}

/*
function setupPasswordUI() {
  const $ = document.querySelector.bind(document);
  const passwordUI = $('.password');
  const passwordForm = $('.password form');
  const passwordElem = $('.password input[type=password]');

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triedOnce = true;
    const tempPass = passwordElem.value.trim();
    password = tempPass.length ? tempPass : undefined;
    login();
  });
}
*/
