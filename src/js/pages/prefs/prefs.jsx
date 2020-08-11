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

import {remote, ipcRenderer} from 'electron';  // eslint-disable-line
import React from 'react';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import keycode from 'keycode';
import otherWindowIPC from 'other-window-ipc';
import stacktraceLog from '../../lib/stacktrace-log'; // eslint-disable-line
import bind from '../../lib/bind';
import {shell} from 'electron';  // eslint-disable-line
import debug from '../../lib/debug';
import ListenerManager from '../../lib/listener-manager';
import {eventToKeyInfo, keyInfoToId, keyInfoToString} from '../../lib/keyrouter';
import Modal from '../../lib/ui/modal';
import {actions} from '../../lib/actions';
import {loadPrefs} from './default-prefs';
import {CSSArray} from '../../lib/css-utils';
import Checkbox from '../../lib/ui/checkbox';
import Range from '../../lib/ui/range';
import LivePasswordEditor from '../../lib/ui/live-password-editor';

const dialog = remote.dialog;

async function getFolders() {
  const {canceled, filePaths} = await dialog.showOpenDialog({
    title: 'Select Folder',
    // defaultPath: '',
    properties: ['openDirectory'],
  });
  return canceled ? undefined : filePaths;
}

class BaseFolder extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_checkExists',
      '_checkVisibility',
    );
    this.state = {
      exists: false,
    };
    this._logger = debug('BaseFolder', props.foldername);
    this._unmounted = false;
    this._checking = false;
    this._listenerManager = new ListenerManager();
  }
  componentWillMount() {
    const on = this._listenerManager.on.bind(this._listenerManager);
    on(document, 'visibilitychange', this._checkVisibility);
    this._checkExists();
  }
  componentWillUnmount() {
    this._unmounted = true;
    this._listenerManager.removeAll();
  }
  _checkVisibility() {
    if (!document.hidden) {
      this._checkExists();
    }
  }
  _checkExists() {
    if (this._unmounted || document.hidden || this._checking) {
      return;
    }
    this._checking = true;
    fs.stat(this.props.foldername, (err, stat) => {
      if (this._unmounted) {
        return;
      }
      const exists = stat && stat.isDirectory();
      this.setState({
        exists,
      });
      this._logger(this.props.foldername, exists);
      this._checking = false;
      setTimeout(this._checkExists, 2000);
    });
  }
  render() {
    const props = this.props;
    const { foldername, ndx } = props;
    const classes = new CSSArray('basefolder');
    classes.addIf(!this.state.exists, 'missing');
    return (
      <div className={classes}>
        <div  // eslint-disable-line
          onClick={() => { props.setFolder(foldername, ndx); }}
        >
          <pre>
            {foldername}
          </pre>
        </div>
        <button
          type="button"
          onClick={() => { props.setFolder(foldername, ndx); }}
        >
        ...
        </button>
        <button
          type="button"
          onClick={() => { props.deleteFolder(ndx); }}
        >
          Del
        </button>
      </div>
    );
  }
}

const ActionSelector = (props) => {
  const {items, item, onChange} = props;
  return (
    <select value={item} onChange={onChange}>
      {Object.keys(items).map((actionId) => {
        const action = actions[actionId];
        return (
          <option key={`${actionId}`} value={actionId}>{`${actionId}: ${action.desc}`}</option>
        );
      })}
    </select>
  );
};

const EnumSelector = (props) => {
  const {desc, items, item, onChange} = props;
  return (
    <div className="enum-select">
      <div>{desc}</div>
      <select value={item} onChange={(e) => { onChange(e.target.value); }}>
        {Object.keys(items).map((key) => {
          const item = items[key];
          return (
            <option key={`${key}`} value={key}>{item.desc}</option>
          );
        })}
      </select>
    </div>
  );
};

class Key extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_captureKey',
      '_startKeyCapture',
      '_setAction',
      '_setKeyCapture',
      '_abortKeyCapture',
    );
    this.state = {
      setKey: false,
    };
  }
  _startKeyCapture() {
    this._oldKeyInfo = _.cloneDeep(this.props.keyInfo);
    this.setState({
      setKey: true,
    });
    window.addEventListener('keydown', this._captureKey);
  }
  _captureKey(event) {
    event.preventDefault();
    event.stopPropagation();
    this.props.setKeyCode(eventToKeyInfo(event));
  }
  _setKeyCapture() {
    this._stopKeyCapture();
  }
  _abortKeyCapture() {
    this.props.setKeyCode(this._oldKeyInfo);
    this._stopKeyCapture();
  }
  _stopKeyCapture() {
    window.removeEventListener('keydown', this._captureKey);
    this.setState({
      setKey: false,
    });
  }
  _setAction(event) {
    this.props.setKeyAction(event.target.value);
  }
  render() {
    const {keyInfo, dup, deleteKey} = this.props;
    const classes = new CSSArray('key');
    classes.addIf(dup, 'dup');

    const setKeyDialog = (this.state.setKey) ? (
      <Modal>
        <div className="keypress">
          <div>Press A Key</div>
          <div>Key: {keyInfoToString(keyInfo)}</div>
          <button type="button" onClick={this._setKeyCapture}>Set</button>
          <button type="button" onClick={this._abortKeyCapture}>Cancel</button>
        </div>
      </Modal>
    ) : undefined;

    return (
      <div className={classes}>
        {setKeyDialog}
        <div>
          <div className="keycode" onClick={this._startKeyCapture}>{keyInfoToString(keyInfo)}</div>
          <ActionSelector items={actions} item={keyInfo.action} onChange={this._setAction} />
        </div>
        <button type="button" onClick={this._startKeyCapture}>Set</button>
        <button type="button" onClick={() => { deleteKey(); }}>Del</button>
      </div>
    );
  }
}

function modifiersToString(keyInfo) {
  const mods = keyInfo.modifiers;
  const parts = [];
  if (mods) {
    if (mods.indexOf('c') >= 0) {
      parts.push('ctrl');
    }
    if (mods.indexOf('a') >= 0) {
      parts.push('alt');
    }
    if (mods.indexOf('s') >= 0) {
      parts.push('shift');
    }
    if (mods.indexOf('m') >= 0) {
      parts.push('meta');
    }
  }
  return parts;
}
const s_keySubs = {
  'left command': 'meta',
  'right command': 'meta',
};
function getKeyname(keyInfo) {
  const name = keycode(keyInfo.keyCode);
  return s_keySubs[name] || name;
}
const s_mods = {
  shift: true,
  ctrl: true,
  alt: true,
  meta: true,
};
function isMod(keyInfo) {
  return s_mods[getKeyname(keyInfo)];
}

const s_toolbarPositionModes = {
  top:        { desc: 'top', },
  bottom:     { desc: 'bottom', },
  swapTop:    { desc: 'opposite from menu or top', },
  swapBottom: { desc: 'opposite from menu or bottom', },
};

class Prefs extends React.Component {
  constructor(props) {
    super(props);
    this._streams = [];
    bind(
      this,
      '_addStream',
      '_cleanup',
      '_sendStateToAllStreams',
      '_saveAndSendPrefs',
      '_makeFolder',
      '_addFolder',
      '_setFolder',
      '_deleteFolder',
      '_addKey',
      '_setKeyCode',
      '_setKeyAction',
      '_deleteKey',
      '_savePrefs',
      '_setPassword',
      '_changeToolbarPosition',
    );
    this._logger = debug('Prefs');
    this._ipc = otherWindowIPC.createChannel('prefs');
    this._ipc.on('connect', this._addStream);
    this._prefsPath = path.join(props.options.userDataDir, 'prefs.json');
    this._savePrefs = _.debounce(this._savePrefs, 200);  // is there a point to this?
    // error means the prefs file could not be loaded so we got default prefs
    const {error, prefs} = loadPrefs(this._prefsPath, fs);
    this.state = {
      prefs,
      saveError: false,
    };
    if (error) {
      this._savePrefs();
    }
    window.addEventListener('beforeunload', this._cleanup);
  }
  componentWillUnmount() {
    this._cleanup();
  }
  _updateState(newState) {
    this.setState(newState, this._saveAndSendPrefs);
  }
  _saveAndSendPrefs() {
    this._sendStateToAllStreams();
    this._savePrefs();
  }
  _savePrefs() {
    try {
      fs.writeFile(this._prefsPath, JSON.stringify(this.state.prefs, null, 2), (err) => {
        this.setState({
          saveError: !!err,
        });
      });
    } catch (e) {
      this.setState({
        saveError: true,
      });
    }
  }

  _cleanup() {
    if (this._ipc) {
      this._streams.slice().forEach((stream) => {
        stream.close();
      });
      this._ipc.close();
      this._ipc = null;
    }
  }
  _addStream(stream) {
    stream.on('disconnect', () => {
      this._removeStream(stream);
    });
    this._streams.push(stream);
    this._sendPrefs(stream, this._getPrefsToSend());
  }
  _removeStream(stream) {
    const ndx = this._streams.indexOf(stream);
    this._streams.splice(ndx, 1);
  }
  _getPrefsToSend() {
    let prefs = this.state.prefs;
    const dirs = this.props.options._;
    if (dirs && dirs.length) {
      prefs = Object.assign(JSON.parse(JSON.stringify(prefs)), {
        folders: dirs,
      });
    }
    return prefs;
  }
  _sendPrefs(stream, prefs) {
    stream.send('prefs', prefs);
  }
  _sendStateToAllStreams() {
    const prefs = this._getPrefsToSend();
    // send to browser first because it might have to start HFT
    ipcRenderer.send('prefs', prefs);
    this._streams.forEach((stream) => {
      this._sendPrefs(stream, prefs);
    });
  }
  _updateBoolState(path, key, event) {
    const prefs = this.state.prefs;
    const mod = {prefs: _.cloneDeep(prefs), };
    const submod = mod.prefs[path];
    submod[key] = event.target.checked;
    this._updateState(mod);
  }
  _updateNumberState(path, key, event) {
    const prefs = this.state.prefs;
    const mod = {prefs: _.cloneDeep(prefs), };
    const submod = mod.prefs[path];
    submod[key] = event.target.value | 0;
    this._updateState(mod);
  }
  _makeCheckbox(path, fieldname, desc) {
    const prefs = this.state.prefs;
    return (
      <Checkbox
        key={`checkbox-${fieldname}`}
        checked={prefs[path][fieldname]}
        onUpdate={(event) => { this._updateBoolState(path, fieldname, event); }}
        label={desc}
      />
    );
  }
  _makeRange(path, fieldname, desc, options) {
    const prefs = this.state.prefs;
    return (
      <Range
        key={`range-${fieldname}`}
        onUpdate={(event) => { this._updateNumberState(path, fieldname, event); }}
        label={desc}
        value={prefs[path][fieldname]}
        min={options.min}
        max={options.max}
      />
    );
  }
  _makeFolder(foldername, ndx) {
    return (
      <BaseFolder
        key={`folder-${ndx}`}
        foldername={foldername}
        ndx={ndx}
        setFolder={(...args) => { this._setFolder(...args); }}
        deleteFolder={(...args) => { this._deleteFolder(...args); }}
      />
    );
  }
  async _addFolder() {
    const folders = await getFolders();
    if (folders) {
      const prefs = this.state.prefs;
      this._updateState({
        prefs: Object.assign({}, prefs, {
          folders: [...prefs.folders, ...folders],
        }),
      });
    }
  }
  async _setFolder(foldername, ndx) {
    const folders = await getFolders();
    if (folders) {
      const prefs = this.state.prefs;
      this._updateState({
        prefs: Object.assign({}, prefs, {
          folders: [
            ...prefs.folders.slice(0, ndx),
            folders[0],
            ...prefs.folders.slice(ndx + 1),
          ],
        }),
      });
    }
  }
  _deleteFolder(ndx) {
    const prefs = this.state.prefs;
    const newFolders = [
      ...prefs.folders.slice(0, ndx),
      ...prefs.folders.slice(ndx + 1),
    ];
    this._updateState({
      prefs: Object.assign({}, prefs, {
        folders: newFolders,
      }),
    });
  }
  _addKey() {
    const prefs = this.state.prefs;
    this._updateState({
      prefs: Object.assign({}, prefs, {
        keyConfig: [...prefs.keyConfig, { keyCode: 0, action: 'noop'}],
      }),
    });
  }
  _setKeyAction(ndx, action) {
    const prefs = this.state.prefs;
    const keys = [...prefs.keyConfig];
    const key = Object.assign({}, keys[ndx]);
    key.action = action;
    keys[ndx] = key;
    this._updateState({
      prefs: Object.assign({}, prefs, {
        keyConfig: keys,
      }),
    });
  }
  _setKeyCode(ndx, keyInfo) {
    const prefs = this.state.prefs;
    const keys = [...prefs.keyConfig];
    const key = Object.assign({}, keys[ndx]);
    Object.assign(key, keyInfo);
    keys[ndx] = key;
    this._updateState({
      prefs: Object.assign({}, prefs, {
        keyConfig: keys,
      }),
    });
  }
  _deleteKey(ndx) {
    const prefs = this.state.prefs;
    const newKeys = [
      ...prefs.keyConfig.slice(0, ndx),
      ...prefs.keyConfig.slice(ndx + 1),
    ];
    this._updateState({
      prefs: Object.assign({}, prefs, {
        keyConfig: newKeys,
      }),
    });
  }
  _makeKeys() {
    const prefs = this.state.prefs;
    const counts = {};
    const keynames = {};
    const usedMods = {};
    prefs.keyConfig.forEach((keyInfo) => {
      const id = keyInfoToId(keyInfo);
      const keyname = getKeyname(keyInfo);
      const mods = modifiersToString(keyInfo);
      counts[id] = 1 + (counts[id] || 0);
      keynames[keyname] = 1 + (keynames[keyname] || 0);
      for (const mod of mods) {
        if (mod !== keyname) {
          usedMods[mod] = 1 + (usedMods[mod] || 0);
        }
      }
    });

    function isOneOfOurModsAssignedAsKey(keyInfo) {
      const mods = modifiersToString(keyInfo);
      for (const mod of mods) {
        if (keynames[mod]) {
          return true;
        }
      }
      return false;
    }

    return prefs.keyConfig.map((keyInfo, ndx) => {
      const id = keyInfoToId(keyInfo);
      // Do we have 2+ of the same key?
      const dup = counts[id] > 1;
      const modDup = isMod(keyInfo)
        ? usedMods[getKeyname(keyInfo)]  // Is another key using this mod
        : isOneOfOurModsAssignedAsKey(keyInfo);  // Is one of our mods assigned as a key
      return (
        <Key
          key={`key-${ndx}`}  // eslint-disable-line
          dup={dup || modDup}
          keyInfo={keyInfo}
          setKeyCode={(...args) => { this._setKeyCode(ndx, ...args); }}
          setKeyAction={(...args) => { this._setKeyAction(ndx, ...args); }}
          deleteKey={(...args) => { this._deleteKey(ndx, ...args); }}
        />
      );
    });
  }
  _addErrors() {
    return this.state.saveError ?
      (
        <fieldset className="error">
          <legend>Errors</legend>
          <div>
            Could not save preferences to {this._prefsPath}
          </div>
        </fieldset>
      ) : undefined;
  }
  _setPassword(password) {
    const prefs = this.state.prefs;
    const mod = {prefs: _.cloneDeep(prefs), };
    mod.prefs.misc.password = password;
    this._updateState(mod);
  }
  _changeToolbarPosition(newPosition) {
    const prefs = this.state.prefs;
    const mod = {prefs: _.cloneDeep(prefs), };
    mod.prefs.misc.toolbarPosition = newPosition;
    this._updateState(mod);
  }
  render() {
    const prefs = this.state.prefs;
    const rendezvousUrl = prefs.misc.enableRendezvous ? 'http://happyfuntimes.net' : 'http://<yourlocalip>:18679';
    return (
      <div className="prefs">
        <fieldset>
          <legend><div>Preferences</div></legend>
          {this._addErrors()}
          <fieldset>
            <legend>Folders</legend>
            <div>
              {prefs.folders.map(this._makeFolder)}
              <button
                type="button"
                onClick={this._addFolder}
              >
                Add Folder
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend><div>Password</div></legend>
            <div>
              <LivePasswordEditor
                hasPassword={!!prefs.misc.password}
                onChange={this._setPassword}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Keys</legend>
            <div>
              {this._makeKeys()}
              <button
                type="button"
                onClick={this._addKey}
              >
                Add Key
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Misc</legend>
            <div>
              {this._makeCheckbox('misc', 'fullPathOnSeparator', 'Show full folder paths')}
              {this._makeCheckbox('misc', 'indentByFolderDepth', 'Indent folders by depth')}
              {this._makeCheckbox('misc', 'showEmpty', 'Show empty folders (hack, refresh view)')}
              {this._makeCheckbox('misc', 'scanContinuously', 'Continuously watch for changes')}
              {this._makeCheckbox('misc', 'showThumber', 'Show Thumbnails as they are made')}
              {this._makeCheckbox('misc', 'showBad', 'Show Thumbnails for images/videos that could not load')}
              {this._makeCheckbox('misc', 'filterSmallImages', 'Filter small images and videos')}
              {this._makeCheckbox('misc', 'checkForUpdates', 'Automatically check for updates')}
              {this._makeCheckbox('misc', 'showDates', 'Show dates when hovering over image')}
              {this._makeCheckbox('misc', 'showDimensions', 'Show dimensions when hovering over image')}
              {this._makeCheckbox('misc', 'promptOnDeleteFile', 'Prompt before deleting a file')}
              {this._makeCheckbox('misc', 'promptOnDeleteFolder', 'Prompt before deleting a folder')}
              {this._makeCheckbox('misc', 'enableWeb', 'Turn on local web server')}
              {prefs.misc.enableWeb
                ? this._makeCheckbox('misc', 'enableRendezvous', `Connect to local web server via ${rendezvousUrl}`)
                : ''
              }
              <EnumSelector desc="Toolbar Position" items={s_toolbarPositionModes} item={prefs.misc.toolbarPosition} onChange={this._changeToolbarPosition} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Video</legend>
            <div>
              {this._makeRange('misc', 'stepForwardDuration', 'Step Forward Duration (secs)', {min: 1, max: 300})}
              {this._makeRange('misc', 'stepBackwardDuration', 'Step Backward Duration (secs)', {min: 1, max: 300})}
            </div>
          </fieldset>
          <fieldset>
            <legend>Slideshow Item Duration (secs)</legend>
            <div>
              {this._makeRange('slideshowDuration', 'image', 'jpeg/png', {min: 1, max: 300})}
              {this._makeRange('slideshowDuration', 'image/gif', 'gif', {min: 1, max: 300})}
              {this._makeRange('slideshowDuration', 'video', 'video', {min: 1, max: 300})}
              {/* this._makeRange('slideshowDuration', 'default', 'other (not used)') */}
            </div>
          </fieldset>
          {/*
          <fieldset>
            <legend>Thumbnails</legend>
            <div>
              {this._makeRange('thumbnails', 'scanSize', 'Creation Size', {min: 64, max: 256})}
            </div>
          </fieldset>
          */}
          <fieldset>
            <legend>Extra</legend>
            <div>
              <button
                type="button"
                onClick={() => {
                  shell.openItem(this.props.options.userDataDir);
                }}
              >
                Open Cache in Explorer/Finder
              </button>
            </div>
          </fieldset>
        </fieldset>
      </div>
    );
  }
}

export {
  Prefs as default,
};

