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

import sinon from 'sinon';
import {assert} from 'chai';
import createThumbnailPageMaker from './thumbnail-page-maker';
import bind from '../../lib/bind';
import {getDifferentFilenames, getObjectsByKeys} from '../../lib/utils';

// I'm not actually sure what to test here.
//
// I feel like maybe I should break up ThumbnailPageMaker
// Extract out the part that decides when to make a new page
// and where on that page to put a thumbnail. Then can test tat
// Extract out the part that copies images from old pages?
// but that part is pretty straight forward and uses the page making
// part.
//
// Finally there this part but it seems all I can test is that it made
// page and/or deleted old pages. Actually checking where it put
// thumbnails seems like a bad test. Maybe I could make different
// colored images and then read through the image to see they actually
// got placed? But that would require a real canvas API.
// Could try to remember where each one goes in the fake canvas API
// and if not checking positions at least check that the images I expect
// to get drawn get draw?
//
// In other words given remove, changed, added, same as inputs
// same, changed, and added should all get drawn. Same's source should
// be the page wherea added and changed source should be original.
// Could check that

describe('ThumbnailPageMaker', () => {
  const baseFilename = 'foo/bar/moo';

  function createNewFiles(files, filenames) {
    filenames = filenames || Object.keys(files);
    const newFiles = {};
    filenames.forEach((filename) => {
      const info = files[filename];
      newFiles[filename] = {
        type: info.type,
      };
    });
    return newFiles;
  }

  function makeMockFileSystem() {
    return {
      writeFileSync: sinon.stub(),
      unlinkSync: sinon.stub(),
    };
  }

  // This is for when we reload old pages of thumbnails
  function makeMockImageLoader(files, filenames) {
    filenames = filenames || Object.keys(files);
    const pages = {};
    filenames.forEach((filename) => {
      const info = files[filename];
      const thumbnail = info.thumbnail;
      if (thumbnail && thumbnail.url) {
        pages[thumbnail.url] = true;
      }
    });
    const imgLoaderStub = sinon.stub();
    Object.keys(pages).forEach((filename, ndx) => {
      imgLoaderStub.onCall(ndx).resolves({width: 123, height: 456});
    });

    return {
      loadImage: imgLoaderStub,
    };
  }

  function makeContext2D() {
    return {
      canvas: {
        width: 300,
        height: 150,
        toDataURL: sinon.stub().returns('data:image/png;base64,aGVsbG8='),
      },
      drawImage: sinon.stub(),
    };
  }

  function makeMockThubmnailMaker(files, filenames) {
    filenames = filenames || Object.keys(files);

    const release = sinon.spy();
    const maker = sinon.stub().callsFake((filename /* , fileInfo */) => {
      const ndx = filenames.indexOf(filename);
      if (ndx < 0) {
        throw new Error(`request for disallowed file: ${filename}`);
      }
      filenames.splice(ndx, 1);
      const info = files[filename];
      if (info.fail) {
        return Promise.reject(new Error('dummyElement'));
      }
      return Promise.resolve({
        release: release,
        info,
        canvas: {
          foo: 'fake canvas',
          width: info.thumbnail.width,
          height: info.thumbnail.height,
        },
      });
    });

    return { release, maker };
  }

  class Context2DManager {
    constructor() {
      this.contexts = [];
      bind(
        this,
        'createContext',
      );
    }
    createContext() {
      const ctx = makeContext2D();
      this.contexts.push(ctx);
      return ctx;
    }
  }

  /**
   * @typedef {OBject} ThumbnailInfo
   * @property {number} x position of thumbnail on page
   * @property {number} y position of thumbnail on page
   * @property {number} width width thumbnail. Default is thumbnailWidth
   * @property {number} height height of thumbnail. Default is proportional to width
   * @property {number} url url of page this is on
   */

  /**
   * @typedef {Object} FileInfo
   * @property {string} type mimetype. defaults to image/jpeg
   * @property {number} orientation exif orientation. defaults to 0
   * @property {number} width width of image, default 512
   * @property {number} height height of image, default 512
   * @property {ThumbnailInfo} thumbnail
   */

  /**
   * Generate file data for testing
   * @param {Object.<string, FileInfo>} files filenames to fileinfo map
   * @param {number} thumbnailWidth width of a thumbnail
   */
  function prepFiles(files, thumbnailWidth) {
    const newFiles = JSON.parse(JSON.stringify(files));
    Object.keys(newFiles).forEach((filename) => {
      const info = newFiles[filename];
      info.type = info.type || 'image/jpeg';
      info.width = info.width || 512;
      info.height = info.height || 512;
      info.orientation = info.orientation || 0;
      const thumbnail = info.thumbnail || {};
      info.thumbnail = thumbnail;
      thumbnail.x = thumbnail.x || 0;
      thumbnail.y = thumbnail.y || 0;
      thumbnail.width = thumbnail.width || thumbnailWidth;
      thumbnail.height = thumbnail.height || info.height * thumbnailWidth / info.width | 0;
    });
    return newFiles;
  }

  /**
   * @typedef {Object} TPMOptions
   * @property {number} thumbnailWidth: width of a thumbnail
   * @property {number} pageSize size to make a page pageSize x pageSize
   * @property {Object.<string, FileInfo>} files object of files. see prepFiles
   * @property {string[]} [newFilenames] names of new files from files, default all
   * @property {string[]} [oldFilenames] names of old files from files, default none
   * @property {ImageLoader} [imageLoader] an image loader to use, default mockImageLoader
   * @property {string[]} thumbnailFilenames thumbnails to pretend load. default is added and changed files based on new and old
   */

  /**
   * @param {TPMOptions} options
   * @param {function(Object.<string, FileInfo>, TPMResults)} callback
   */
  async function testThumbnailPageMaker(options) {
    const thumbnailWidth = options.thumbnailWidth;
    const pageSize = options.pageSize;
    const files = prepFiles(options.files, thumbnailWidth);

    const oldFiles = getObjectsByKeys(files, options.oldFilenames || []);
    const newFiles = createNewFiles(files, options.newFilenames);

    const diffNames = getDifferentFilenames(oldFiles, newFiles);

    const mockImageLoader = makeMockImageLoader(files, diffNames.same);
    const mockThumbnailMaker = makeMockThubmnailMaker(files, options.thumbnailFilenames || [...diffNames.added, ...diffNames.changed]);
    const mockFS = makeMockFileSystem();
    const ctxManager = new Context2DManager();
    const thumbnailObserver = sinon.spy();

    const tPMaker = createThumbnailPageMaker({
      thumbnailMaker: mockThumbnailMaker.maker,
      thumbnailWidth: thumbnailWidth,
      pageSize: pageSize,
      context2DFactory: ctxManager.createContext,
      fs: mockFS,
      imgLoader: options.imageLoader || mockImageLoader,
      thumbnailObserver: thumbnailObserver,
    });

    const tFiles = await tPMaker(baseFilename, oldFiles, newFiles);
    return {
      tFiles,
      mockThumbnailMaker,
      mockImageLoader,
      mockFS,
      ctxManager,
      thumbnailObserver,
    };
  }

  function dumpInfo(r) {  // eslint-disable-line
    console.log('thumbMaker.addUrl callCount', r.mockThumbnailMaker.addUrl.callCount);
    console.log('imgLoaderStub callCount', r.mockImageLoader.loadImage.callCount);
    console.log('unlinkStub callCount', r.mockFS.unlinkSync.callCount);
    console.log('writeFileStub callCount', r.mockFS.writeFileSync.callCount);
    console.log('numContexts:', r.ctxManager.contexts.length);
    const thumbCtx = r.ctxManager.contexts[0];
    console.log('thumbCtx.drawImage callCount', thumbCtx.drawImage.callCount);
    const page0Ctx = r.ctxManager.contexts[1];
    console.log('page0Ctx.drawImage callcount', page0Ctx.drawImage.callCount);
    page0Ctx.drawImage.getCalls().forEach((call, ndx) => {
      console.log(ndx, ...call.args);
    });
  }

  it('makes a page', async () => {
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 450,
      files: {
        'abc.jpg': {},
        'def.jpg': {},
        'ghi.jpg': {},
      },
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 3, '3 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 3, '3 thumbnails observed');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 1, 'writes one page');
  });

  it('makes 3 pages', async () => {
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 200,
      files: {
        'abc.jpg': {},
        'def.jpg': {},
        'ghi.jpg': {},
      },
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 3, '3 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 3, '3 thumbnails observed');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 3, 'writes 3 pages');
  });

  it('remakes a page', async () => {
    const files = {
      'abc.jpg': { thumbnail: { url: 'page1', x:   0, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'def.jpg': { thumbnail: { url: 'page1', x: 150, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'ghi.jpg': { thumbnail: { url: 'page1', x: 300, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
    };
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 450,
      files: files,
      oldFilenames: Object.keys(files),
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 0, '0 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 0, '0 thumbnails observed');
    assert.strictEqual(r.mockFS.unlinkSync.callCount, 1, 'deletes one page');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 1, 'writes one page');
  });

  it('remakes 3 pages', async () => {
    const files = {
      'abc.jpg': { thumbnail: { url: 'page1', x:   0, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'def.jpg': { thumbnail: { url: 'page2', x: 150, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'ghi.jpg': { thumbnail: { url: 'page3', x: 300, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
    };
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 200,
      files: files,
      oldFilenames: Object.keys(files),
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 0, '0 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 0, '0 thumbnails observed');
    assert.strictEqual(r.mockFS.unlinkSync.callCount, 3, 'deletes 3 pages');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 3, 'writes 3 pages');
  });

  it('delete 3 pages makes 1', async () => {
    const files = {
      'abc.jpg': { thumbnail: { url: 'page1', x:   0, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'def.jpg': { thumbnail: { url: 'page2', x: 150, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'ghi.jpg': { thumbnail: { url: 'page3', x: 300, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
    };
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 450,
      files: files,
      oldFilenames: Object.keys(files),
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 0, '0 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 0, '0 thumbnails observed');
    assert.strictEqual(r.mockFS.unlinkSync.callCount, 3, 'deletes 3 pages');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 1, 'writes 1 pages');
    for (const fileInfo of Object.values(r.tFiles)) {
      assert.isTrue(fileInfo.thumbnail.url.indexOf('_0.png?') > 0);
    }
  });

  it('remakes a page with 2 old and 1 new file', async () => {
    const files = {
      'abc.jpg': { thumbnail: { url: 'page1', x:   0, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'def.jpg': { thumbnail: { url: 'page1', x: 150, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'ghi.jpg': { thumbnail: { url: 'page1', x: 300, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
    };
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 450,
      files: files,
      oldFilenames: Object.keys(files).slice(0, 2),
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 1, '1 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 1, '1 thumbnails observed');
    assert.strictEqual(r.mockFS.unlinkSync.callCount, 1, 'deletes one page');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 1, 'writes one page');
  });

  it('works if can not make a thumbnail', async () => {
    const files = {
      'abc.jpg': {},
      'def.jpg': { fail: true },
      'ghi.jpg': {},
    };
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 450,
      files: files,
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 2, '2 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 2, '2 thumbnails observed');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 1, 'writes one page');
    for (const [filename, fileInfo] of Object.entries(r.tFiles)) {
      const expected = files[filename];
      if (expected.fail) {
        assert.isOk(fileInfo.bad);
      } else {
        assert.isNotOk(fileInfo.bad);
      }
    }
  });

  it('remakes thumbnails if can not load page', async () => {
    const files = {
      'abc.jpg': { thumbnail: { url: 'page1', x:   0, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'def.jpg': { thumbnail: { url: 'page1', x: 150, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
      'ghi.jpg': { thumbnail: { url: 'page1', x: 300, y: 0, width: 150, height: 150, }, }, // eslint-disable-line
    };
    const r = await testThumbnailPageMaker({
      thumbnailWidth: 150,
      pageSize: 450,
      files: files,
      oldFilenames: Object.keys(files),
      // need to pass because by looking at old and new no files would
      // be loaded. But, because we are testing the old page png can't
      // be loaded these file should get loaded.
      thumbnailFilenames: Object.keys(files),
      imageLoader: {
        loadImage: sinon.stub().rejects(new Error('fake image load fail')),
      },
    });
    assert.strictEqual(r.mockThumbnailMaker.release.callCount, 3, '3 thumbnails made');
    assert.strictEqual(r.thumbnailObserver.callCount, 3, '3 thumbnails observed');
    assert.strictEqual(r.mockFS.unlinkSync.callCount, 0, 'deletes no page');
    assert.strictEqual(r.mockFS.writeFileSync.callCount, 1, 'writes one page');
  });
});
