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

import PropTypes from 'prop-types';
import React from 'react';
import path from 'path';
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import {getRotatedXY} from '../../lib/rotatehelper';
import ForwardableEvent from '../../lib/forwardable-event';
import ForwardableEventDispatcher from '../../lib/forwardable-event-dispatcher';
import {cssArray} from '../../lib/css-utils';

const s_depthCache = {};
function depthPrefix(depth) {
  depth = Math.max(0, depth);
  let prefix = s_depthCache[depth];
  if (!prefix) {
    prefix = (new Array(depth)).fill(0).map(() => '  ').join('');
    s_depthCache[depth] = prefix;
  }
  return prefix;
}
function depthPrefixedFilename(baseFolders, filename) {
  for (const baseFolder of baseFolders) {
    if (filename.startsWith(baseFolder)) {
      filename = filename.substring(path.dirname(baseFolder).length + (baseFolder.startsWith('\\\\') ? 0 : 1));
      break;
    }
  }
  const depth = filename.split(/\\|\//).length;
  return `${depthPrefix(depth - 1)}${path.basename(filename)}`;
}

class Folder extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_handleClick',
      '_handleContextMenu',
    );
    this._ref = React.createRef();
  }
  _handleClick() {
    this.props.eventBus.dispatch(new ForwardableEvent('goToImage'), this.props.count, this.props.folderCount);
  }
  _handleContextMenu(event) {
    this.props.eventBus.dispatch(new ForwardableEvent('folderContextMenu', event), this.props.folder);
  }
  scrollIntoView() {
    this._ref.current.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center',
    });
  }
  render() {
    const {folder, prefs} = this.props;
    const name = prefs.misc.indentByFolderDepth
      ? depthPrefixedFilename(prefs.folders, folder.filename)
      : folder.name;
    const classes = cssArray(
      'folder',
      folder.scanning ? 'scanning' : undefined,
      folder.checking ? 'checking' : undefined,
    );
    return (
      <div
        className={classes}
        onClick={this._handleClick}
        onContextMenu={this._handleContextMenu}
      >
        <div ref={this._ref}>{name} ({this.props.numFiles})</div>
      </div>
    );
  }
}

Folder.propTypes = {
  // eventBus: PropTypes.object.isRequired,
  // folder: PropTypes.object.isRequired,
  folderCount: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  numFiles: PropTypes.number.isRequired,
  // prefs: PropTypes.object.isRequired,
};


class Folders extends React.Component {
  constructor(props) {
    super(props);
    this._logger = debug('Folders');
    bind(
      this,
      '_handleScrollFolderToViewFile',
      '_handleWheel',
    );
    this._filenameToRef = new Map();
    this.props.eventBus.on('scrollFolderViewToFile', this._handleScrollFolderToViewFile);
  }
  componentDidMount() {
    this.main.addEventListener('wheel', this._handleWheel, {passive: false});
  }
  componentWillUnmount() {
    this.main.removeEventListener('wheel', this._handleWheel, {passive: false});
  }
  _handleScrollFolderToViewFile(event, folderName) {
    const ref = this._filenameToRef.get(folderName);
    if (ref) {
      ref.current.scrollIntoView();
    }
  }
  _handleWheel(e) {
    e.preventDefault();
    const pos = getRotatedXY(e, 'delta', this.props.rotateMode);
    this.main.scrollTop += pos.y;
  }
  renderFolder(root, dirName, count, folderCtx) {
    this._filenameToRef.clear();
    const folders = root.folders.map((folder, ndx) => {
      const id = `folder-${folder.filename}`;
      const numFiles = folder.files.length;
      const ref = React.createRef();
      this._filenameToRef.set(folder.filename, ref);
      return (
        <Folder
          key={id}
          ref={ref}
          folder={folder}
          numFiles={numFiles}
          count={ndx}
          folderCount={folderCtx.folderCount + ndx}
          eventBus={this.props.eventBus}
          prefs={this.props.prefs}
        />
      );
    });
    return folders;
  }
  render() {
    const style = {
      display: this.props.show ? 'block' : 'none',
    };
    const folders = this.renderFolder(this.props.root, '', 0, { folderCount: 0 });
    return (<div ref={(main) => { this.main = main; }} style={style} className="folders">{folders}</div>);
  }
}

export {
  Folders as default,
};

