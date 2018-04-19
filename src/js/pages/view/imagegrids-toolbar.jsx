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
import _ from 'lodash';
import {observer} from 'mobx-react';
import bind from '../../lib/bind';
import {actions} from '../../lib/actions';
import debug from '../../lib/debug';
import ForwardableEvent from '../../lib/forwardable-event';
import gridModes from './grid-modes';
import ActionEvent from '../../lib/action-event';
import {sortModes} from './folder-state-helper';

class FilterUpdateEvent extends ForwardableEvent {
  constructor(filter) {
    super('filterupdate');
    this.filter = filter.trim();
  }
}

class SetCollectionEvent extends ForwardableEvent {
  constructor(collection) {
    super('setcollection');
    this.collection = collection;
  }
}

class Range extends React.Component {
  constructor(props) {
    super(props);
    this.id = _.uniqueId('Range');
  }
  render() {
    return (
      <div className="range">
        <input
          id={this.id}
          type="range"
          value={this.props.value}
          min={this.props.min}
          max={this.props.max}
          onChange={this.props.onUpdate}
        />
      </div>
    );
  }
}

@observer
class ImagegridsToolbar extends React.Component {
  constructor(props) {
    super(props);
    this._logger = debug('ImagegridsToolbar');
    bind(
      this,
      '_updateFilter',
      '_handleKeyPress',
      '_selectCollection',
      '_changeGridMode',
      '_changeSortMode',
    );
    this.state = {
      filter: '',
    };
  }
  _makeButton(actionName) {
    const actionFuncs = this.props.actions;
    const action = actions[actionName];
    return (
      <button onClick={actionFuncs[actionName]} data-tooltip={action.hint}><img src={action.icon} /></button>
    );
  }
  _handleKeyPress(event) {
    if (event.key === 'Enter') {
      event.target.blur();
    }
  }
  _updateFilter(event) {
    this.setState({
      filter: event.target.value,
    });
    this.props.outEventBus.dispatch(new FilterUpdateEvent(event.target.value));
  }
  _changeGridMode() {
    this.props.outEventBus.dispatch(new ActionEvent({action: 'cycleGridMode'}));
  }
  _changeSortMode() {
    this.props.outEventBus.dispatch(new ActionEvent({action: 'cycleSortMode'}));
  }
  _selectCollection(event) {
    this.props.outEventBus.dispatch(new SetCollectionEvent(this.props.collections[event.target.value | 0]));
  }
  _getImagegridState() {
    return this.props.imagegridStateHolder.state || {  // FIX THIS!
      zoom: 1,
      currentCollection: undefined,
    };
  }

  render() {
    this._logger('render');
    const gridMode = gridModes.value(this.props.gridMode) || { icon: 'images/bad.png' };
    const sortMode = sortModes.value(this.props.sortMode) || { icon: 'images/bad.png' };
    return (
      <div className="toolbar imagegridstoolbar">
        {/*
        {this._makeButton('newCollection')}
        {this._makeButton('editCollection')}
        <div data-tooltip="collection">
          <select
            value={this.props.collections.indexOf(imagegridState.currentCollection)}
            onChange={this._selectCollection}
          >
            <option key="colletion--1" value="-1">all/none</option>
            {this.props.collections.map((collection, ndx) => {
              return (
                <option key={`collection-${ndx}`} value={ndx}>{collection.name}</option>  // eslint-disable-line
              );
            })}
          </select>
        </div>
        */}
        <div className="button-group">
          <button onClick={this._changeGridMode} data-tooltip={gridMode.hint}><img src={gridMode.icon} /></button>
          <button onClick={this._changeSortMode} data-tooltip={sortMode.hint}><img src={sortMode.icon} /></button>
        </div>
        <div className="zoom tooltip-high" data-tooltip="zoom">
          <Range
            value={this.props.zoom * 100}
            min={25}
            max={200}
            onUpdate={(e) => { this.props.setThumbnailZoom((e.target.value | 0) / 100); }}
          />
        </div>
        <div className="filter tooltip-high" data-tooltip="filter">
          <input
            placeholder="*.gif width:>100 type:jpeg folder:foo*"
            type="text"
            value={this.state.filter}
            onChange={this._updateFilter}
            onKeyPress={this._handleKeyPress}
            onBlur={this.props.filterInputBlurred}
            onFocus={this.props.filterInputFocused}
          />
        </div>
        <div className="button-group">
          {this._makeButton('splitVertical')}
          {this._makeButton('splitHorizontal')}
          {this._makeButton('deletePane')}
          {this._makeButton('showHelp')}
        </div>
      </div>
    );
  }
}

export {
  ImagegridsToolbar as default,
};
