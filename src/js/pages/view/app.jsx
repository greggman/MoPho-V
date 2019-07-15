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

import fs from 'fs';
import rimraf from 'rimraf';
import {shell, ipcRenderer} from 'electron';  // eslint-disable-line
import otherWindowIPC from 'other-window-ipc';
import React from 'react';
import _ from 'lodash';
import {autorun, observable, action} from 'mobx';
import {observer} from 'mobx-react';
import {hideMenu, showMenu} from 'react-contextmenu';
import ActionEvent from '../../lib/action-event';
import ActionListener from '../../lib/action-listener';
import bind from '../../lib/bind';
import {
  ReflexContainer,
  ReflexSplitter,
  ReflexElement,
} from '../../../3rdparty/react-reflex/index';
// import '../src/js/3rdparty/react-reflex/reflex-styles.scss';
import FileContextMenu from './file-context-menu';
import FolderContextMenu from './folder-context-menu';
import OkayCancel from '../../lib/ui/okay-cancel';
import Folders from './folders';
import {sortModes, FolderStateHelper} from './folder-state-helper';
import ForwardableEventDispatcher from '../../lib/forwardable-event-dispatcher';
import KeyRouter from '../../lib/keyrouter';
import debug from '../../lib/debug';
import {rotateModes} from '../../lib/rotatehelper';
import ImagegridsToolbar from './imagegrids-toolbar';
import ViewerToolbar from './viewer-toolbar';
import ViewSplitHolder from './view-split-holder';
import {makeActionFuncs} from '../../lib/actions';
import FolderDB from './folder-db';
import FolderFilter from './folder-filter';
import gridModes from './grid-modes';
import {makeFilter, makeCompositeFilter} from '../../lib/make-filter';
import ToolbarHolder from './toolbar-holder';
import WaitForFiles from './wait-for-files';
import Loading from './loading';
import {setupFullscreen, toggleFullscreen} from '../../lib/fullscreen';

function reload() {
  console.log('queue reload');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

const dummyEvent = {
  preventDefault: () => {},
  stopPropagation: () => {},
};

const g_minSizes = {
  'image': 256,
  'image/gif': 128,
  'video': 128,
};

const s_toolbarModeBottomTable = {
  top: false,
  bottom: true,
  swapTop: false,
  swapBottom: true,
};

const s_rotateModeVsToolbarModeBottomTable = {
  0: { top: false, bottom: true, swapTop: true,  swapBottom: true, },
  1: { top: false, bottom: true, swapTop: false, swapBottom: true,  },
  2: { top: false, bottom: true, swapTop: false, swapBottom: false,  },
  3: { top: false, bottom: true, swapTop: false, swapBottom: true,  },
};

@observer
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      totalFiles: 0,
      prefs: {},
      winState: Object.assign({
        showUI: 3,
        rotateMode: 0,
        thumbnailZoom: 1,
        sortMode: 'sortPath',
        gridMode: 'columns',
        splitPosition: 0.2,
        splitStartPosition: 0.2,
      }, props.startState ? props.startState.winState : {}),
      contextFileInfo: null,
      contextFolderInfo: null,
      showDeleteFilePrompt: false,
      showDeleteFolderPrompt: false,
      filterError: '',
      collections: [
        { name: 'foo', },
        { name: 'bar', },
        { name: 'moo', },
      ],
    };
    if (props.startState && props.startState.winState && props.startState.winState.splitPosition) {
      this.state.winState.splitStartPosition = props.startState.winState.splitPosition;
    }
    this.state.root = FolderStateHelper.createRoot(this.state.winState.sortMode);
    this.state.newRoot = FolderStateHelper.createRoot(this.state.winState.sortMode);

    this._logger = debug('App');
    bind(
      this,
      '_addFilesToFolderDB',
      '_addFilesToFolderFilter',
      '_addFilesToFolderStateHelper',
      '_processFolderFilter',
      '_queueFolderFilterProcess',
      '_updatePrefs',
      '_handleActions',
      '_handleKeyDown',
      '_handleRotate',
      '_handleFileContextMenu',
      '_handleFolderContextMenu',
      '_handleUpdateFilter',
      '_handleRefreshFolder',
      '_handleDeleteFolder',
      '_handleDeleteFile',
      '_deleteFolder',
      '_deleteFile',
      '_forceDelete',
      '_handleSplitResize',
      '_handleCycleSortMode',
      '_handleCycleGridMode',
      '_filterInputBlurred',
      '_filterInputFocused',
      '_setCurrentView',
      '_toggleUI',
      '_showPrefs',
      '_emitAction',
      '_setThumbnailZoom',
      '_smallDimensionsFilter',
      '_goodFilter',
      '_saveLayout',
      '_setNewRoot',
    );
    this._saveLayout = _.debounce(this._saveLayout, 250);
    this._setNewRoot = _.throttle(this._setNewRoot, 150);

    this._folderDB = new FolderDB();
    this._folderDB.on('updateFiles', this._addFilesToFolderFilter);
    this._folderFilter = new FolderFilter();
    this._folderFilter.on('updateFiles', this._addFilesToFolderStateHelper);
    this._folderFilter.on('pending', this._queueFolderFilterProcess);
    this._filterString = '';

    this._actionFuncs = makeActionFuncs((actionId) => {
      this._emitAction(actionId);
    });
    otherWindowIPC.createChannelStream('thumber')
      .then((stream) => {
        this._thumberStream = stream;
        this._thumberStream.on('updateFiles', this._addFilesToFolderDB);
        this._thumberStream.on('disconnect', reload);
      })
      .catch((err) => {
        console.error(err);
        if (err.stack) {
          console.error(err.stack);
        }
      });

    otherWindowIPC.createChannelStream('prefs')
      .then((stream) => {
        this._prefsStream = stream;
        this._prefsStream.on('prefs', this._updatePrefs);
        this._prefsStream.on('disconnect', reload);
      })
      .catch((err) => {
        console.error(err);
        if (err.stack) {
          console.error(err.stack);
        }
      });

    this._imagegridStateHolder = observable({
      state: null,
    });
    this._viewerStateHolder = observable({
      state: null,
    });

    this._eventBus = new ForwardableEventDispatcher();
    this._eventBus.debugId = this._logger.getPrefix();
    //    this._eventBus.on('scrollToImage', this._handleScrollToImage);
    this._eventBus.on('action', this._handleActions);
    this._eventBus.on('fileContextMenu', this._handleFileContextMenu);
    this._eventBus.on('folderContextMenu', this._handleFolderContextMenu);
    this._eventBus.on('filterupdate', this._handleUpdateFilter);
    this._eventBus.on('refreshFolder', this._handleRefreshFolder);
    this._eventBus.on('deleteFile', this._handleDeleteFile);
    this._eventBus.on('deleteFolder', this._handleDeleteFolder);

    this._toolbarEventBus = new ForwardableEventDispatcher();
    this._imageGridToolbarEventBus = new ForwardableEventDispatcher();
    this._viewerToolbarEventBus = new ForwardableEventDispatcher();
    this._toolbarEventBus.setForward(this._imageGridToolbarEventBus);

    autorun(() => {
      const viewing = this._viewerStateHolder.state && this._viewerStateHolder.state.viewing;
      this._toolbarEventBus.setForward(viewing
        ? this._viewerToolbarEventBus
        : this._imageGridToolbarEventBus);
    });

    this._keyRouter = new KeyRouter();
    window.addEventListener('keydown', this._handleKeyDown);

    this._actionListener = new ActionListener();
    this._actionListener.on('toggleUI', this._toggleUI);
    this._actionListener.on('rotate', this._handleRotate);
    this._actionListener.on('cycleSortMode', this._handleCycleSortMode);
    this._actionListener.on('cycleGridMode', this._handleCycleGridMode);
    this._actionListener.on('toggleFullscreen', toggleFullscreen);
    this._actionListener.on('newWindow', () => {
      ipcRenderer.send('openwindow', 'view');
    });
    this._actionListener.on('showHelp', () => {
      ipcRenderer.send('openwindow', 'help');
    });

    ipcRenderer.on('action', (event, action) => {
      this._eventBus.dispatch(new ActionEvent({action: action}));
    });

    // If we were launched fullscreen we need to hide the menus
    // and install mouse handlers.
    setupFullscreen();

    process.nextTick(() => {
      this._setFilter(() => { return true; });
    });
  }
  componentDidMount() {
  }
  componentWillUnmount() {
    this._actionListener.close();
    if (this._thumberStream) {
      this._thumberStream.close();
      this._thumberStream = null;
    }
  }
  _saveLayout() {
    ipcRenderer.send('saveWinState', this.state.winState);
  }
  _addFilesToFolderDB(folders) {
    this._logger('addFilesToFolderDB', folders);
    this._folderDB.updateFiles(folders);
  }
  _addFilesToFolderFilter(folders) {
    this.setState({
      totalFiles: this._folderDB.totalFiles,
    });
    this._folderFilter.updateFiles(folders);
  }
  _addFilesToFolderStateHelper(folders) {
    FolderStateHelper.updateFolders(this._newRoot, folders, this._folderStatePrefs);
    this._setNewRoot();
  }
  _setNewRoot() {
    this.setState({
      root: Object.assign({}, this._newRoot),
    });
  }
  _queueFolderFilterProcess() {
    if (!this._folderFilterProcessQueued) {
      this._folderFilterProcessQueued = true;
      process.nextTick(this._processFolderFilter);
    }
  }
  _processFolderFilter() {
    this._folderFilterProcessQueued = false;
    if (this._folderFilter.process()) {
      this._queueFolderFilterProcess();
    }
  }
  _setFilter(filter) {
    this._folderFilter.setFilter(makeCompositeFilter([this._goodFilter, this._smallDimensionsFilter, filter]));
    this._rerunFilter();
  }
  _rerunFilter() {
    this._filterShowBad = this.state.prefs.misc && this.state.prefs.misc.showBad || this._haveBadFilter;
    this._filterSmallImages = this.state.prefs.misc && this.state.prefs.misc.filterSmallImages;
    this._folderStatePrefs = {
      showEmpty: this.state.prefs.misc && this.state.prefs.misc.showEmpty,
    };
    this._newRoot = FolderStateHelper.createRoot(this.state.winState.sortMode);
    this._setNewRoot();
    this._folderDB.sendAll();
  }
  _handleUpdateFilter(event) {
    const result = makeFilter(event.filter);
    this.setState({
      filterError: result.error
    });
    if (!result.error) {
      this._filterString = event.filter;
      this._haveBadFilter = result.filterTypesUsed.bad;
      this._setFilter(result.filter);
    }
  }
  _goodFilter(filename, fileInfo) {
    if (this._filterShowBad) {
      return true;
    }
    return !fileInfo.bad;
  }
  _smallDimensionsFilter(filename, fileInfo) {
    if (!this._filterSmallImages) {
      return true;
    }
    let minSize = g_minSizes[fileInfo.type];
    if (!minSize) {
      if (!fileInfo.type) {
        return true;
      }
      const ndx = fileInfo.type.indexOf('/');
      if (ndx >= 0) {
        const type = fileInfo.type.substring(0, ndx);
        minSize = g_minSizes[type];
        if (!minSize) {
          return true;
        }
      }
    }
    const tooSmall = (fileInfo.width && fileInfo.width < minSize) || (fileInfo.height && fileInfo.height < minSize);
    return !tooSmall;
  }
  _handleCycleSortMode() {
    this.setState((prevState) => {
      return {
        winState: Object.assign({}, prevState.winState, {
          sortMode: sortModes.next(prevState.winState.sortMode),
        }),
      };
    }, () => {
      this._saveLayout();
      this._rerunFilter();
    });
  }
  _handleCycleGridMode() {
    this.setState((prevState) => {
      return {
        winState: Object.assign({}, prevState.winState, {
          gridMode: gridModes.next(prevState.winState.gridMode),
        }),
      };
    }, () => {
      this._saveLayout();
    });
  }
  @action _setCurrentView(view) {
    this._currentView = view;
    this._eventBus.setForward(view ? view.getEventBus() : null);
    this._imagegridStateHolder.state = view ? view.getImagegridState() : null;
    this._viewerStateHolder.state = view ? view.getViewerState() : null;
  }
  _toggleUI() {
    this.setState((prevState) => {
      return {
        winState: Object.assign({}, prevState.winState, {
          showUI: (prevState.winState.showUI + 3) % 4,
        }),
      };
    }, () => {
      this._saveLayout();
    });
  }
  _handleActions(...args) {
    this._actionListener.routeAction(...args);
  }
  _handleKeyDown(e) {
    if (this._filterInputActive) {
      return;
    }
    // console.log('keyCode:', e.keyCode);
    const action = this._keyRouter.getActionForKey(e);
    if (action) {
      // console.log('action:', action);
      e.preventDefault();
      this._emitAction(action, e);
    }
  }
  _filterInputBlurred() {
    this._filterInputActive = false;
  }
  _filterInputFocused() {
    this._filterInputActive = true;
  }
  _emitAction(action, e) {
    const event = new ActionEvent(action, e || dummyEvent);
    this._eventBus.dispatch(event);
  }
  //  _handleScrollToImage(...args) {
  //    this.viewSplit.emit('scrollToImage', ...args);
  //  }
  _setThumbnailZoom(zoom) {
    this.setState((prevState) => {
      return {
        winState: Object.assign({}, prevState.winState, {
          thumbnailZoom: zoom,
        }),
      };
    }, () => {
      this._saveLayout();
    });
  }
  _handleRotate() {
    this.setState((prevState) => {
      return {
        winState: Object.assign({}, prevState.winState, {
          rotateMode: (prevState.winState.rotateMode + 1) % rotateModes.length,
        }),
      };
    }, () => {
      this._saveLayout();
    });
  }
  _handleRefreshFolder(event, folderName) {
    this._thumberStream.send('refreshFolder', folderName);
  }
  _handleDeleteFolder(event, folderInfo) {
    this.setState((prevState) => {
      return {
        contextFolderInfo: folderInfo,
        showDeleteFolderPrompt: prevState.prefs.misc.promptOnDeleteFolder,
      };
    });
    if (!this.state.prefs.misc.promptOnDeleteFolder) {
      this._deleteFolder(folderInfo);
    }
  }
  _handleDeleteFile(event, fileInfo) {
    this.setState((prevState) => {
      return {
        contextFileInfo: fileInfo,
        showDeleteFilePrompt: prevState.prefs.misc.promptOnDeleteFile,
      };
    });
    if (!this.state.prefs.misc.promptOnDeleteFile) {
      this._deleteFile(fileInfo);
    }
  }
  _deleteFolder() {
    this.setState({
      showDeleteFolderPrompt: false,
    });
    const filename = this.state.contextFolderInfo.filename;
    if (!shell.moveItemToTrash(filename)) {
      this.setState((prevState) => {
        return {
          showForceDelete: true,
          forceDeleteFilename: filename,
          forceDeleteIsFolder: !prevState.contextFolderInfo.archive,
        };
      });
    }
  }
  _deleteFile() {
    this.setState({
      showDeleteFilePrompt: false,
    });
    const filename = this.state.contextFileInfo.filename;
    if (!shell.moveItemToTrash(filename)) {
      this.setState({
        showForceDelete: true,
        forceDeleteFilename: filename,
        forceDeleteIsFolder: false,
      });
    }
  }
  _forceDelete() {
    this.setState({
      showForceDelete: false,
    });
    if (this.state.forceDeleteIsFolder) {
      rimraf(this.state.forceDeleteFilename, {glob: false}, (e) => {
        this._logger(e);
      });
    } else {
      fs.unlink(this.state.forceDeleteFilename);
    }
  }
  _handleFileContextMenu(forwardableEvent, fileInfo) {
    const event = forwardableEvent.domEvent;
    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX || (event.touches && event.touches[0].pageX);
    const y = event.clientY || (event.touches && event.touches[0].pageY);

    this.setState({contextFileInfo: fileInfo});

    hideMenu();

    showMenu({
      position: {x, y},
      rotateMode: this.state.winState.rotateMode,
      target: this.elem,
      id: 'fileContextMenu',
    });
  }
  _handleFolderContextMenu(forwardableEvent, folderInfo) {
    const event = forwardableEvent.domEvent;
    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX || (event.touches && event.touches[0].pageX);
    const y = event.clientY || (event.touches && event.touches[0].pageY);

    this.setState({contextFolderInfo: folderInfo});

    hideMenu();

    showMenu({
      position: {x, y},
      rotateMode: this.state.winState.rotateMode,
      target: this.elem,
      id: 'folderContextMenu',
    });
  }
  _updatePrefs(prefs) {
    this.setState({
      prefsReceived: true,
      prefs,
    }, () => {
      this._keyRouter.registerKeys(prefs.keyConfig);
      this._logger('prefs:', JSON.stringify(this.state.prefs));
      this._rerunFilter();
    });
  }
  _showPrefs() {
    ipcRenderer.send('openwindow', 'prefs');
  }
  _getToolbar() {
    if (!(this.state.winState.showUI & 1)) { // eslint-disable-line no-bitwise
      return undefined;
    }
    if (this._viewerStateHolder.state && this._viewerStateHolder.state.viewing) {
      return (
        <ViewerToolbar
          actions={this._actionFuncs}
          inEventBus={this._viewerToolbarEventBus}
          outEventBus={this._eventBus}
          viewerStateHolder={this._viewerStateHolder}
        />
      );
    }
    return (
      <ImagegridsToolbar
        actions={this._actionFuncs}
        zoom={this.state.winState.thumbnailZoom}
        sortMode={this.state.winState.sortMode}
        gridMode={this.state.winState.gridMode}
        collections={this.state.collections}
        setThumbnailZoom={this._setThumbnailZoom}
        inEventBus={this._imageGridToolbarEventBus}
        outEventBus={this._eventBus}
        imagegridStateHolder={this._imagegridStateHolder}
        filterInputBlurred={this._filterInputBlurred}
        filterInputFocused={this._filterInputFocused}
      />
    );
  }
  _getToolbarError() {
    return this.state.filterError
      ? (
        <div className="toolbar-error"><div>{this.state.filterError}</div></div>
      ) : undefined;
  }
  _handleSplitResize(event) {
    const {flex} = event.component.props;
    this.setState((prevState) => {
      return {
        winState: Object.assign({}, prevState.winState, {
          splitPosition: flex,
        }),
      };
    }, () => {
      this._saveLayout();
    });
  }
  _getForceDeleteMsg() {
    const filename = this.state.forceDeleteFilename;
    if (this.state.forceDeleteIsFolder) {
      const children = this._folderDB.getAllChildren(filename);
      return `Could not move ${filename} to Trash. Really Delete ${filename} and ${children.length}+ file(s) and subfolder(s) inside including ${children.join(', ')}`;
    }
    return `Could not move ${filename} to Trash. Really Delete ${filename}`;
  }
  render() {
    this._logger('render');
    const splitStyle = {
      display: 'flex',
      position: 'relative',
      flexDirection: 'column',
    };
    const isFullScreen = true; // remote.getCurrentWindow().isFullScreen();
    const rotateMode = this.state.winState.rotateMode;
    const showUI = this.state.winState.showUI;
    const hideClass = (showUI & 2) ? 'noop' : 'hide';  // eslint-disable-line no-bitwise
    const fullClass = (showUI & 2) ? 'noop' : 'fullsplit';  // eslint-disable-line no-bitwise
    if (!this.state.prefsReceived) {
      return (<Loading />);
    }
    if (!this.state.totalFiles) {
      return (<WaitForFiles onClick={this._showPrefs} />);
    }
    const toolbarPosition = this.state.prefs.misc.toolbarPosition;
    const toolbarOnBottom = isFullScreen
      ? s_rotateModeVsToolbarModeBottomTable[rotateMode][toolbarPosition]
      : s_toolbarModeBottomTable[toolbarPosition];
    /* eslint indent: "off" */ // eslint indent broke as of eslint 5.6.1
    return (
      <div
        style={splitStyle}
        className={`view ${rotateModes[rotateMode].className}`}
        ref={(ref) => { this._container = ref; }}
      >
        <ToolbarHolder bottom={toolbarOnBottom}>
          {this._getToolbar()}
        </ToolbarHolder>
        {this._getToolbarError()}
        <div style={{position: 'relative', flex: '1 1 0%', overflow: 'hidden'}}>
          <ReflexContainer
            orientation="vertical"
            minSize={0}
            defaultSize={100}
            rotateMode={rotateMode}
          >
            <ReflexElement
              flex={this.state.winState.splitStartPosition}
              rotateMode={rotateMode}
              className={hideClass}
              onResize={this._handleSplitResize}
            >
              <Folders
                root={this.state.root}
                eventBus={this._eventBus}
                prefs={this.state.prefs}
                show={this.state.winState.showUI}
                rotateMode={rotateMode}
              />
            </ReflexElement>

            <ReflexSplitter className={hideClass} style={{cursor: rotateMode % 2 ? 'row-resize' : 'col-resize'}} />

            <ReflexElement
              propagateDimensions={true}
              renderOnResizeRate={5}
              // if we turn this on ReflexElement set the width and height direct
              // and does not take into account rotation. Maybe we should fix that
              renderOnResize={true}
              rotateMode={rotateMode}
              className={fullClass}
            >

              <ViewSplitHolder
                root={this.state.root}
                eventBus={this._eventBus}
                options={this.props.options}
                prefs={this.state.prefs}
                rotateMode={rotateMode}
                startingLayout={this.props.startState && this.props.startState.layout}
                setCurrentView={this._setCurrentView}
                winState={this.state.winState}
                toolbarEventBus={this._toolbarEventBus}
              />

            </ReflexElement>
          </ReflexContainer>

          <FolderContextMenu
            rotateMode={rotateMode}
            folder={this.state.contextFolderInfo}
            eventBus={this._eventBus}
          />
          <FileContextMenu
            rotateMode={rotateMode}
            file={this.state.contextFileInfo}
            eventBus={this._eventBus}
          />
          { this.state.showDeleteFilePrompt
            ? (
              <OkayCancel
                parent={this._container}
                okay="Trash File"
                msg={`Trash ${this.state.contextFileInfo.filename}?`}
                onOkay={this._deleteFile}
                onCancel={() => { this.setState({showDeleteFilePrompt: false}); }}
              />
              )
            : ''
          }
          { this.state.showDeleteFolderPrompt
            ? (
              <OkayCancel
                parent={this._container}
                okay={this.state.contextFolderInfo.archive ? 'Trash Archive' : 'Trash Folder'}
                msg={`Trash ${this.state.contextFolderInfo.filename}?`}
                onOkay={this._deleteFolder}
                onCancel={() => { this.setState({showDeleteFolderPrompt: false}); }}
              />
              )
            : ''
          }
          { this.state.showForceDelete
            ? (
              <OkayCancel
                parent={this._container}
                okay={this.state.forceDeleteIsFolder ? 'Really Delete Folder' : 'Really Delete File'}
                msg={this._getForceDeleteMsg()}
                onOkay={this._forceDelete}
                onCancel={() => { this.setState({showForceDelete: false}); }}
              />
              )
            : ''
          }
        </div>
      </div>
    );
  }
}

export {
  App as default,
};

