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

/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */

import path from 'path';
import {assert} from 'chai';
import WatcherManager from './watcher-manager';
import TestFS from '../test/test-fs';
import {emitSpy} from '../test/test-utils';

describe('WatcherManager', function () {
  this.timeout(25000);
  let testFS;
  let watcherManager;
  let watchers = [];

  function makeWatcher(filepath) {
    const watcher = watcherManager.watch(filepath);
    watchers.push(watcher);
    return watcher;
  }

  beforeEach(() => {
    testFS = new TestFS();
    watcherManager = new WatcherManager();
  });

  afterEach(() => {
    watchers.forEach((watcher) => {
      watcher.close();
    });
    watchers = [];
    watcherManager.close();
    watcherManager = undefined;
    testFS.close();
    testFS = undefined;
  });

  it('notices changes', async () => {
    const fs = testFS;
    const watcher = makeWatcher(testFS.baseFilename);

    const start = emitSpy(); // 'start:');
    const create = emitSpy(); // 'create:');
    const change = emitSpy(); // 'change:');
    const remove = emitSpy(); // 'remove:');
    watcher.on('start', start);
    watcher.on('create', create);
    watcher.on('change', change);
    watcher.on('remove', remove);

    await start.wait();

    const testpath = path.join(fs.baseFilename, 'test.txt');
    fs.writeFileSync(testpath, 'foo');

    // this is not a good test since unless we give it more time
    // we have no idea if extra events come through?
    await create.wait();

    assert.strictEqual(create.spy.callCount, 1, 'file created');
    assert.strictEqual(change.spy.callCount, 0, 'file not changed');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted');

    fs.writeFileSync(testpath, 'bar');

    await change.wait();

    assert.strictEqual(create.spy.callCount, 1, 'file created');
    assert.strictEqual(change.spy.callCount, 1, 'file changed');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted');

    fs.unlinkSync(testpath, 'bar');

    await remove.wait();

    assert.strictEqual(create.spy.callCount, 1, 'file created');
    assert.strictEqual(change.spy.callCount, 1, 'file changed');
    assert.strictEqual(remove.spy.callCount, 1, 'file deleted');
  });

  it('notices subfolder creation but not subfolder activity', async () => {
    const fs = testFS;
    const watcher = makeWatcher(testFS.baseFilename);

    const start = emitSpy(); // 'start:');
    const create = emitSpy(); // 'create:');
    const change = emitSpy(); // 'change:');
    const remove = emitSpy(); // 'remove:');
    watcher.on('start', start);
    watcher.on('create', create);
    watcher.on('change', change);
    watcher.on('remove', remove);

    await start.wait();

    const parentDirname = path.join(fs.baseFilename, 'test');
    const dirname =  path.join(parentDirname, 'subtest');
    fs.mkdirSync(parentDirname);

    await create.wait();

    assert.isAtLeast(create.spy.callCount, 1, 'file created subfolder');
    assert.strictEqual(change.spy.callCount, 0, 'file not changed');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted');
    const expectedCreateCountAfterSubCreate = create.spy.callCount;

    const parentWatcher = makeWatcher(parentDirname);
    const parentStart = emitSpy(); // 'start:');
    const parentCreate = emitSpy(); // 'create:');
    const parentChange = emitSpy(); // 'change:');
    const parentRemove = emitSpy(); // 'remove:');
    parentWatcher.on('start', parentStart);
    parentWatcher.on('create', parentCreate);
    parentWatcher.on('change', parentChange);
    parentWatcher.on('remove', parentRemove);

    await parentStart.wait();

    fs.mkdirSync(dirname);
    await parentCreate.wait();

    assert.isAtLeast(create.spy.callCount, expectedCreateCountAfterSubCreate, 'file created subfolder2');
    assert.strictEqual(change.spy.callCount, 0, 'file not changed2');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted2');
    const expectedCreateCountAfterFileCreate = create.spy.callCount;

    const subWatcher = makeWatcher(dirname);
    const subStart = emitSpy(); // 'start:');
    const subCreate = emitSpy(); // 'create:');
    const subChange = emitSpy(); // 'change:');
    const subRemove = emitSpy(); // 'remove:');
    subWatcher.on('start', subStart);
    subWatcher.on('create', subCreate);
    subWatcher.on('change', subChange);
    subWatcher.on('remove', subRemove);

    await subStart.wait();

    const testpath = path.join(dirname, 'test.txt');
    fs.writeFileSync(testpath, 'foo');

    await subCreate.wait();

    assert.isAtLeast(create.spy.callCount, expectedCreateCountAfterFileCreate, '1 created');
    assert.strictEqual(change.spy.callCount, 0, 'file not changed');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted');
    const expectedCreateCountAfterFileUpdate = create.spy.callCount;

    fs.writeFileSync(testpath, 'bar');

    await subChange.wait();

    assert.strictEqual(create.spy.callCount, expectedCreateCountAfterFileUpdate, '1 file created');
    assert.strictEqual(change.spy.callCount, 0, 'file not changed after change');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted after change');

    fs.unlinkSync(testpath, 'bar');

    await subRemove.wait();

    assert.strictEqual(create.spy.callCount, expectedCreateCountAfterFileUpdate, '1 file created');
    assert.isAtLeast(change.spy.callCount, 0, 'file not changed after delete');
    assert.strictEqual(remove.spy.callCount, 0, 'file not deleted after delete');

    fs.rmdirSync(dirname);
    fs.rmdirSync(parentDirname);

    await remove.wait();

    assert.strictEqual(create.spy.callCount, expectedCreateCountAfterFileUpdate, '1 files created');
    assert.isAtLeast(change.spy.callCount, 0, 'no file changed after rmdir');
    assert.strictEqual(remove.spy.callCount, 1, '1 file deleted');
  });
});
