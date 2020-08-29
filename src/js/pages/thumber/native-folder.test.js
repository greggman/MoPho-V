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

import EventEmitter from 'events';
import sinon from 'sinon';
import {assert} from 'chai';
import NativeFolder from './native-folder';
import wait from './../../lib/wait';

describe('NativeFolder', () => {
  function createFolderData(baseFilename, files) {
    return {
      files: files || {},
      baseFilename: baseFilename,
      deleteData: sinon.spy(),
      addFiles: function addFiles(files) {
        Object.assign(this.files, files);
      },
      removeFiles: function removeFiles(filenames) {
        for (const filename of filenames) {
          delete this.files[filename];
        }
      },
      setScannedTime() {
      },
    };
  }

  function setupNativeFolder(files, folders, archives) {
    // just emits 'files' with Object.<string, FileInfo>
    const watcher = new EventEmitter();
    watcher.close = sinon.spy();

    const folderData = createFolderData(
      'root',
      {...files, ...folders, ...archives},
    );
    const thumbnailPageMaker = sinon.stub();

    const folder = new NativeFolder('foo', {
      watcher: watcher,
      thumbnailPageMakerFn: thumbnailPageMaker,
      folderData: folderData,
    });

    const updateFiles = sinon.spy();
    folder.on('updateFiles', updateFiles);
    const updateFolders = sinon.spy();
    folder.on('updateFolders', updateFolders);
    const updateArchives = sinon.spy();
    folder.on('updateArchives', updateArchives);

    return {
      folder,
      watcher,
      thumbnailPageMaker,
      folderData,
      updateFiles,
      updateFolders,
      updateArchives,
    };
  }

  it('inits', async () => {
    const testFiles = {
      'test.png': { type: 'image/png', },
    };
    const testFolders = {
      'subFolder': {  isDirectory: true, },
    };
    const testArchives = {
      'test.zip': {},
    };
    const nf = setupNativeFolder(testFiles, testFolders, testArchives);

    await wait();

    assert.strictEqual(nf.updateFiles.callCount, 1);
    assert.deepEqual(nf.updateFiles.lastCall.args[1].files, testFiles, 'one file');
    assert.strictEqual(nf.updateFolders.callCount, 1);
    assert.deepEqual(nf.updateFolders.lastCall.args[1], testFolders, 'one folder');
    assert.strictEqual(nf.updateArchives.callCount, 1);
    assert.deepEqual(nf.updateArchives.lastCall.args[1], testArchives, 'one archive');
    assert.deepEqual(nf.updateArchives.lastCall.args[2], [], 'no archives need updating');
    assert.strictEqual(nf.thumbnailPageMaker.callCount, 0, 'no thumbnails created');

    assert.strictEqual(nf.folderData.deleteData.callCount, 0);
    nf.folder.deleteData();
    assert.strictEqual(nf.folderData.deleteData.callCount, 1);
  });

  it('makes thumbnails and updates', async () => {
    const oldFiles = {
      'test.png': { type: 'image/png', },
    };
    const nf = setupNativeFolder(oldFiles, {}, {});

    await wait();

    assert.strictEqual(nf.updateFiles.callCount, 1);
    const thumbnailFiles = {
      'one.jpg': { type: 'image/jpeg', thumbnail: { url: 'foo1', }, },
      'two.png': { type: 'image/png', thumbnail: { url: 'foo2', }, },
    };
    nf.thumbnailPageMaker.resolves(thumbnailFiles);
    nf.watcher.emit('files', {
      'one.jpg': { },
      'two.png': { },
      'three.txt': { },
    });
    const newFiles = {
      'one.jpg': {  },
      'two.png': {  },
    };

    await wait();
    await wait();
    await wait();

    assert.strictEqual(nf.thumbnailPageMaker.callCount, 1, 'thumbnails created');
    assert.deepEqual(nf.thumbnailPageMaker.lastCall.args[0], oldFiles, 'old files');
    assert.deepEqual(nf.thumbnailPageMaker.lastCall.args[1], newFiles, 'new files');
    assert.isAtLeast(nf.updateFiles.callCount, 3);
    assert.deepEqual(nf.updateFiles.lastCall.args[1].files, thumbnailFiles, 'thumbnail files');
  });
});
