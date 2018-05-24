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

});

AFRAME.registerComponent('imagegrid', {
  schema: {
    across: { type: 'int', default: 3, },
    down: { type: 'int', default: 3, },
    spacing: { type: 'number', default: 1, },
  },
  init() {
    this.thumbs = [];
    this.el.addEventListener('setImages', (e) => {
      this.files = e.detail;
      const len = Math.min(this.thumbs.length, this.files.length);
      if (len) {
        for (let i = 0; i < len; ++i) {
          const thumb = this.thumbs[i];
          const file = this.files[i];
          this.loadImage(thumb, file);
        }
      }
    });
  },
  loadImage(thumb, file) {
    imageCache.getImage(file.thumbnail.url).then((img) => {
      const ctx = thumb.ctx;
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
      thumb.elem.setAttribute('scale', {x: width, y: height, z: 1});
      thumb.texture.needsUpdate = true;
    }).catch(() => {
      const ctx = thumb.ctx;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 256, 256);
      ctx.font = '100px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', 128, 128);
      thumb.elem.setAttribute('scale', {x: 1, y: 1, z: 1});
      thumb.texture.needsUpdate = true;
    });
  },
  update() {
    const data = this.data;
    const across = data.across;
    const down = data.down;
    const spacing = data.spacing;
    const needed = across * down;
    while (this.thumbs.length < needed) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      canvas.id = `c${this.thumbs.length}`;
      const ctx = canvas.getContext('2d');
      const hue = this.thumbs.length / 9 * 360 | 0;
      const color = `hsl(${hue}deg,100%,50%)`;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = `hsl(${(hue + 180)}deg,100%,80%)`;
      ctx.fillRect(0, 110, 256, 36);
      ctx.fillRect(110, 0, 36, 256);
      ctx.fillStyle = 'black';
      ctx.font = '200px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.thumbs.length, 128, 128);
      document.body.appendChild(canvas);
      const elem = document.createElement('a-entity');
      // elem.setAttribute('geometry', {
      //   primitive: 'plane',
      //   height: 1,
      //   width: 1,
      // });
      // elem.setAttribute('material', {
      //   shader: 'flat',
      // });
      const texture = new THREE.CanvasTexture(canvas);
      const geometry = new THREE.PlaneGeometry();
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });
      const mesh = new THREE.Mesh(geometry, material);
      elem.setObject3D('mesh', mesh);

      this.thumbs.push({
        ctx,
        texture,
        elem,
      });
      this.el.appendChild(elem);
    }
    if (across !== this.oldAcross || down !== this.oldDown) {
      this.oldAcross = across;
      this.oldDown = down;
      const maxX = (across - 1);
      const maxY = (down - 1);
      this.thumbs.forEach((thumb, ndx) => {
        const x = ndx % across;
        const y = ndx / across | 0;
        const u = x / maxX;
        const v = y / maxY;
        const px = maxX * (u - .5) * spacing;
        const py = maxY * (v - .5) * spacing;
        const pz = 0;
        thumb.elem.setAttribute('position', {x: px, y: py, z: pz});
        thumb.elem.object3D.position.set(px, py, pz);
      });
    }
  },
  remove() {

  }
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

    this.showFiles = _.debounce(this.showFiles.bind(this), 250);

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
    this.imageGrid.emit('setImages', this.files);
    return;
    const len = Math.min(this.files.length, 15);
    for (let i = 0; i < len; ++i) {
      const file = this.files[i];
      const canvas = document.createElement('canvas');
      canvas.id = `img${i}`;
      canvas.src = file.url;
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = `hsl(${Math.random() * 360 | 0},100%,50%)`;
      ctx.fillRect(0, 0, 256, 256);
      const elem = document.createElement('a-entity');
      elem.setAttribute('geometry', {
        primitive: 'plane',
        height: 1,
        width: 1,
      });
      elem.setAttribute('material', {
        shader: 'flat',
        src: canvas,
      });
      const x = i % 5 - 2;
      const y = (i / 5 | 0) - 2;
      let xAspect = file.width / file.height;
      let yAspect = 1;
      if (xAspect > 1) {
        yAspect = 1 / xAspect;
        xAspect = 1;
      }
      const info = getOrientationInfo(file, file.orientation);
      const width  = xAspect * info.scale[0];
      const height = yAspect * info.scale[1];
      elem.setAttribute('position', {x, y, z: 0});
      elem.setAttribute('rotation', {x: 0, y: 0, z: 360 - info.rotation});
      elem.setAttribute('scale', {x: width, y: height, z: 1});
      this.el.appendChild(elem);
    }

    this.imageGrid.emit('setImages', {foo:'bar'}, {bar:'foo'});
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
