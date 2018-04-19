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

import createLogger from '../../lib/debug';
import loadMeta from './load-meta';

// Manages a bunch of ThumbLoaders
//
// Usage:
//   maker = new ThumbnailMaker(options);
//   maker.on('empty', ...);
//   maker.on('thumbnail' ...);
//   maker.on('small', ...);
//   maker.on('error', ...);
//   maker.addUrl(url, type, filename);
//
// Events:
//   empty:
//     There are no more images queued
//   thumbnail: ({x, y, width, height}, canvas)
//     the canvas has a thumbnail at x, y, width, height
//     you must use the contents of the canvas before exiting this event
//   small: ({url, type, filename})
//     the image was smaller than minSize. The passed values are the same that were
//     passed to addURl
//   error: (??)
//     the url could not be loaded
//
// Why isn't this promise based? Because there is an assumption
// we can't keep the canvas thumbnail around. We need the code that wants
// to use the canvas thumbnail to use it immediately during the 'thumbnail' event.
// when the event returns we are free to re-use the canvas. With a promise
// the canvas would be need to be available forever.

/**
 * @typedef {Object} ImageInfo
 * @property {number} orientation
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} ThumbnailMakerInfo
 * @property {function} release
 * @property {ImageInfo} info
 * @property {HTMLCanvasElement} canvas
 */

/**
 * returns a function that creates a promise that resolves to
 * @returns {Promise.<ThubmnailMakerInfo>}
 */
function createThumbnailMaker(options) {
  const maxWidth = options.maxWidth;
  const thumbnailRendererMgr = options.thumbnailRendererManager;
  const mediaLoaderMgr = options.mediaLoaderManager;
  const logger = createLogger('Thumbnailer');

  /**
   * creates a thumbnail
   *
   * returns a Promise that resolves to
   *    @property {function} release
   *    @property {ThumbInfo} canvas
   *
   * You MUST call release!
   *
   * @param {string} filename
   * @param {HTMLVideoElement|HTMLImageElement} elem
   * @param {number} elemWidth
   * @param {number} elemHeight
   * @param {number} orientation
   * @param {number} maxWidth
   */
  async function makeThumbnail(elem, elemWidth, elemHeight, orientation, maxWidth) {
    const tMakerHndl = await thumbnailRendererMgr();
    const tMaker = tMakerHndl.resource;

    return {
      release: tMakerHndl.release,
      canvas: tMaker.makeThumbnail(elem, elemWidth, elemHeight, orientation, maxWidth),
    };
  }

  return async function load(filename, type) {
    logger('load:', filename);
    let loaderHndl;
    let thumbInfo;

    function release() {
      if (thumbInfo) {
        thumbInfo.release();
        thumbInfo = undefined;
      }
      if (loaderHndl) {
        loaderHndl.release();
        loaderHndl = undefined;
      }
    }

    try {
      // get the loader first. It acts as a throttle on loadMeta as well
      loaderHndl = await mediaLoaderMgr();
      const metaInfo = await loadMeta(filename, type);
      const imgInfo = await loaderHndl.resource(filename, type);
      const isAtLeastOnePixel = imgInfo.width > 0 && imgInfo.height > 0;
      if (!isAtLeastOnePixel) {
        throw new Error('no pixels');
      }
      thumbInfo = await makeThumbnail(imgInfo.elem, imgInfo.width, imgInfo.height, metaInfo.orientation, maxWidth);
      // now that the thumbnail is made we don't need the image
      loaderHndl.release();
      return {
        release: release,
        info: Object.assign({}, metaInfo, {
          width: imgInfo.width,
          height: imgInfo.height,
        }),
        canvas: thumbInfo.canvas,
      };
    } catch (e) {
      console.error(e);
      release();
      throw new Error(`could not load ${filename}`);
    }
  };
}

export {
  createThumbnailMaker as default,
};

