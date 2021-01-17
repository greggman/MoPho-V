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
import {observable, action, toJS} from 'mobx';
import {observer} from 'mobx-react';
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import ForwardableEventDispatcher from '../../lib/forwardable-event-dispatcher';
import ListenerManager from '../../lib/listener-manager';
import MediaManagerClient from '../../lib/media-manager-client';
import ForwardableEvent from '../../lib/forwardable-event';
import ImageGrids from './image-grids';
import Viewer from './viewer';
import {CSSArray} from '../../lib/css-utils';
import {euclideanModulo} from '../../lib/utils';

let g_vpairCount = 0;

@observer
class VPair extends React.Component {
  constructor(props) {
    super(props);
    this._logger = debug('VPair', ++g_vpairCount);
    this._logger('ctor');
    this._downstreamEventBus = new ForwardableEventDispatcher();
    this._downstreamEventBus.debugId = `${this._logger.getPrefix()}-downstream`;
    this._eventBus = new ForwardableEventDispatcher();
    this._eventBus.debugId = this._logger.getPrefix();
    this._mediaManager = new MediaManagerClient();
    bind(
      this,
      '_close',
      '_gotoNext',
      '_gotoPrev',
      '_gotoImage',
      '_setCurrentNdx',
      '_handleClick',
      '_setCurrentView',
      '_handleActions',
      '_viewCurrentIndex',
      '_startViewingImage',
      '_stopViewingImage',
      '_saveScrollTop',
    );

    const videoState = observable({
      playing: false,
      time: 0,
      duration: 1,
      playbackRate: 1,
      volume: 1,
      loop: 0,   // 0 no loop, 1 = start set, 2 = start and end set (looping)
      loopStart: 0,
      loopEnd: 1,
    });

    this._viewerState = observable.object({
      viewing: false,
      mimeType: 'image',  // mimeType image, video
      filename: '',
      fileInfo: {},
      duration: 1,
      rotation: 0,
      stretchMode: 'constrain',
      zoom: 1,
      slideshow: false,
      videoState: videoState,
    }, {}, {deep: false});

    const initialState = Object.assign(props.initialState ? toJS(props.initialState) : {
      currentCollection: undefined,
    });

    this._imagegridState = observable.object(initialState, {}, {deep: false});

    this.state = {
      currentImageIndex: -1,
      gotoFolderNdx: -1,
    };
    // should this be state? I don't want it to re-render!
    this._imagegridsScrollTop = 0;

    this._viewing = false;
    this.props.setCurrentView(this);
    this._listenerManager = new ListenerManager();
    const on = this._listenerManager.on.bind(this._listenerManager);
    const eventBus = this._eventBus;
    on(eventBus, 'action', this._handleActions);
    on(eventBus, 'setCurrentNdx', this._setCurrentNdx);
    on(eventBus, 'gotoNext', this._gotoNext);
    on(eventBus, 'gotoPrev', this._gotoPrev);
    on(eventBus, 'view', this._startViewingImage);
    on(eventBus, 'hide', this._stopViewingImage);
    on(eventBus, 'goToImage', this._gotoImage);
  }
  componentWillMount() {
    this.props.registerVPair(this);
  }
  componentWillUnmount() {
    this.props.unregisterVPair(this);
    this._mediaManager.close();
    this._listenerManager.removeAll();
  }
  getViewerState() {
    return this._viewerState;
  }
  getImagegridState() {
    return this._imagegridState;
  }
  getDownstreamEventBus() {
    return this._downstreamEventBus;
  }
  getEventBus() {
    return this._eventBus;
  }
  @action _startViewingImage(event, fileInfo) {
    this._viewerState.viewing = true;
    this._viewerState.fileInfo = fileInfo;
    this._viewerState.mimeType = fileInfo.type;
  }
  @action _stopViewingImage() {
    this._viewerState.viewing = false;
  }
  _setCurrentNdx(forwardableEvent, ndx) {
    this._logger('setCurrentImage:', ndx);
    this.setState({
      currentImageIndex: ndx,
    });
  }
  _close(e) {
    e.stopPropagation();
    this.props.closeView(this);
  }
  _gotoImage(event, ndx, folderNdx) {
    this._eventBus.dispatch(new ForwardableEvent('hide'));
    // This is a CRAP!
    // The issue is the user is using the VIEWER
    // this message means (close the viewer, open the imagegrids, set it to a certain folder)
    // Since if the user is using the viewer the ImageGrids does not exist yet
    // the message we're dispatching will be lost. Hacky solution is
    // to pass the folder we want so when the ImageGrids is instanciated
    // it can start at the folder. On the other hand, once it's started
    // we don't want to base it off state since the user should be able
    // to freely scroll. Maybe a different solution would be able compute
    // the scroll position but we don't know the scroll position since it's
    // the imagegrids that computes that info.
    // See _saveScrollTop below for rest of hack
    this.setState({
      gotoFolderNdx: folderNdx,
    });
    this._eventBus.dispatch(new ForwardableEvent('scrollToImage'), ndx, folderNdx);
  }
  _viewImage(imgNdx) {
    let ndx = imgNdx;
    this._logger('viewImage: ', ndx);
    const folders = this.props.root.folders;
    for (let folderNdx = 0; folderNdx < folders.length; ++folderNdx) {
      const folder = folders[folderNdx];
      if (ndx < folder.files.length) {
        this._eventBus.dispatch(new ForwardableEvent('view'), folder.files[ndx].info);
        return;
      }
      ndx -= folder.files.length;
    }
    throw new Error('image index out of range');
  }
  _viewCurrentIndex() {
    this._viewImage(this.state.currentImageIndex);
  }
  _gotoNext() {
    const root = this.props.root;
    this.setState((prevState) => ({
      currentImageIndex: (prevState.currentImageIndex + 1) % root.totalFiles,
    }), this._viewCurrentIndex);
  }
  _gotoPrev() {
    const root = this.props.root;
    this.setState((prevState) => ({
      currentImageIndex: euclideanModulo(prevState.currentImageIndex - 1, root.totalFiles),
    }), this._viewCurrentIndex);
  }
  _setCurrentView() {
    this._logger('setCurrentView');
    this.props.setCurrentView(this);
  }
  _handleClick() {
    this._setCurrentView();
  }
  _handleActions(...args) {
    this.props.actionListener.routeAction(...args);
  }
  _saveScrollTop(scrollTop) {
    this._imagegridsScrollTop = scrollTop;
    // This is a hack! See _gotoImage above
    if (this.state.gotoFolderNdx >=  0) {
      this.setState({
        gotoFolderNdx: -1,
      });
    }
  }
  render() {
    const classes = new CSSArray('vpair');
    classes.addIf(this.props.isCurrentView, 'active');
    return (
      <div className={classes} onClick={this._handleClick}>
        { this._viewerState.viewing ? (
          <Viewer
            options={this.props.options}
            eventBus={this._eventBus}
            downstreamEventBus={this._downstreamEventBus}
            viewerState={this._viewerState}
            prefs={this.props.prefs}
            mediaManager={this._mediaManager}
            setCurrentView={this._setCurrentView}
            rotateMode={this.props.rotateMode}
          />
        ) : (
          <ImageGrids
            gotoFolderNdx={this.state.gotoFolderNdx}
            scrollTop={this._imagegridsScrollTop}
            saveScrollTop={this._saveScrollTop}
            root={this.props.root}
            options={this.props.options}
            prefs={this.props.prefs}
            settings={this.props.settings}
            winState={this.props.winState}
            imagegridState={this._imagegridState}
            eventBus={this._eventBus}
            rotateMode={this.props.rotateMode}
            gridMode={this.props.gridMode}
            setCurrentView={this._setCurrentView}
            currentImageIndex={this.state.currentImageIndex}
          />
        )}
        <div className="close-vpair" onClick={this._close}>❎</div>
        <div className="tick">◤</div>
        <div className="spacer"></div>
      </div>
    );
  }
}

export {
  VPair as default,
};
