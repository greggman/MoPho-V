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

import React from 'react';
import { render as reactRender } from 'react-dom';
import {ipcRenderer} from 'electron';  // eslint-disable-line
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import stacktraceLog from '../../lib/stacktrace-log.js';  // eslint-disable-line
import '../../lib/title';
import Modal from '../../lib/ui/modal';
import ListenerManager from '../../lib/listener-manager';

const states = {
  idle:          { canTry: true,  msg: '', },
  requested:     {                msg: 'update requested', },
  checking:      {                msg: 'checking for udpate', },
  downloading:   {                msg: 'update found. downloading...', },
  error:         { canTry: true,  msg: 'error checking for update', },
  noUpdate:      { canTry: true,  msg: 'no update available', },
  readyToUpdate: { restart: true, msg: 'update downloaded', },
  quitting:      {                msg: '...quiting...', },
};

function toString(v) {
  try {
    return JSON.stringify(v);
  } catch (e) {
    //
  }
  return v ? v.toString() : '';
}

class Update extends React.Component {
  constructor(props) {
    super(props);
    this._logger = debug('Update');
    bind(
      this,
      '_handleError',
      '_handleCheckingForUpdate',
      '_handleUpdateAvailable',
      '_handleUpdateNotAvailable',
      '_handleUpdateDownloaded',
      '_handleDownloadProgress',
      '_checkForUpdate',
    );
    this.state = {
      state: 'idle',
      error: '',
      progress: null,
    };
    this._listenerManager = new ListenerManager();
  }
  componentDidMount() {
    const on = this._listenerManager.on.bind(this._listenerManager);
    on(ipcRenderer, 'error', this._handleError);
    on(ipcRenderer, 'checking-for-update', this._handleCheckingForUpdate);
    on(ipcRenderer, 'update-available', this._handleUpdateAvailable);
    on(ipcRenderer, 'update-not-available', this._handleUpdateNotAvailable);
    on(ipcRenderer, 'update-downloaded', this._handleUpdateDownloaded);
    on(ipcRenderer, 'download-progress', this._handleDownloadProgress);
    this._checkForUpdate();
  }
  get updateState() {
    return this.state.state;
  }
  set updateState(state) {
    this.setState({
      state: state,
    });
  }
  _checkForUpdate() {
    this.updateState = 'requested';
    this.setState({
      error: '',
    });
    ipcRenderer.send('checkForUpdate');
  }
  _handleError(e, err) {
    this.setState({
      error: toString(err),
      progress: null,
    });
    this.updateState = 'error';
  }
  _handleCheckingForUpdate() {
    this.updateState = 'checking';
  }
  _handleUpdateAvailable() {
    this.updateState = 'downloading';
  }
  _handleUpdateNotAvailable() {
    this.updateState = 'noUpdate';
    this.setState({
      progress: null,
    });
    ipcRenderer.send('checkedForUpdate');
  }
  _handleUpdateDownloaded(e) {
    this._logger(e);
    this.updateState = 'readyToUpdate';
    ipcRenderer.send('checkedForUpdate');
  }
  _handleDownloadProgress(e, progress) {
    this.setState({
      progress,
    });
  }
  _quitAndUpdate() {
    this.updateState = 'quitting';
    ipcRenderer.send('quitAndInstall');
  }
  render() {
    const state = states[this.updateState];
    const progress = this.state.progress;
    return (
      <Modal>
        <div className="msg update">
          <h1>Update</h1>
          <div className="status">
            <div>status: {state.msg}</div>
            { (progress && progress.transferred && progress.total)
                ? (
                  <div>{progress.transferred} / {progress.total}</div>
                  )
                : undefined
            }
          </div>
          { (this.state.error)
              ? (
                <div className="error">{this.state.error}</div>
                )
              : undefined
          }
          { (state.canTry)
              ? (
                <div>
                  <button onClick={this._checkForUpdate}>Check for Update</button>
                </div>
                )
              : undefined
          }
          {
            (state.restart)
              ? (
                <div>
                  <button onClick={this._quitAndUpdate}>Quit and Update</button>
                </div>
                )
              : undefined
          }
        </div>
      </Modal>
    );
  }
}

ipcRenderer.on('start', (/* event , args */) => {
  reactRender(
    <Update />,
    document.querySelector('.browser')
  );
});
ipcRenderer.send('start');

