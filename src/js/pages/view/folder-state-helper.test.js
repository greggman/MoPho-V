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

import {assert} from 'chai';
import {FolderStateHelper} from './folder-state-helper';

function getFolderNames(folders) {
  return folders.map((folder) => {
    return folder.filename;
  });
}

function getFileNames(files) {
  return files.map((file) => {
    return file.name;
  });
}

describe('FolderStateHelper', () => {
  it('sorts by full path all at once', () => {
    const root = FolderStateHelper.createRoot('sortPath');
    FolderStateHelper.updateFolders(root, {
      'b/a': { files: { 'b/a/e': {}, 'b/a/f': {}, 'b/a/d': {}, }},
      'c/a': { files: { 'c/a/f': {}, 'c/a/d': {}, 'c/a/e': {}, }},
      'a/a': { files: { 'a/a/d': {}, 'a/a/f': {}, 'a/a/e': {}, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['a/a', 'b/a', 'c/a']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['a/a/d', 'a/a/e', 'a/a/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['b/a/d', 'b/a/e', 'b/a/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['c/a/d', 'c/a/e', 'c/a/f']);
  });

  it('sorts by full path a little at a time', () => {
    const root = FolderStateHelper.createRoot('sortPath');
    FolderStateHelper.updateFolders(root, {
      'b/a': { files: { 'b/a/e': {}, 'b/a/f': {}, 'b/a/d': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'c/a': { files: { 'c/a/f': {}, 'c/a/d': {}, 'c/a/e': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'a/a': { files: { 'a/a/d': {}, 'a/a/f': {}, 'a/a/e': {}, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['a/a', 'b/a', 'c/a']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['a/a/d', 'a/a/e', 'a/a/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['b/a/d', 'b/a/e', 'b/a/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['c/a/d', 'c/a/e', 'c/a/f']);
  });

  it('sorts by full path on update', () => {
    const root = FolderStateHelper.createRoot('sortPath');
    FolderStateHelper.updateFolders(root, {
      'b/a': { files: { 'b/a/e': {}, 'b/a/f': {}, 'b/a/d': {}, }},
      'c/a': { files: { 'c/a/f': {}, 'c/a/d': {}, 'c/a/e': {}, }},
      'a/a': { files: { 'a/a/d': {}, 'a/a/f': {}, 'a/a/e': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'b/a': { files: { 'b/a/e': {}, 'b/a/f': {}, 'b/a/d': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'c/a': { files: { 'c/a/f': {}, 'c/a/d': {}, 'c/a/e': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'a/a': { files: { 'a/a/d': {}, 'a/a/f': {}, 'a/a/e': {}, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['a/a', 'b/a', 'c/a']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['a/a/d', 'a/a/e', 'a/a/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['b/a/d', 'b/a/e', 'b/a/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['c/a/d', 'c/a/e', 'c/a/f']);
  });

  it('sorts by name all at once', () => {
    const root = FolderStateHelper.createRoot('sortName');
    FolderStateHelper.updateFolders(root, {
      'b/z': { files: { 'b/z/e': {}, 'b/z/f': {}, 'b/z/d': {}, }},
      'c/x': { files: { 'c/x/f': {}, 'c/x/d': {}, 'c/x/e': {}, }},
      'a/y': { files: { 'a/y/d': {}, 'a/y/f': {}, 'a/y/e': {}, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['c/x', 'a/y', 'b/z']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['c/x/d', 'c/x/e', 'c/x/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['a/y/d', 'a/y/e', 'a/y/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['b/z/d', 'b/z/e', 'b/z/f']);
  });

  it('sorts by name a little at a time', () => {
    const root = FolderStateHelper.createRoot('sortName');
    FolderStateHelper.updateFolders(root, {
      'b/z': { files: { 'b/z/e': {}, 'b/z/f': {}, 'b/z/d': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'c/x': { files: { 'c/x/f': {}, 'c/x/d': {}, 'c/x/e': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'a/y': { files: { 'a/y/d': {}, 'a/y/f': {}, 'a/y/e': {}, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['c/x', 'a/y', 'b/z']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['c/x/d', 'c/x/e', 'c/x/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['a/y/d', 'a/y/e', 'a/y/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['b/z/d', 'b/z/e', 'b/z/f']);
  });

  it('sorts by name on update', () => {
    const root = FolderStateHelper.createRoot('sortName');
    FolderStateHelper.updateFolders(root, {
      'b/z': { files: { 'b/z/e': {}, 'b/z/f': {}, 'b/z/d': {}, }},
      'c/x': { files: { 'c/x/f': {}, 'c/x/d': {}, 'c/x/e': {}, }},
      'a/y': { files: { 'a/y/d': {}, 'a/y/f': {}, 'a/y/e': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'b/z': { files: { 'b/z/e': {}, 'b/z/f': {}, 'b/z/d': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'c/x': { files: { 'c/x/f': {}, 'c/x/d': {}, 'c/x/e': {}, }},
    });
    FolderStateHelper.updateFolders(root, {
      'a/y': { files: { 'a/y/d': {}, 'a/y/f': {}, 'a/y/e': {}, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['c/x', 'a/y', 'b/z']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['c/x/d', 'c/x/e', 'c/x/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['a/y/d', 'a/y/e', 'a/y/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['b/z/d', 'b/z/e', 'b/z/f']);
  });

  it('sorts by date all at once', () => {
    const root = FolderStateHelper.createRoot('newest');
    FolderStateHelper.updateFolders(root, {
      'b/z': { files: { 'b/z/e': { mtime: 9, }, 'b/z/f': { mtime: 7, }, 'b/z/d': { mtime: 8, }, }},
      'a/y': { files: { 'a/y/d': { mtime: 1, }, 'a/y/f': { mtime: 3, }, 'a/y/e': { mtime: 2, }, }},
      'c/x': { files: { 'c/x/f': { mtime: 5, }, 'c/x/d': { mtime: 4, }, 'c/x/e': { mtime: 6, }, }},
    });
    assert.strictEqual(root.totalFiles, 9);
    assert.sameOrderedMembers(getFolderNames(root.folders), ['b/z', 'c/x', 'a/y']);
    assert.strictEqual(root.folders.length, 3);
    assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['b/z/e', 'b/z/d', 'b/z/f']);
    assert.sameOrderedMembers(getFileNames(root.folders[1].files), ['c/x/e', 'c/x/f', 'c/x/d']);
    assert.sameOrderedMembers(getFileNames(root.folders[2].files), ['a/y/f', 'a/y/e', 'a/y/d']);
  });

  it('sorts by numbers', () => {
    {
      const root = FolderStateHelper.createRoot('sortPath');
      FolderStateHelper.updateFolders(root, {
        'a': { files: { 'a/e-3': {}, 'a/e-01': {}, 'a/e-002': {}, }},
      });
      assert.strictEqual(root.totalFiles, 3);
      assert.strictEqual(root.folders.length, 1);
      assert.sameOrderedMembers(getFileNames(root.folders[0].files), ['a/e-01', 'a/e-002', 'a/e-3']);
    }
    {
      const root = FolderStateHelper.createRoot('sortPath');
      FolderStateHelper.updateFolders(root, {
        'a/e-3': { files: { 'a/e-3/b': {} }},
        'a/e-01': { files: { 'a/e-01/b': {} }},
        'a/e-002': { files: { 'a/e-002/b': {}, }},
      });
      assert.strictEqual(root.totalFiles, 3);
      assert.strictEqual(root.folders.length, 3);
      assert.sameOrderedMembers(getFolderNames(root.folders), ['a/e-01', 'a/e-002', 'a/e-3']);
    }
  });
});

