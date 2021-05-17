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

import path from 'path';
import * as filters from '../../lib/filters';
import createLogger from '../../lib/debug';
import { urlFromFilename } from '../../lib/utils';
import { createImageFromString } from '../../lib/string-image';

let g_id = 0;

// Loads an image or video and emits events
// It is meant to be reused since video elements are expensive
//
// Usage:
//
//   loader = new ThumbLoader();
//   loader.on('ready', ...);
//   loader.on('error', ...);
//   loader.on('free', ...);
//   loader.load({url: url}, id);
//
// Events:
//   ready: (element, width, height)
//      emitted when the video/image as loaded
//   free:
//      emitted when it's safe to request another url. You will always get a
//      free event even if there was an error
//   error: (element)
//      emitted when there was an error trying to load URL
//
// Why isn't this promise based? Because there is an assumption
// we can't keep the image around. We need the code that wants
// to use the image to use it immediately during the 'ready' event.
// when the event returns we are free to re-use the image. With a promise
// the image would be need to be available forever.
function createMediaLoader(options) {
  const video = document.createElement('video');
  const image = document.createElement('img');
  const logger = createLogger('MediaLoader', ++g_id);
  const maxSeekTime = options.maxSeekTime;
  let resolveFn;
  let rejectFn;

  function resolve(elem, width, height) {
    const fn = resolveFn;
    resolveFn = undefined;
    rejectFn = undefined;
    fn({ elem, width, height });
  }

  function reject(...args) {
    const fn = rejectFn;
    resolveFn = undefined;
    rejectFn = undefined;
    fn(...args);
  }

  video.addEventListener('loadedmetadata', (e) => {
    const seekTime = Math.min(maxSeekTime, e.target.duration / 2);
    e.target.currentTime = seekTime;
    e.target.muted = true;
  });
  video.addEventListener('seeked', (e) => {
    e.target.play();
  });
  video.addEventListener('playing', (e) => {
    logger('ready:', e.target.src);
    e.target.pause();
    resolve(e.target, e.target.videoWidth, e.target.videoHeight);
  });
  // video.addEventListener('pause', (e) => {
  //   e.target.removeAttribute('src');
  //   e.target.load();
  // });
  video.addEventListener('error', (e) => {
    console.warn('could not load:', e.target.src, e);
    e.target.removeAttribute('src');
    e.target.load();
    reject(e.target);
  });

  image.addEventListener('load', (e) => {
    logger('loaded:', e.target.src);
    resolve(e.target, e.target.naturalWidth, e.target.naturalHeight);
  });
  image.addEventListener('error', (e) => {
    console.warn('could not load:', e.target.src, e);
    reject(e.target);
  });

  return function load(filename, type) {
    logger('load:', filename);
    if (resolveFn) {
      throw new Error('in use');
    }
    const p = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    video.pause();
    const url = urlFromFilename(filename);
    if (filters.isMimeVideo(type)) {
      video.src = url;
      video.load();
    } else if (filters.isMimeAudio(type)) {
      image.src = createImageFromString(path.basename(filename));
    } else {
      image.src = url;
    }
    return p;
  };
}

export {
  createMediaLoader as default,
};
