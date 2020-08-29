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
import {
  filenameFromUrl,
  getDifferentFilenames,
  getObjectsByKeys,
  urlFromFilename,
} from '../../lib/utils';
import {separateFilesByPages} from './folder-utils';

// Given an old and new hash of Object.<string, FileInfo> of
// image and video files makes pages of thumbnails (.png files)
// and returns a promise that resolves to a new Object.<string, FileInfo>
// with orientation added and thumbnail data for each including the URL
// for the page and where on that page the thumbnail is.
//
// Min data Required example
//
//     {
//       "filename1": { type: "mime/type" },
//       "filename2": { type: "mime/type" },
//     }
//
// Data returned
//
//     {
//       "filename1": {
//         type: "mime/type",
//         orientation: 0,      // EXIF orientation
//         width: 100,          // width of original image
//         height: 200,         // height of original image
//         thumbnail: {
//           url: "foo.png",    // URL of png for thumbnail
//           x: 150,            // x position of thumbnail
//           y: 150,            // y position of thumbnail
//           width: 150,        // width position of thumbnail
//           height: 150,       // height position of thumbnail
//         },
//       },
//       "filename2": {
//         ... see above ...
//       },
//     },
//
// Assumptions include
//
// 1. Creating lots of canvases is bad (run out of memory?) so we'll only have one of these
//    ThumbnailPageMaker instances. Although that is not enforced here it is why we keep
//    track of 2D contexts and reuse them
//
// 2. We get passed the data for existing images
//
//    From that we copy all images that
//    have not changed to new pages using the same algorithm
//    for new images. When done process new images.
function createThumbnailPageMaker(options) {
  const thumbnailWidth = options.thumbnailWidth;
  const thumbnailMaker = options.thumbnailMaker;
  const fs = options.fs;
  const context2DFactory = options.context2DFactory;
  const imgLoader = options.imgLoader;
  const pageSize = options.pageSize;
  const thumbnailObserver = options.thumbnailObserver;
  const logger = createLogger('ThumbnailPageMaker');

  const twoDContexts = [];
  const oldCtx = get2DContext();

  return async function makePages(baseFilename, oldFiles, newFiles) {
    const cacheSuffix = `?cache=${Date.now()}`;

    // go through old images and build up pages
    // copy every same image to new image
    const diffNames = getDifferentFilenames(oldFiles, newFiles);
    const filesToProcess = getObjectsByKeys(newFiles, [...diffNames.changed, ...diffNames.added]);
    const newFileInfos = {};   // info by filename of each file
    const pages = [];          // each new page of thumbnails

    // make lists of the files on each page
    {
      const oldPages = separateFilesByPages(oldFiles, diffNames.same);

      // for each old page, copy the unchanged thumbnails to
      // new pages.
      for (const [oldPageUrl, oldPage] of Object.entries(oldPages)) {
        try {
          const pageImg = await imgLoader.loadImage(oldPageUrl);
          oldPage.forEach((filename) => {
            const info = oldFiles[filename];
            const thumbnail = info.thumbnail;
            const ctx = oldCtx;
            ctx.canvas.width = thumbnail.width;
            ctx.canvas.height = thumbnail.height;
            ctx.drawImage(
              pageImg,
              thumbnail.x, thumbnail.y, thumbnail.width, thumbnail.height,
              0, 0, thumbnail.width, thumbnail.height
            );
            newFileInfos[filename] = {
              ...info,
              thumbnail: addImageToPages(pages, baseFilename, cacheSuffix, filename, info, ctx.canvas),
            };
          });
          // not really sure what should happen here. Should I some how
          // store a map for urls to page filenames or just assume I can
          // convert?
          const filename = filenameFromUrl(oldPageUrl);
          fs.unlinkSync(filename);
        } catch (e) {
          logger('could not load old page:', oldPageUrl);
          // process the missing files
          oldPage.forEach((filename) => {
            filesToProcess[filename] = newFiles[filename];
          });
        }
      }
    }

    // for all the files that changed make a thumbnail and add it to
    // the page
    const imgPromises = Object.keys(filesToProcess).map((filename) => {
      const fileInfo = newFiles[filename];
      const p = thumbnailMaker(filename, fileInfo.type)
        .then((thndl) => {
          const newInfo = Object.assign(fileInfo, thndl.info);
          // The observer must use the canvas IMMEDIATELY.
          try {
            thumbnailObserver(newInfo, thndl.canvas);
            newFileInfos[filename] = {
              ...newInfo,
              thumbnail: addImageToPages(pages, baseFilename, cacheSuffix, filename, newInfo, thndl.canvas),
            };
          } finally {
            thndl.release();
          }
        })
        .catch(() => {
          newFileInfos[filename] = {bad: true, ...fileInfo};
        });
      return p;
    });

    await Promise.all(imgPromises);
    writePages(pages, baseFilename);
    return newFileInfos;
  };

  function writePage(page, ndx, baseFilename) {
    const dataUrl = page.ctx.canvas.toDataURL();
    const uu = dataUrl.substring('data:image/png;base64,'.length);
    const filename = `${baseFilename}_${ndx}.png`;
    logger('write:', filename);
    fs.writeFileSync(filename, uu, 'base64');
    put2DContext(page.ctx);
    page.ctx = null;
  }

  function writePages(pages, baseFilename) {
    logger('write pages: num pages:', pages.length);
    pages.forEach((page, ndx) => {
      writePage(page, ndx, baseFilename);
    });
  }

  function get2DContext() {
    if (twoDContexts.length) {
      return twoDContexts.pop();
    } else {
      return context2DFactory();
    }
  }

  function put2DContext(ctx) {
    ctx.canvas.width = 1;
    ctx.canvas.height = 1;
    twoDContexts.push(ctx);
  }

  function getExistingPageForNewThumbnail(pages, thumbnailHeight) {
    for (let ii = 0; ii < pages.length; ++ii) {
      // TODO: use reduce
      const page = pages[ii];
      let shortest = page.columns[0];
      page.columns.forEach((column) => {
        if (column.bottom < shortest.bottom) {
          shortest = column;
        }
      });
      if (page.ctx.canvas.height - shortest.bottom >= thumbnailHeight) {
        return {
          page: page,
          column: shortest,
        };
      }
    }
    return undefined;
  }

  function getPageForNewThumbnail(pages, baseFilename, thumbnailHeight) {
    let pageColumnPair = getExistingPageForNewThumbnail(pages, thumbnailHeight);
    if (!pageColumnPair) {
      const page = createPage();
      page.filename = `${baseFilename}_${pages.length}.png`;
      page.url = urlFromFilename(page.filename);
      pages.push(page);
      pageColumnPair = {
        page: page,
        column: page.columns[0],
      };
    }
    return pageColumnPair;
  }

  function createPage() {
    const ctx = get2DContext();
    ctx.canvas.width = pageSize;
    ctx.canvas.height = pageSize;
    const page = {
      columns: [],
      ctx: ctx,
    };
    const numColumns = ctx.canvas.width / thumbnailWidth | 0;
    for (let ii = 0; ii < numColumns; ++ii) {
      page.columns.push({
        ndx: ii,
        bottom: 0,
      });
    }
    return page;
  }

  function addImageToPages(pages, baseFilename, cacheSuffix, filename, info, canvas) {
    const pageColumnPair = getPageForNewThumbnail(pages, baseFilename, canvas.height);
    const page = pageColumnPair.page;
    const column = pageColumnPair.column;
    const x = column.ndx * thumbnailWidth;
    const y = column.bottom;
    logger('addImage:', filename, x, y);
    page.ctx.drawImage(canvas, x, y);
    column.bottom += canvas.height;
    return {
      x: x,
      y: y,
      width: canvas.width,
      height: canvas.height,
      url: page.url + cacheSuffix,
      pageSize: pageSize,
    };
  }
}

export {
  createThumbnailPageMaker as default,
};
