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

import {ipcRenderer} from 'electron'; // eslint-disable-line
import {remote} from 'electron';  // eslint-disable-line
import otherWindowIPC from 'other-window-ipc';
import fs from 'graceful-fs';
import path from 'path';
import _ from 'lodash';
import * as happyfuntimes from 'happyfuntimes';

import createLimitedResourceManager from '../../lib/limited-resource-manager';
import createMediaLoader from './media-loader';
import createThumbnailMaker from './thumbnail-maker';
import createThumbnailPageMaker from './thumbnail-page-maker';
import ThumbnailManager from './thumbnail-manager';
import ThumbnailRenderer from './thumbnail-renderer';
import appdata from '../../lib/appdata';
import debug from '../../lib/debug';
import * as sizing from '../../lib/sizing';
import * as utils from '../../lib/utils';
import MediaManagerServer from './media-manager-server';
import ImageLoader from './image-loader';
import WatcherManager from '../../lib/watcher/watcher-manager';
import createThrottledReaddir from '../../lib/readdir-throttler';
import stacktraceLog from '../../lib/stacktrace-log'; // eslint-disable-line
import '../../lib/title';

const {windowTrackerIsAnyWindowFullScreen} = remote.require('./out/js/lib/remote-helpers');

function start(args) {
  const log = debug('Thumber');
  log('start');
  const g = {
    dataDir: args.userDataDir ? args.userDataDir : path.join(appdata.localAppDataDir, 'MoPho-V'),
    maxParallelDownloads: 4,
    maxSeekTime: 30,
    // TODO: fix
    maxWidth: 256,
    thumbCtx: document.querySelector('canvas').getContext('2d'),
    visible: false,
    window: remote.getCurrentWindow(),
    hideTimeoutDuration: 5000,  // 5 seconds
  };

  const hide = _.debounce(() => {
    if (g.visible) {
      g.visible = false;
      g.window.hide();
    }
  }, g.hideTimeoutDuration);

  function clearProgressImage() {
    const ctx = g.thumbCtx;
    const dstWidth = ctx.canvas.width;
    const dstHeight = ctx.canvas.height;
    ctx.clearRect(0, 0, dstWidth, dstHeight);
  }

  function show() {
    if (!g.visible && g.prefs && g.prefs.misc.showThumber && !windowTrackerIsAnyWindowFullScreen()) {
      g.visible = true;
      g.window.showInactive();
    }
    hide();  // works because this is debounced
  }

  function drawProgressImage(info, canvas) {
    const ctx = g.thumbCtx;
    utils.resizeCanvasToDisplaySize(ctx.canvas, window.devicePixelRatio);
    clearProgressImage();
    const dstWidth = ctx.canvas.width;
    const dstHeight = ctx.canvas.height;
    const size = sizing.stretch(info.width, info.height, dstWidth, dstHeight);
    ctx.drawImage(
      canvas,
      (dstWidth - size.width) / 2,
      (dstHeight - size.height) / 2,
      size.width,
      size.height
    );
    show();
  }

  function make2DContext(...args) {
    return document.createElement('canvas').getContext('2d', ...args);
  }

  g.watcherManager = new WatcherManager();
  function createWatcher(filepath) {
    return g.watcherManager.watch(filepath);
  }

  const thumbnailRendererMgr = createLimitedResourceManager([new ThumbnailRenderer(document.createElement('canvas').getContext('2d'))]);
  const loaders = [];
  for (let ii = 0; ii < g.maxParallelDownloads; ++ii) {
    loaders.push(createMediaLoader({
      maxSeekTime: g.maxSeekTime,
    }));
  }

  fs.readdir = createThrottledReaddir(fs.readdir.bind(fs), args.maxParallelReaddirs, args.readdirsThrottleDuration);

  const thumbnailMaker = createThumbnailMaker({
    maxWidth: g.maxWidth,
    mediaLoaderManager: createLimitedResourceManager(loaders),
    thumbnailRendererManager: thumbnailRendererMgr,
  });
  g.thumbnailPageMaker = createThumbnailPageMaker({
    thumbnailMaker: thumbnailMaker,
    thumbnailWidth: g.maxWidth,
    pageSize: 2048,
    fs: fs,
    context2DFactory: make2DContext,
    imgLoader: new ImageLoader(),
    thumbnailObserver: drawProgressImage,
  });
  g.thumbnailPageMakerManager = createLimitedResourceManager([
    g.thumbnailPageMaker,
  ]);

  g.thumbnailManager = new ThumbnailManager({
    dataDir: g.dataDir,
    thumbnailPageMakerManager: g.thumbnailPageMakerManager,
    fs: fs,
    watcherFactory: createWatcher,
  });
  const updateFilesEventForwarder = makeEventForwarder('updateFiles');
  g.thumbnailManager.on('updateFiles', (folders, ...args) => {
    updateFilesEventForwarder(folders, ...args);
    hftServer.broadcastCmd('updateFiles', prepFoldersForBrowser(folders));
  });

  function updatePrefs(prefs) {
    g.prefs = prefs;
    const isPrefs = !args._.length;
    const dirs = isPrefs ? prefs.folders : args._;
    g.dirsToPrefixMap = Object.entries(utils.dirsToPrefixMap(dirs)).sort((a, b) => {
      return Math.sign(b.length - a.length);
    });
    g.thumbnailManager.setFolders(utils.removeChildFolders(utils.filterNonExistingDirs(dirs)), isPrefs);
  }

  function pathToPrefx(path) {
    for (const [dir, prefix] of g.dirsToPrefixMap) {
      if (path.startsWith(dir)) {
        return `/${prefix}${path.substring(dir.length)}`;
      }
    }
    return path;
  }

  function prepFoldersForBrowser(folders) {
    const preppedFolders = {};
    for (const [folderName, folder] of Object.entries(folders)) {
      const f = _.cloneDeep(folder);
      for (const [fileName, file] of Object.entries(f.files)) {
        if (file.thumbnail && file.thumbnail.url && file.thumbnail.url.startsWith(g.dataDir)) {
          file.thumbnail.url = `/user-data-dir${file.thumbnail.url.substring(g.dataDir.length)}`;
        }
        if (!file.url) {
          file.url = pathToPrefx(fileName);
        }
      }
      preppedFolders[folderName] = f;
    }
    return preppedFolders;
  }

  otherWindowIPC.createChannelStream('prefs')
    .then((stream) => {
      g.prefsStream = stream;
      g.prefsStream.on('prefs', updatePrefs);
    })
    .catch((err) => {
      console.error(err);
      if (err.stack) {
        console.error(err.stack);
      }
    });

  const targets = [];
  const hftServer = new happyfuntimes.GameServer({
    url: `ws://localhost:${args.port}`,
  });

  function makeEventForwarder(eventName) {
    return (...argss) => {
      log('send:', eventName, 'to', targets.length, 'targets');
      targets.forEach((target) => {
        target.send(eventName, ...argss);
      });
    };
  }

  g.mediaManagerServer = new MediaManagerServer();

  g.channel = otherWindowIPC.createChannel('thumber');
  g.channel.on('connect', (stream) => {
    log('connect');
    targets.push(stream);
    stream.on('disconnect', () => {
      const ndx = targets.indexOf(stream);
      if (ndx < 0) {
        throw new Error('unknown stream');
      }
      targets.splice(ndx, 1);
    });
    stream.on('refreshFolder', (folderName) => {
      g.thumbnailManager.refreshFolder(folderName);
    });
    g.thumbnailManager.sendAll(stream);
  });
  window.addEventListener('beforeunload', () => {
    targets.slice().forEach((target) => {
      target.close();
    });
    g.channel.close();
    g.mediaManagerServer.close();
    g.watcherManager.close();
  });

  hftServer.on('playerconnect', (netPlayer) => {
    netPlayer.on('disconnect', () => {});
    const hftStream = {
      send(cmd, folders) {
        netPlayer.sendCmd(cmd, prepFoldersForBrowser(folders));
      },
    };

    g.thumbnailManager.sendAll(hftStream);
  });
}

ipcRenderer.on('start', (event, args) => {
  setTimeout(() => {
    start(args);
  }, 500);
});
ipcRenderer.send('start');
