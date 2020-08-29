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
import fs from 'fs';
import makeOptions from 'optionator';
import electron from 'electron';  // eslint-disable-line
import 'other-window-ipc';
import debugFn from 'debug';
import * as happyfuntimes from 'happyfuntimes';
import * as express from 'express';

import {getUpdateCheckDate} from '../lib/update-manager';
import appdata from '../lib/appdata';
import * as utils from '../lib/utils';
import {loadPrefs} from '../pages/prefs/default-prefs';
import {
  isTitlebarOnAtLeastOneDisplay,
  putWindowOnNearestDisplay,
} from '../lib/window-restore-helper';
import listCacheFiles from './list-cache-files';
import compareFoldersToCache from './compare-folders-to-cache';

const {windowTrackerInit} = require('../lib/remote-helpers');
// import {windowTrackerInit} from '../../../src/js/lib/remote-helpers';

const debug = debugFn('main');
const isDevMode = process.env.NODE_ENV === 'development';
const isOSX = process.platform === 'darwin';

/* eslint-disable object-curly-newline */
const optionSpec = {
  options: [
    { option: 'help', alias: 'h', type: 'Boolean', description: 'displays help' },
    { option: 'user-data-dir', type: 'String', description: 'place to store app data for user', default: path.join(appdata.localAppDataDir, 'MoPho-V'), },
    { option: 'inspector', type: 'String', description: 'which windows to inspect', default: 'none', },
    { option: 'list-cache-files', type: 'Boolean', description: 'list the cache files', },
    { option: 'compare-folders-to-cache', type: 'Boolean', description: 'compare folders on disk to cache contents', },
    { option: 'delete-folder-data-if-no-files-for-archive', type: 'Boolean', description: 'delete folder data if no files for archive', },
    { option: 'max-parallel-readdirs', type: 'Int', default: '2', description: 'maximum parallel readdirs', },
    { option: 'readdirs-throttle-duration', type: 'Int', default: '0', description: 'amount to throttle readdir calls in milliseconds', },
  ],
  helpStyle: {
    typeSeparator: '=',
    descriptionSeparator: ' : ',
    initialIndent: 4,
  },
};
/* eslint-enable object-curly-newline */
const optionator = makeOptions(optionSpec);

let args;
try {
  args = optionator.parse(process.argv);
} catch (e) {
  console.error(e);
  printHelp();
}

function printHelp() {
  console.log(optionator.generateHelp());
  process.exit(0);  // eslint-disable-line
}

if (args.help) {
  printHelp();
}

function removeTrailingSlash(s) {
  return (s.endsWith('/') || s.endsWith('\\')) ? s.substring(s, s.length - 1) : s;
}

function normalizePaths(paths) {
  const newPaths = [];
  paths.forEach((dir) => {
    const tempPath = path.normalize(path.resolve(process.cwd(), removeTrailingSlash(dir)));
    try {
      newPaths.push(utils.getActualFilename(tempPath));
    } catch (e) {
      console.error(e.toString().split('\n')[0]);
    }
  });
  return newPaths;
}

args._ = normalizePaths(args._);
args.userDataDir = path.resolve(args.userDataDir);
if (!fs.existsSync(args.userDataDir)) {
  fs.mkdirSync(args.userDataDir);
}

if (args.listCacheFiles) {
  listCacheFiles(args.userDataDir);
  process.exit(0);
}

const progStateFilename = path.join(args.userDataDir, 'program-state.json');
const prefsFilename = path.join(args.userDataDir, 'prefs.json');
const inspectRE = new RegExp(args.inspector);
const app = electron.app;
const ipcMain = electron.ipcMain;
const shell = electron.shell;
const BrowserWindow = electron.BrowserWindow;
const windowInfosById = {};
const windows = [];
const oneOfAKindWindows = {};
let {prefs} = loadPrefs(prefsFilename, fs);
let oldProgState;
let hideInsteadOfCloseOneOffWindows = true;
let quitting = false;
let hftServer;
let router;
let oldEnableRendezvous = false;
const hftState = {};

if (args.compareFoldersToCache) {
  const baseFolders = args._ && args._.length > 0 ? args._ : prefs.folders;
  compareFoldersToCache(baseFolders, args);
  process.exit(0);
}

// this is quite the hack. Should probably
// move windows to other file
windowTrackerInit(windows);

ipcMain.on('start', (event) => {
  const windowInfo = getWindowInfo(event.sender) || {};
  event.sender.send('start', args, windowInfo.state);
});
ipcMain.on('openwindow', (event, windowName) => {
  switch (windowName) {
    case 'view':
      createWindow();
      break;
    case 'prefs':
      createPreferencesWindow();
      break;
    case 'help':
      createHelpWindow();
      break;
    case 'update':
      createUpdateWindow();
      break;
    default:
      console.error('unknown window name:', windowName);
      break;
  }
});
ipcMain.on('saveSplitLayout', (event, splitLayout) => {
  getWindowInfo(event.sender).state.layout = splitLayout;
});
ipcMain.on('saveWinState', (event, winState) => {
  getWindowInfo(event.sender).state.winState = winState;
});
ipcMain.on('getPassword', (event) => {
  event.sender.send('password', prefs.misc.password);
});
ipcMain.on('unlock', () => {
  // need to open other windows before closing passwordWindow
  // otherwise electron will quit.
  start();
  const passwordWindow = oneOfAKindWindows.password;
  passwordWindow.close();
});
ipcMain.on('setupMenus', setupMenus);
ipcMain.on('prefs', (event, prefs) => {
  updatePrefs(prefs);
});

const staticOptions = {
  fallthrough: true,
};

function setupFolderRouter() {
  router = new express.Router();
  router.use('/out', express.static(path.join(`${__dirname}/../../../out`), staticOptions));
  router.use('/user-data-dir', express.static(args.userDataDir, staticOptions));
  const isPrefs = !args._.length;
  const dirs = isPrefs ? prefs.folders : args._;
  const map = utils.dirsToPrefixMap(utils.filterNonExistingDirs(dirs));
  for (const [dir, prefix] of Object.entries(map)) {
    router.use(`/${prefix}`, express.static(dir, staticOptions));
  }
}

function updatePrefs(newPrefs) {
  prefs = newPrefs;

  setupFolderRouter();

  if (prefs.misc.enableWeb) {
    startHappyFunTimes();
  } else {
    stopHappyFunTimes();
  }
}

function routeDirs(...args) {
  router(...args);
}

// TODO: do this only if prefs, and respond to prefs updates to turn it off and change port?
function startHappyFunTimes() {
  if (hftServer) {
    if (oldEnableRendezvous === prefs.misc.enableRendezvous) {
      return;
    }
    stopHappyFunTimes();
  }

  oldEnableRendezvous =  prefs.misc.enableRendezvous;
  happyfuntimes.start({
    baseDir: path.join(`${__dirname}/../../../app`),
    privateServer: !prefs.misc.enableRendezvous,
  }).then((srv) => {
    hftServer = srv;
    hftServer.app.use(routeDirs);
    const ports = hftServer.ports;
    console.log('Listening on ports:', ports);
    hftState.ports = ports;
    hftState.port = ports[0];
    args.port = hftState.port;  // because we need to pass this to thumber?
  }).catch((err) => {
    console.error('error starting server:', err);
  });
}

function stopHappyFunTimes() {
  if (hftServer) {
    hftServer.close();
    hftServer = undefined;
  }
}

function getWindowInfo(webContents) {
  const ndx = windows.findIndex((window) => webContents === window.webContents);
  const window = windows[ndx];
  return window ? windowInfosById[window.id] : {};
}

const s_progStatVersion = 1;
const versionConverters = {
};

function loadProgramState() {
  let progStat = {
    windows: [],
  };
  try {
    const progStr = fs.readFileSync(progStateFilename, {encoding: 'utf8'});
    progStat = JSON.parse(progStr);
    while (progStat.version !== s_progStatVersion) {
      const converter = versionConverters[progStat.version];
      if (!converter) {
        throw new Error('bad version');
      }
      progStat = converter(progStat);
    }
  } catch (e) {
    //
  }
  let windows = progStat.windows;
  if (!windows.length) {
    windows = [{}];
  }
  oldProgState = progStat;

  windows.forEach((winState) => {
    let needMaximized = false;
    const winBounds = winState.bounds;
    if (winBounds && winBounds.width) {
      if (!isTitlebarOnAtLeastOneDisplay(winBounds)) {
        needMaximized = putWindowOnNearestDisplay(winBounds);
      }
    }
    const window = createWindow(undefined, winBounds);
    if (winState.maximized || needMaximized) {
      window.maximize();
    }
    if (winState.fullscreen) {
      window.setFullScreen(true);
    }
    windowInfosById[window.id].state = winState.state || {};
  });
}

function saveProgramState() {
  const progState = {
    version: s_progStatVersion,
    lastUpdateCheckDate: getUpdateCheckDate() || oldProgState && oldProgState.lastUpdateCheckDate,
    windows: windows.map((window) => ({
      maximized: window.isMaximized(),
      minimized: window.isMinimized(),
      fullscreen: window.isFullScreen(),
      bounds: window.getBounds(),
      state: windowInfosById[window.id].state,
    })),
  };
  fs.writeFileSync(progStateFilename, JSON.stringify(progState, null, 2));
}

function makeCloseWindowHandler(window) {
  const id = window.id;

  return function handleCloseWindow() {
    const ndx = windows.indexOf(window);
    windows.splice(ndx, 1);
    delete windowInfosById[id];
    window.removeListener('closed', handleCloseWindow);
    if (windows.length === 0) {
      app.quit();
    }
  };
}

function saveProgramStateIfLastWindow() {
  if (windows.length === 1 && !quitting) {
    saveProgramState();
  }
}

function createWindow(url, options) {
  url = url || `file://${__dirname}/../../../app/index.html`;
  if (isDevMode) {
    url = `${url}?react_perf`;
  }
  options = options || {};
  const window = new BrowserWindow({
    x: options.x !== undefined ? options.x : undefined,
    y: options.y !== undefined ? options.y : undefined,
    width: options.width || 800,
    height: options.height || 600,
    minHeight: 500,
    minWidth: 500,
    enableLargerThanScreen: true,
    frame: options.frame === undefined ? true : options.frame,
    defaultEncoding: 'utf8',
    show: options.show === undefined ? true : options.show,
    webPreferences: {
      webSecurity: false,
      contextIsolation: false,
      nodeIntegration: true,
      webviewTag: true,
      enableRemoteModule: true,
    },
  });

  debug('createWindow:', url);
  window.loadURL(url);
  if (isDevMode && inspectRE.test(url)) {
    debug('openDevTools:', url);
    window.webContents.openDevTools();
  }

  catchNavigation(window);

  window.on('close', saveProgramStateIfLastWindow);
  window.on('closed', makeCloseWindowHandler(window));
  windows.unshift(window);
  windowInfosById[window.id] = {
    window: window,
    state: {},
  };

  return window;
}

function isSafeishURL(url) {
  return url.startsWith('http:') || url.startsWith('https:');
}

function catchNavigation(window) {
  window.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    if (isSafeishURL(url)) {
      shell.openExternal(url);
    }
  });
}

function makeHideInsteadOfCloseHandler(window) {
  return function hideInsteadOfClose(e) {
    if (hideInsteadOfCloseOneOffWindows) {
      e.preventDefault();
      window.hide();
    }
  };
}

function makeOneOfAKindCloseHandler(window, id) {
  return function handleCloseWindow() {
    delete oneOfAKindWindows[id];
    window.removeListener('closed', handleCloseWindow);
  };
}

function createOneOfAKindWindow(id, url, options) {
  const openDevTools = isDevMode && inspectRE.test(url);

  let window = oneOfAKindWindows[id];
  if (window) {
    window.show();
  } else {
    options = options || {};
    window = new BrowserWindow({
      x: options.x || undefined,
      y: options.y || undefined,
      width: options.width || undefined,
      height: options.height || undefined,
      minHeight: 128,
      minWidth: 128,
      enableLargerThanScreen: true,
      frame: options.frame === undefined ? true : options.frame,
      show: openDevTools ? openDevTools : (options.show === undefined ? true : options.show),
      defaultEncoding: 'utf8',
      webPreferences: {
        webSecurity: false,
        contextIsolation: false,
        nodeIntegration: true,
        webviewTag: true,
        enableRemoteModule: true,
      },
    });

    debug('createOneOfAKindWindow:', url);
    window.loadURL(`file://${__dirname}/../../../${url}`);
    if (openDevTools) {
      debug('openDevTools:', url);
      window.webContents.openDevTools();
    }

    catchNavigation(window);

    if (options.hideInsteadOfClose) {
      window.on('close', makeHideInsteadOfCloseHandler(window));
    } else {
      window.on('close', makeOneOfAKindCloseHandler(window, id));
    }
    oneOfAKindWindows[id] = window;
  }
  return window;
}

function createThumber() {
  const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
  const size = 128;

  createOneOfAKindWindow('thumber', 'app/thumber.html', {
    x: width - size - 20,
    y: height - size - 20,
    width: size,
    height: size,
    frame: false,
    show: false,
    hideInsteadOfClose: true,
  });
}

function createPreferencesWindow() {
  createOneOfAKindWindow('prefs', 'app/preferences.html', {
    show: false,
    width: 700,
    height: 500,
    hideInsteadOfClose: true,
  });
}

function createPasswordWindow() {
  createOneOfAKindWindow('password', 'app/password.html', {
    show: true,
    width: 400,
    height: 300,
  });
}

function createHelpWindow() {
  createOneOfAKindWindow('help', 'app/help.html', {
    show: true,
    width: 700,
    height: 600,
  });
}

function createUpdateWindow() {
  createOneOfAKindWindow('update', 'app/update.html', {
    show: true,
    width: 700,
    height: 600,
    hideInsteadOfClose: true,
  });
}

function sendAction(webContents, action) {
  webContents.send('action', action);
}

function setupPasswordMenus() {
  const menuTemplate = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: isOSX ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        },
      ]
    },
  ];


  if (isOSX) {
    const name = electron.app.name;
    menuTemplate.unshift({
      label: name,
      submenu: [
        {
          label: `About ${name}`,
          click: createHelpWindow,
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click() { app.quit(); },
        },
      ]
    });
  }

  if (!isOSX) {
    menuTemplate.unshift({
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click() { app.quit(); },
        },
      ],
    });
  }

  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
}

function setupMenus() {
  const fileMenuTemplate = {
    label: 'File',
    submenu: [
      {
        label: 'New Window',
        accelerator: 'CmdOrCtrl-N',
        click() {
          createWindow();
        },
      },
      {
        label: 'Close Window',
        accelerator: isOSX ? 'Cmd-W' : 'Alt-F4',
        click(item, focusedWindow) {
          focusedWindow.close();
        },
      },
    ],
  };

  const menuTemplate = [
    fileMenuTemplate,
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Full Screen',
          click(item, focusedWindow) {
            if (focusedWindow) {
              sendAction(focusedWindow.webContents, 'toggleFullscreen');
            }
          }
        },
        {
          label: 'Toggle Developer Tools',
          click(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        },
      ]
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Toggle Full Screen',
          click(item, focusedWindow) {
            if (focusedWindow) {
              sendAction(focusedWindow.webContents, 'toggleFullscreen');
            }
          }
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        },
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: createHelpWindow,
        },
      ]
    },
  ];

  if (isOSX) {
    const name = electron.app.name;
    menuTemplate.unshift({
      label: name,
      submenu: [
        {
          label: `About ${name}`,
          click: createHelpWindow,
        },
        {
          label: 'Check for Updates...',
          click: createUpdateWindow,
        },
        {
          label: 'Preferences...',
          click: createPreferencesWindow,
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: `Hide ${name}`,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click() { app.quit(); }
        },
      ]
    });
  }

  if (!isOSX) {
    fileMenuTemplate.submenu.push(
      {
        type: 'separator',
      },
      {
        label: 'Check for Updates...',
        click: createUpdateWindow,
      },
      {
        label: 'Preferences...',
        click: createPreferencesWindow,
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() { app.quit(); }
      },
    );
  }

  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
}

const s_minMsBetweenUpdateChecks = 7 *  24 * 60 * 60 * 1000;  // 7 days
function start() {
  updatePrefs(prefs);
  setupMenus();
  createThumber();
  createPreferencesWindow();
  loadProgramState();
  if (!isDevMode && prefs && prefs.misc && prefs.misc.checkForUpdates) {
    if (!oldProgState ||
        !oldProgState.lastUpdateCheckDate ||
        Date.now() - oldProgState.lastUpdateCheckDate > s_minMsBetweenUpdateChecks) {
      // TODO: turn this on when it actually works
      // createUpdateWindow();
    }
  }
}

app.on('ready', () => {
  if (prefs && prefs.misc && prefs.misc.password) {
    setupPasswordMenus();
    createPasswordWindow();
  } else {
    start();
  }
});

app.on('before-quit', () => {
  const passwordWindow = oneOfAKindWindows.password;
  if (!passwordWindow && windows.length) {
    saveProgramState();
  }
  quitting = true;
  hideInsteadOfCloseOneOffWindows = false;
  for (const window of Object.values(oneOfAKindWindows)) {
    window.close();
  }
});

app.on('window-all-closed', () => {
  if (hftServer) {
    hftServer.close();
  }
  app.quit();
});

app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('will-navigate', (event, url) => {
      event.preventDefault();
      shell.openExternal(url);
    });
  }
});

app.on('activate', () => {
  const passwordWindow = oneOfAKindWindows.password;
  if (windows.length === 0 && !passwordWindow) {
    createWindow();
  }
});
