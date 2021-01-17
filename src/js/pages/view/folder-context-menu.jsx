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
import {shell} from 'electron';  // eslint-disable-line
import {ContextMenu, MenuItem} from 'react-contextmenu';
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import ForwardableEvent from '../../lib/forwardable-event';

class FolderContextMenu extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_handleOpen',
      '_handleDelete',
      '_handleRefreshFolder',
      '_handleSyncFolderView',
    );
    this._logger = debug('FolderContextMenu');
  }
  _handleOpen() {
    if (this.props.folder.archive) {
      shell.showItemInFolder(this.props.folder.filename);
    } else {
      shell.openItem(this.props.folder.filename);
    }
  }
  _handleDelete() {
    this.props.eventBus.dispatch(new ForwardableEvent('deleteFolder'), this.props.folder);
  }
  _handleRefreshFolder() {
    this.props.eventBus.dispatch(new ForwardableEvent('refreshFolder'), this.props.folder.filename);
  }
  _handleSyncFolderView() {
    this.props.eventBus.dispatch(new ForwardableEvent('scrollFolderViewToFile'), this.props.folder.filename);
  }
  render() {
    return (
      <ContextMenu
        id="folderContextMenu"
        rotateMode={this.props.rotateMode}
      >
        <MenuItem onClick={this._handleOpen}>
          Show in Finder/Explorer
        </MenuItem>
        <MenuItem onClick={this._handleDelete}>
          Trash {this.props.folder ? this.props.folder.filename : ''}
        </MenuItem>
        <MenuItem onClick={this._handleRefreshFolder}>
          Refresh
        </MenuItem>
        <MenuItem onClick={this._handleSyncFolderView}>
          Sync Folder View
        </MenuItem>
      </ContextMenu>
    );
  }
}

export {
  FolderContextMenu as default,
};
