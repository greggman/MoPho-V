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
import {autorun, action} from 'mobx';
import {observer} from 'mobx-react';
import Measure from 'react-measure';
import bind from '../../lib/bind';
import ForwardableEventDispatcher from '../../lib/forwardable-event-dispatcher';
import ForwardableEvent from '../../lib/forwardable-event';
import ListenerManager from '../../lib/listener-manager';
import ActionListener from '../../lib/action-listener';
import * as sizing from '../../lib/sizing';
import debug from '../../lib/debug';
import Player from './player';
import * as filters from '../../lib/filters';
import {CSSArray} from '../../lib/css-utils';
import {px, euclideanModulo} from '../../lib/utils';
import {getOrientationInfo} from '../../lib/rotatehelper';

let s_viewerCount = 0;

const modeNames = [
  'actualSize',
  'fitWidth',
  'fitHeight',
  'constrain',
  'stretch',
  'cover',
];

const modeInfo = {
  'actualSize': { desc: 'actual size', image: 'images/stretch-none.svg', },
  'fitWidth':   { desc: 'fit width',   image: 'images/stretch-horizontal.svg', },
  'fitHeight':  { desc: 'fit height',  image: 'images/stretch-vertical.svg', },
  'constrain':  { desc: 'constrain',   image: 'images/stretch-both.svg', },
  'stretch':    { desc: 'stretch',     image: 'images/stretch-both.svg', },
  'cover':      { desc: 'cover',       image: 'images/stretch-both.svg', },
};

const playbackRates = [1, 0.66, 0.5, 0.33, 0.25, 3, 2, 1.5];

@observer
class Viewer extends React.Component {
  constructor(props) {
    super(props);
    this._id = s_viewerCount++;
    this._logger = debug('Viewer', s_viewerCount);
    this._logger('ctor');
    this._baseRotation = 0;   // image's rotation based on exif orientation
    this._baseScale = [1, 1]; // image's flip based on exif orientation
    this._listenerManager = new ListenerManager();

    bind(
      this,
      'viewImage',
      '_hideImage',
      '_gotoNext',
      '_gotoPrev',
      '_rotate',
      '_changeStretchMode',
      '_handleResize',
      '_setVideoTime',
      '_hideInfo',
      '_hidePlayer',
      '_handleLoadedData',
      '_handleTimeUpdate',
    );

    this.state = {
      width: 0,
      height: 0,
      id: 0, // eslint-disable-line
      infoFlash: false,
      playerFlash: false,
    };
    this._currentFilename = '';
    this._currentFileInfo = undefined;   // this is set from state AFTER the image/video loads since it's not valid until then
    this._eventBus = new ForwardableEventDispatcher();
    this._eventBus.debugId = this._logger.getPrefix();

    this._loadMediaIfNew();
  }

  componentDidMount() {
    const on = this._listenerManager.on.bind(this._listenerManager);
    const viewerElem = this._viewerElem;
    const $ = viewerElem.parentElement.querySelector.bind(viewerElem.parentElement);
    this._viewImg = $('.viewer-img');
    this._viewVideo = $('.viewer-video');

    const video = this._viewVideo;
    on(video, 'loadeddata', this._handleLoadedData);
    on(video, 'timeupdate', this._handleTimeUpdate);

    autorun(() => {
      video.volume = this.props.viewerState.videoState.volume;
    });

    on(this._viewImg, 'load', () => {
      this._logger('imageLoad', window.frameCount);
      this._displayElem = this._viewImg;
      this._updateViewStateAfterMediaLoad();
    });

    const createSetPlaybackRateFn = (rate) => () => {
      this._setPlaybackRate(rate);
    };


    const cyclePlaybackSpeed = () => {
      const rate = this.props.viewerState.videoState.playbackRate;
      // works even if no match since result will be 0
      const ndx = (playbackRates.indexOf(rate) + 1) % playbackRates.length;
      this._setPlaybackRate(playbackRates[ndx]);
    };

    const actionListener = new ActionListener();
    this._actionListener = actionListener;
    actionListener.on('closeViewer', () => { this._hideImage(); });
    actionListener.on('zoomIn', () => { this._zoom(0.1); });
    actionListener.on('zoomOut', () => { this._zoom(-0.1); });
    actionListener.on('setLoop', () => { this._loop(); });
    actionListener.on('gotoPrev', (fe) => { this._gotoPrev(fe.domEvent); });
    actionListener.on('gotoNext', (fe) => { this._gotoNext(fe.domEvent); });
    actionListener.on('togglePlay', (fe) => { this._togglePlay(fe.domEvent); });
    actionListener.on('fastForward', () => { this._cueOrNextPrev(this.props.prefs.misc.stepForwardDuration); });
    actionListener.on('fastBackward', () => { this._cueOrNextPrev(-this.props.prefs.misc.stepBackwardDuration); });
    actionListener.on('scrollUp', (fe) => { // up
      fe.domEvent.stopPropagation();
      window.scrollBy(0, this.state.height / -4 | 0);
    });
    actionListener.on('scrollDown', (fe) => { // down
      fe.domEvent.stopPropagation();
      window.scrollBy(0, this.state.height / 4 | 0);
    });
    actionListener.on('setPlaybackSpeed1', createSetPlaybackRateFn(1   )); // 1  1
    actionListener.on('setPlaybackSpeed2', createSetPlaybackRateFn(0.66)); // 2  0.66
    actionListener.on('setPlaybackSpeed3', createSetPlaybackRateFn(0.5 )); // 3  0.5
    actionListener.on('setPlaybackSpeed4', createSetPlaybackRateFn(0.33)); // 4  0.33
    actionListener.on('setPlaybackSpeed5', createSetPlaybackRateFn(0.25)); // 5  0.25
    actionListener.on('cyclePlaybackSpeed', cyclePlaybackSpeed); // 1  1
    actionListener.on('toggleSlideshow', (fe) => { this.toggleSlideshow(fe.domEvent); });
    actionListener.on('rotate', (fe) => { fe.stopPropagation(); this._rotate(fe.domEvent); });
    actionListener.on('changeStretchMode', (fe) => { this._changeStretchMode(fe.domEvent); });
    on(this._eventBus, 'action', this._actionListener.routeAction);

    this._logger('register for action on emitter:', this.props.eventBus.debugId);
    on(this._eventBus, 'timeupdate', this._setVideoTime);

    this.props.eventBus.setForward(this._eventBus);
  }
  componentWillUnmount() {
    this._logger('close');
    this._clearSlideshow();
    this._actionListener.close();
    this.props.eventBus.setForward(null);
    this._listenerManager.removeAll();
  }
  @action _setPlaybackRate(rate) {
    const video = this._viewVideo;
    video.playbackRate = rate;
    this.props.viewerState.videoState.playbackRate = rate;
  }
  @action _handleLoadedData() {
    const video = this._viewVideo;
    this._displayElem = video;
    this.props.viewerState.videoState.duration = video.duration;
    this._updateViewStateAfterMediaLoad();
    this._play();
  }
  @action _updateViewStateAfterMediaLoad() {
    const good =  !this._pendingFileInfo.bad;
    const fileInfo = good ? this._pendingFileInfo : {
      bad: true,
      type: 'image/png',
      filename: this._pendingFileInfo.filename,
      width: 256,
      height: 256,
    };
    this._currentFileInfo = fileInfo;

    const orientInfo = getOrientationInfo(fileInfo, fileInfo.orientation);
    this._baseRotation = orientInfo.rotation;
    this._baseScale = orientInfo.scale;

    // this.setState({
    //   infoFlash: true,
    // });
    // setTimeout(this._hideInfo, 400);

    this.props.viewerState.filename = fileInfo.filename;
    this.props.viewerState.mimeType = fileInfo.type;

    this.setState((prevState) => ({
      id: prevState.id + 1,
    }));
  }
  @action _handleTimeUpdate() {
    const video = this._viewVideo;
    const videoState = this.props.viewerState.videoState;
    if (videoState.loop === 2) {
      if (video.currentTime >= videoState.loopEnd) {
        video.currentTime = videoState.loopStart;
      }
    }
    videoState.time = video.currentTime;
  }
  _bumpId() {
    this.setState((prevState) => ({
      id: prevState.id + 1,
    }));
  }
  _getRotation() {
    return (this.props.viewerState.rotation + this._baseRotation) % 360;
  }

  _adjustSize(fileInfo, style) {
    const display = this._getDisplayDimensions();
    const size = sizing[this.props.viewerState.stretchMode](fileInfo.width, fileInfo.height, display.width, display.height);
    const t = this._computeTransformAtCenter(fileInfo, size.width, size.height);
    this._moveIfOffScreen(t, 'x', 'w');
    this._moveIfOffScreen(t, 'y', 'h');
    this._setTransform(t, style);
    // force the size because SVG doesn't have one
    style.width = px(fileInfo.width);
    style.height = px(fileInfo.height);
  }

  @action _changeStretchMode() {
    const newModeNdx = (modeNames.indexOf(this.props.viewerState.stretchMode) + 1) % modeNames.length;
    this.props.viewerState.stretchMode = modeNames[newModeNdx];
  }

  @action _rotate() {
    this.props.viewerState.rotation = (this.props.viewerState.rotation + 270) % 360;
  }

  @action _zoom(z) {
    this.props.viewerState.zoom += z;
  }

  @action _loop() {
    const videoState = this.props.viewerState.videoState;
    if (this._displayElem instanceof HTMLVideoElement) {
      switch (videoState.loop) {
        case 0:  // not looping, set start
          videoState.loop = 1;
          videoState.loopStart = this._displayElem.currentTime;
          break;
        case 1:  // start set, set end
          videoState.loop = 2;
          videoState.loopEnd = this._displayElem.currentTime;
          if (videoState.loopStart > videoState.loopEnd) {
            const t = videoState.loopStart;
            videoState.loopStart = videoState.loopEnd;
            videoState.loopEnd = t;
          }
          break;
        case 2:
          videoState.loop = 0;
          break;
        default:
          break;
      }
    }
  }

  _handleResize(contentRect) {
    this._logger('handleResize');
    if (this._displayElem &&
        (this.state.width !== contentRect.client.width ||
         this.state.height !== contentRect.client.height)) {
      this.setState({
        width: contentRect.client.width,
        height: contentRect.client.height,
      });
    }
  }

  nextSlide() {
    this._gotoNext();
  }

  @action _setVideoTime(event) {
    const video = this._viewVideo;
    const videoState = this.props.viewerState.videoState;
    video.currentTime = Math.max(0, Math.min(event.time, video.duration));
    videoState.time = video.currentTime;
  }

  _loadVideo(url) {
    this._pause();
    const video = this._viewVideo;
    video.src = url;
    video.load();
  }

  @action _play() {
    const video = this._viewVideo;
    const videoState = this.props.viewerState.videoState;
    video.play();
    video.playbackRate = videoState.playbackRate;
    videoState.playing = true;
  }

  @action _pause() {
    const video = this._viewVideo;
    const videoState = this.props.viewerState.videoState;
    video.pause();
    video.playing = false;
    videoState.playing = false;
  }

  _togglePlay() {
    const video = this._viewVideo;
    if (video.paused) {
      this._play();
    } else {
      this._pause();
    }
  }

  _clearSlideshow() {
    this._slideshow = false;
    if (this._slideshowId) {
      clearTimeout(this._slideshowId);
      this._slideshowId = undefined;
    }
  }

  toggleSlideshow() {
    if (this._slideshow) {
      this._clearSlideshow();
    } else {
      this._slideshow = true;
      this._gotoNext();
    }
  }

  _gotoNext() {
    this._eventBus.dispatch(new ForwardableEvent('gotoNext'));
  }

  _gotoPrev() {
    this._eventBus.dispatch(new ForwardableEvent('gotoPrev'));
  }

  _isRotated90() {
    return this._getRotation() / 90 % 2 === 1;
  }

  _getDisplayDimensions() {
    if (this._isRotated90()) {
      return {
        width: this.state.height,
        height: this.state.width,
      };
    } else {
      return {
        width: this.state.width,
        height: this.state.height,
      };
    }
  }

  _computeTransformAtCenter(fileInfo, width, height) {
    const sx = width  / fileInfo.width;
    const sy = height / fileInfo.height;
    const scale = Math.max(sx, sy) * this.props.viewerState.zoom;

    // If we did nothing, no scale, no translation, it would be here
    //
    //     +----+-------+
    //     |    |       |
    //     |    |       |
    //     |    |       |
    //     +----+       |
    //     |            |
    //     +------------+
    //
    // After scaling it could be one of these because it scales around the center of the image
    //
    //                         +------+
    //     +------------+      |+-----+------+
    //     |+--+        |      ||     |      |
    //     ||  |        |      ||     |      |
    //     ||  |        |  or  ||     |      |
    //     |+--+        |      ||     |      |
    //     |            |      ++-----+      |
    //     +------------+       +------------+
    //
    //
    const displayCenterX = this.state.width  / 2;
    const displayCenterY = this.state.height / 2;

    const imgDisplayWidth  = this._isRotated90() ? height : width;
    const imgDisplayHeight = this._isRotated90() ? width  : height;

    const origCenterX = fileInfo.width  / 2;
    const origCenterY = fileInfo.height / 2;

    const x = displayCenterX - origCenterX;
    const y = displayCenterY - origCenterY;

    const newLeft = origCenterX + x - (imgDisplayWidth  / 2);
    const newTop  = origCenterY + y - (imgDisplayHeight / 2);

    return {
      x: x,
      y: y,
      scale: scale,
      s: {
        x: sx,
        y: sy,
        w: fileInfo.width * scale,
        h: fileInfo.height * scale,
      },
      displayCenter: {
        x: displayCenterX,
        y: displayCenterY,
      },
      imgDisplay: {
        w: imgDisplayWidth,
        h: imgDisplayHeight,
      },
      orig: {
        centerX: origCenterX,
        centerY: origCenterY,
        w:   fileInfo.width,
        h:   fileInfo.height,
      },
      newMin: {
        x: newLeft,
        y: newTop,
      },
    };
  }

  _adjustToCenter(t, axis, dim, winSize, winScroll) {
    let scrollBy = 0;
    let delta = t.imgDisplay[dim] - winSize;
    if (delta > 0) {
      t[axis] -= delta / 2;
    }
    if (t.newMin[axis] < 0) {
      scrollBy = -t.newMin[axis];
    } else {
      const newMax = t.newMin[axis] + t.s[dim];
      const winBot = winScroll + winSize;
      delta = newMax - winBot;
      if (delta > 0) {
        scrollBy = -delta;
      }
    }
    return scrollBy;
  }

  _setTransform(t, style) {
    const scrollLeft = 0; // this._parentElem.scrollLeft;
    const scrollTop  = 0; // this._parentElem.scrollTop;
    this._adjustToCenter(t, 'x', 'w', this.state.width,  scrollLeft);
    this._adjustToCenter(t, 'y', 'h', this.state.height, scrollTop);
    const translationPart = `translate(${px(t.x + scrollLeft)},${px(t.y + scrollTop)})`;

    const scalePart = `scale(${Math.max(t.scale)})`;
    const rotatePart = `rotate(${this._getRotation()}deg)`;
    const flipPart = `scale(${this._baseScale.join(',')})`;

    style.transform = `${translationPart} ${rotatePart} ${scalePart} ${flipPart}`;
  }

  _moveIfOffScreen(t, axis) {
    if (t.newMin[axis] < 0) {
      t[axis] -= t.newMin[axis];
    }
  }

  _cue(seconds) {
    if (this._displayElem instanceof HTMLVideoElement) {
      const newTime = euclideanModulo(this._displayElem.currentTime + seconds, this._displayElem.duration);
      this._logger('cue: oldTime:', this._displayElem.currentTime, 'newTime:', newTime);
      this._displayElem.currentTime = newTime;
    }
  }

  _cueOrNextPrev(seconds) {
    if (this._displayElem instanceof HTMLVideoElement) {
      this._cue(seconds);
    } else {
      if (seconds > 0) {
        this._gotoNext();
      } else {
        this._gotoPrev();
      }
    }
  }

  @action _hideImage(/* event */) {
    this._logger('hideImage');
    this._clearSlideshow();
    this._displayElem = undefined;
    //    this._pause();
    this._eventBus.dispatch(new ForwardableEvent('hide'));
  }

  _hidePlayer() {
    this.setState({
      playerFlash: false,
    });
  }

  _hideInfo() {
    this.setState({
      infoFlash: false,
    });
  }

  @action _showNewMedia(err, mediaInfo, fileInfo) {
    // TODO: handle error
    const good = !err && !fileInfo.bad;
    const { url, type } = good ? mediaInfo : { url: 'images/bad.png', type: 'image/png'};
    this._pendingFileInfo = fileInfo;

    if (filters.isMimeVideo(type)) {
      this.props.viewerState.videoState.loop = 0;
      this._pause();
      this._loadVideo(url);
      // this.setState({
      //   playerFlash: true,
      // });
      // setTimeout(this._hidePlayer, 1000);
    } else {
      this._viewImg.src = url;
      this._pause();
    }

    if (this._slideshow) {
      const slideshowDuration = this.props.prefs.slideshowDuration;
      let timeout = slideshowDuration[type];
      if (!timeout) {
        const baseType = type.split('/')[0];
        timeout = slideshowDuration[baseType];
      }
      timeout = timeout || slideshowDuration.default;
      this._clearSlideshow();
      this._slideshow = true;
      this._slideshowId = setTimeout(this._gotoNext, timeout * 1000);
    }
  }

  viewImage(event, fileInfo /* , noHide */) {
    this.props.mediaManager.requestMedia(fileInfo, (err, mediaInfo) => {
      this._showNewMedia(err, mediaInfo, fileInfo);
    });
  }

  _loadMediaIfNew() {
    const viewerState = this.props.viewerState;
    const fileInfo = viewerState.fileInfo;
    const filename = fileInfo.filename;
    if (this._currentFilename !== filename) {
      this._currentFilename = filename;
      this.props.mediaManager.requestMedia(fileInfo, (err, info) => {
        this._showNewMedia(err, info, fileInfo);
      });
    }
  }


  render() {
    this._logger('render', window.frameCount);
    this._loadMediaIfNew();
    const viewerState = this.props.viewerState;
    const isVideo = filters.isMimeVideo(viewerState.mimeType);
    const isImage = filters.isMimeImage(viewerState.mimeType);
    const imageStyle = {
      display: isImage ? 'inline-block' : 'none',
      width: px()
    };
    const videoStyle = {
      display: isVideo ? 'inline-block' : 'none',
    };
    const elemStyle = isImage ? imageStyle : videoStyle;
    const viewElemStyle = {
      display: 'none', // this.state.viewElemDisplay,
    };
    if (this._displayElem) {
      const fileInfo = this._currentFileInfo;
      viewElemStyle.display = 'block';
      this._adjustSize(fileInfo, elemStyle);
    }
    const infoClasses = new CSSArray('info');
    infoClasses.addIf(this.state.infoFlash, 'flash');
    const videoClasses = new CSSArray('pspot');
    videoClasses.addIf(!isVideo, 'hide');
    videoClasses.addIf(this.state.playerFlash, 'flash');
    return (
      <Measure client onResize={this._handleResize}>
        {({ measureRef }) => {
          return (
            <div
              style={viewElemStyle}
              className="viewer"
              ref={(viewer) => {
                if (viewer && viewer !== this._viewerElem) {
                  this._viewerElem = viewer;
                  measureRef(viewer);
                }
              }}
            >
              <div className="back" onClick={() => { this.props.setCurrentView(); }}></div>
              <div className="view-holder">
                <div className="viewer-content">
                  <img style={imageStyle} className="viewer-img" draggable="false" alt="" />
                  <video style={videoStyle} className="viewer-video" autoPlay loop draggable="false"></video>
                </div>
                <div className={infoClasses}>{viewerState.filename}</div>
                <div className="prev" onClick={this._gotoPrev}><img src="images/prev.svg" /></div>
                <div className="next" onClick={this._gotoNext}><img src="images/next.svg" /></div>
                <div className="ui">
                  <div className="stretch" onClick={this._changeStretchMode}>
                    <img src={modeInfo[viewerState.stretchMode].image} />
                  </div>
                  <div className="rotate" onClick={this._rotate}>
                    <img src="images/rotate.svg" />
                  </div>
                  <div className="close" onClick={this._hideImage}>
                    <img src="images/close.svg" />
                  </div>
                </div>
                <div className={videoClasses}>
                  <Player
                    videoState={viewerState.videoState}
                    video={this._viewVideo}
                    eventBus={this._eventBus}
                  />
                </div>
              </div>
            </div>
          );
        }}
      </Measure>
    );
  }
}

export {
  Viewer as default,
};

