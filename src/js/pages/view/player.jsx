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
import {action} from 'mobx';
import {observer} from 'mobx-react';
import bind from '../../lib/bind';
import ActionEvent from '../../lib/action-event';
import {TimeUpdateEvent} from './viewer-events';

const _pauseIcon = '❚❚';
const _playIcon = '▶';
const _padZero = (num, size) => {
  return num.toString().padStart(size, '0');
};

@observer
class Player extends React.Component {
  constructor(props) {
    super(props);
    bind(
      this,
      '_changeTime',
      '_changeVolume',
      '_togglePlay',
    );
  }
  _changeTime(event) {
    this.props.eventBus.dispatch(new TimeUpdateEvent(event.target.value / event.target.max * this.props.videoState.duration));
  }
  _togglePlay() {
    this.props.eventBus.dispatch(new ActionEvent({action: 'togglePlay'}));
  }
  @action _changeVolume(e) {
    this.props.videoState.volume = e.target.value / 10000;
  }
  _getTime() {
    const totalSeconds = this.props.videoState.time | 0;
    const s = totalSeconds % 60;
    const m = (totalSeconds / 60 | 0) % 60;
    const h = totalSeconds / 60 / 60 | 0;

    return `${((h === 0) ? '' : `${_padZero(h, 2)}:`)}${_padZero(m, 2)}:${_padZero(s, 2)}`;
  }
  render() {
    const videoState = this.props.videoState;
    return (
      <div className="player">
        <div className="play" onClick={this._togglePlay}>{videoState.playing ? _pauseIcon : _playIcon}</div>
        <input className="que" onChange={this._changeTime} type="range" min="0" max="10000" value={videoState.time / videoState.duration * 10000} />
        <div className="time">{this._getTime()}</div>
        <div className="vol"><input onChange={this._changeVolume} className="volume" type="range" min="0" max="10000" value={videoState.volume * 10000} /></div>
      </div>
    );
  }
}

export {
  Player as default,
};
