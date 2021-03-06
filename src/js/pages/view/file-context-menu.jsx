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
import path from 'path';
import {shell} from 'electron';  // eslint-disable-line
import {ContextMenu, MenuItem} from 'react-contextmenu';
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import ForwardableEvent from '../../lib/forwardable-event';

class FileContextMenu extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_handleOpen',
      '_handleDelete',
      '_handleRefreshFolder',
      '_handleSyncFolderView',
    );
    this._logger = debug('FileContextMenu');
  }
  _handleOpen() {
    shell.showItemInFolder(this.props.file.archiveName ? this.props.file.archiveName : this.props.file.filename);
  }
  _handleDelete() {
    if (this.props.file.archiveName) {
      this.props.eventBus.dispatch(new ForwardableEvent('deleteFolder'), {
        filename: this.props.file.archiveName,
        archive: true,
      });
    } else {
      this.props.eventBus.dispatch(new ForwardableEvent('deleteFile'), this.props.file);
    }
  }
  _handleRefreshFolder() {
    this.props.eventBus.dispatch(new ForwardableEvent('refreshFolder'), path.dirname(this.props.file.filename));
  }
  _deleteMenuItem() {
    if (this.props.file && this.props.file.filename) {
      return (
        <MenuItem onClick={this._handleDelete}>
          Trash {this.props.file.archiveName ? this.props.file.archiveName : this.props.file.filename}
        </MenuItem>
      );
    }
    return undefined;
  }
  _handleSyncFolderView() {
    this.props.eventBus.dispatch(new ForwardableEvent('scrollFolderViewToFile'), path.dirname(this.props.file.filename));
  }
  render() {
    return (
      <ContextMenu
        id="fileContextMenu"
        rotateMode={this.props.rotateMode}
      >
        <MenuItem onClick={this._handleOpen}>
          Show in Finder/Explorer
        </MenuItem>
        {this._deleteMenuItem()}
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
  FileContextMenu as default,
};
