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
import Measure from 'react-measure';
import _ from 'lodash';
import {ipcRenderer} from 'electron';  // eslint-disable-line
import Yoga from '../../../../app/3rdparty/Yoga.bundle';
import bind from '../../lib/bind';
import debug from '../../lib/debug';
import VPair from './vpair';
import ForwardableEventDispatcher from '../../lib/forwardable-event-dispatcher';
import ActionListener from '../../lib/action-listener';
import {getRotatedXY} from '../../lib/rotatehelper';
import {px} from '../../lib/utils';

window.Yoga = Yoga;
window.Yconfig = Yoga.Config.create();
window.Ynode = Yoga.Node.create(window.Yconfig);

const assert = console.assert.bind(console);
const sliderSize = 5;
const splitMinSize = 10;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function fudge(v) {
  return Math.round(v);
}

class Two {
  constructor(id) {
    this.splitType = Two.NONE;
    this.id = id || Two.createId();
    this.children = [];
    this.sliderPos = 0;       // position of slider in pixels. Read only
    this.sliderPercent = 0;   // position of slider in percent. This is the source position
    this.bounds = {
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    };
  }
  restore(data, twos) {
    let active;
    this.splitType = data.splitType;
    this.sliderPercent = data.sliderPercent;
    this.children = data.children.map((child) => {
      const two = new Two();
      twos[two.id] = two;
      const maybe = two.restore(child, twos);
      active = active || maybe;
      two._setParent(this);
      return two;
    });
    return this.children.length ? null : this;
  }
  layout(width, height) {
    const config = Yoga.Config.create();
    const twos = [];
    const root = this._makeNode(config, twos);
    root.setWidth(width);
    root.setHeight(height);
    root.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);
    this._applyLayout(root, 0, 0);
    root.freeRecursive();
    config.free();
    return twos;
  }
  dump() {
    return {
      splitType: this.splitType,
      sliderPercent: this.sliderPercent,
      children: this.children.map((child) => child.dump()),
    };
  }
  _makeNode(config, twos) {
    const node = Yoga.Node.create(config);
    node.setFlexGrow(1);
    node.setFlexBasis(1);
    node.setFlexDirection(this.splitType === Two.HORIZONTAL ? Yoga.FLEX_DIRECTION_COLUMN : Yoga.FLEX_DIRECTION_ROW);
    assert(this.children.length === 0 || this.children.length === 2);
    const child0 = this.children[0];
    const child1 = this.children[1];
    if (child0) {
      const childNode = child0._makeNode(config, twos);
      childNode.setFlexGrow(0);
      childNode.setFlexBasis(`${this.sliderPercent * 100}%`);
      node.insertChild(childNode, 0);
    }
    twos.push(this);
    const needSlider = this.splitType !== Two.NONE;
    if (needSlider) {
      assert(child0 && child1);
      const sliderNode = Yoga.Node.create(config);
      sliderNode.setFlexGrow(0);
      sliderNode.setFlexBasis(sliderSize);
      node.insertChild(sliderNode, 1);
    }
    if (child1) {
      node.insertChild(child1._makeNode(config, twos), needSlider ? 2 : 1);
    }
    return node;
  }
  _applyLayout(node, xOff, yOff) {
    const x = xOff + node.getComputedLeft();
    const y = yOff + node.getComputedTop();
    this.bounds.left = x;
    this.bounds.top = y;
    this.bounds.width = node.getComputedWidth();
    this.bounds.height = node.getComputedHeight();
    assert(this.children.length === 0 || this.children.length === 2);
    const child0 = this.children[0];
    const child1 = this.children[1];
    if (child0) {
      child0._applyLayout(node.getChild(0), x, y);
    }
    const needSlider = this.splitType !== Two.NONE;
    if (needSlider) {
      const sliderNode = node.getChild(1);
      const sx = x + sliderNode.getComputedLeft();
      const sy = y + sliderNode.getComputedTop();
      this.sliderPos = this.splitType === Two.HORIZONTAL ? sy : sx;
    }
    if (child1) {
      child1._applyLayout(node.getChild(needSlider ? 2 : 1), x, y);
    }
  }
  _removeChild(child) {
    const ndx = this.children.indexOf(child);
    assert(ndx >= 0, 'it is our child');
    this.children.splice(ndx, 1);
  }
  _addChild(child) {
    assert(this.children.length < 2, 'less than 2 children');
    this.children.push(child);
  }
  _setParent(parent) {
    if (this.parent) {
      this.parent._removeChild(this);
    }
    this.parent = parent;
    if (parent) {
      parent._addChild(this);
    }
  }
  getRightMost() {
    let current = this;
    while (current.children.length) {
      current = current.children[current.children.length - 1];
    }
    return current;
  }
  getLeftMost() {
    let current = this;
    while (current.children.length) {
      current = current.children[0];
    }
    return current;
  }
  getPrev() {
    const parent = this.parent;
    if (!parent) {
      return this.getRightMost();
    }
    // are we the right child?
    if (parent.children.length === 2 && parent.children[1] === this) {
      return parent.children[0].getRightMost();
    }
    // we're the left child
    return parent.getPrev();
  }
  getNext() {
    const parent = this.parent;
    if (!parent) {
      return this.getLeftMost();
    }
    // are we the left child?
    if (parent.children.length === 2 && parent.children[0] === this) {
      return parent.children[1].getLeftMost();
    }
    // we're the right child
    return parent.getNext();
  }
  split(splitType) {
    assert(this.splitType === Two.NONE, 'not already split');
    assert(this.children.length === 0, 'we have no children');
    // when we split we make a new copy of ourself,
    // add that copy as our child and make a new child
    const clone = new Two(this.id);
    this.id = Two.createId();  // we need a new id since our clone has our id
    this.splitType = splitType;
    this.sliderPercent = .5;
    clone._setParent(this);
    const newSibling = new Two();
    newSibling._setParent(this);
    return newSibling;
  }
  delete() {
    assert(this.parent, 'we have a parent');
    assert(this.children.length === 0, 'we have no children');
    // When we delete ourself our parent will copy all the siblings info.
    const parent = this.parent;
    this._setParent(null);
    assert(parent.children.length === 1, 'there is one sibling');
    const sibling = parent.children[0];
    parent.id = sibling.id;
    parent.splitType = sibling.splitType;
    parent.sliderPos = sibling.sliderPos;
    parent.sliderPercent = sibling.sliderPercent;
    sibling._setParent(null);
    sibling.children.slice().forEach((child) => {
      child._setParent(parent);
    });
    // Find a child with a view
    let node = parent;
    while (node.children.length) {
      node = node.children[0];
    }
    return node;
  }
  slide(dx, dy) {
    assert(this.children.length === 2, 'we have 2 children');
    assert(this.splitType !== Two.NONE, 'split type set');
    const horizontal = this.splitType === Two.HORIZONTAL;
    const delta = horizontal ? dy : dx;
    const size = this._getBoundsSize();
    const oldSliderPos = fudge(size * this.sliderPercent);
    const newSliderPos = clamp(oldSliderPos + delta | 0, splitMinSize, size - splitMinSize);
    const changed = oldSliderPos !== newSliderPos;
    if (changed) {
      // There's an issue here which is if you make sliders as small as they can go
      // but then size the window smaller they'll all get even smaller
      this.sliderPercent = clamp(newSliderPos / size, 0, 1);
      // window.depth = 1;
      // console.log('---start---: delta:', delta, this.id, 'oldPos:', oldSliderPos, 'newPos:', newSliderPos);
      this._slideFirstChildSlider(size, delta, true);
      this._slideSecondChildSlider(size, delta, true);
    }
    return changed;
  }
  _slideFirstChildSlider(newSize, delta, keepFirstSize) {
    // ++window.depth;
    if (this.children.length === 2) {
      const newFirstSize = fudge(newSize * this.sliderPercent);
      // console.log(''.padStart(window.depth * 2), 'slide1stChildSlider:', 'new1stSize:', newFirstSize);
      this.children[0]._slideSliderForNewSize(newFirstSize, delta, this.splitType, keepFirstSize);
    }
    // --window.depth;
  }
  _slideSecondChildSlider(newSize, delta, keepFirstSize) {
    // ++window.depth;
    if (this.children.length === 2) {
      const newFirstSize = fudge(newSize * this.sliderPercent);
      const newSecondSize = newSize - newFirstSize - sliderSize;
      // console.log(''.padStart(window.depth * 2), 'slide2ndChildSlidr:', 'new2ndSize:', newSecondSize)
      this.children[1]._slideSliderForNewSize(newSecondSize, delta, this.splitType, !keepFirstSize);
      // --window.depth;
    }
  }
  _slideSliderForNewSize(newSize, delta, parentSplitType, keepFirstSize) {
    if (this.children.length !== 2 || this.splitType !== parentSplitType) {
      return;
    }
    // ++window.depth;
    if (keepFirstSize) {
      const oldSliderPos = fudge(this._getBoundsSize() * this.sliderPercent);
      const newSliderPos = oldSliderPos;
      this.sliderPercent = newSliderPos / newSize;
      // console.log(''.padStart(window.depth * 2), 'keep1st', this.id, 'oldPos:', t(oldSliderPos), 'newPos:', t(newSliderPos), 'newSize:', t(newSizeOfFirst));
      this._slideSecondChildSlider(newSize, delta, false);
    } else {
      const oldSliderPos = fudge(this._getBoundsSize() * this.sliderPercent);
      const newSliderPos = oldSliderPos - delta;
      this.sliderPercent = newSliderPos / newSize;
      // console.log(''.padStart(window.depth * 2), 'keep2nd', this.id, 'oldPos:', t(oldSliderPos), 'newPos:', t(newSliderPos), 'newSize:', t(newSizeOfSecond));
      this._slideFirstChildSlider(newSize, delta, false);
    }
    // --window.depth;
  }
  _getBoundsSize() {
    return this.splitType === Two.HORIZONTAL ? this.bounds.height : this.bounds.width;
  }
  _setBoundsSize(size, horizontal) {
    if (horizontal) {
      this.bounds.height = size;
    } else {
      this.bounds.width = size;
    }
  }
}

let g_twoCount = 0;
Two.createId = () => `two-${++g_twoCount}`;

Two.NONE = 0;
Two.HORIZONTAL = 1;
Two.VERTICAL = 2;

class ViewSplit extends React.Component {
  constructor(props) {
    super(props);
    this._logger = debug('ViewSplit');
    this._logger('ctor');
    bind(
      this,
      '_handleResize',
      '_setCurrentView',
      '_splitHorizontal',
      '_splitVertical',
      '_deletePane',
      '_handleActions',
      '_registerVPair',
      '_unregisterVPair',
      '_handleSliderMouseDown',
      '_handleSliderMouseMove',
      '_handleSliderMouseUp',
      '_saveLayout',
      '_activateNextView',
      '_activatePrevView',
      // '_forwardAction',
    );

    this._saveLayout = _.debounce(this._saveLayout, 500);

    const two = new Two();
    this._root = two;
    this._currentTwo = two;
    this._vpairs = {};
    this._twos = {};

    if (props.startingLayout) {
      this._currentTwo = this._root.restore(props.startingLayout, this._twos);
    }

    this.state = {
      treeVersion: 0,  // eslint-disable-line
      currentId: 0,    // eslint-disable-line
      dimensions: {
        width: -1,
        height: -1,
      },
    };

    this._eventBus = new ForwardableEventDispatcher();
    this._eventBus.debugId = this._logger.getPrefix();
    this._eventBus.on('action', this._handleActions);

    this._actionListener = new ActionListener();
    this._actionListener.on('splitHorizontal', this._splitHorizontal);
    this._actionListener.on('splitVertical', this._splitVertical);
    this._actionListener.on('deletePane', this._deletePane);
    this._actionListener.on('nextView', this._activateNextView);
    this._actionListener.on('prevView', this._activatePrevView);
  }
  componentDidMount() {
    this.props.setCurrentView(this);
  }
  componentWillUnmount() {
    this._uninstallSliderMouseHandlers();
    this._actionListener.close();
  }
  getEventBus() {
    return this._eventBus;
  }
  getViewerState() {
    return this._currentView.getViewerState();
  }
  getImagegridState() {
    return this._currentView.getImagegridState();
  }
  _saveLayout() {
    ipcRenderer.send('saveSplitLayout', this._root.dump());
  }
  _handleResize(contentRect) {
    const width = contentRect.client.width;
    const height = contentRect.client.height;
    this._logger('old dim:', `${this.state.dimensions.width}x${this.state.dimensions.height}`, 'new dim:', `${width}x${height}`);
    if (this.state.dimensions.width !== width || this.state.dimensions.height !== height) {
      this.setState({
        dimensions: {
          width,
          height,
        },
      });
    }
  }
  _handleActions(...args) {
    this._actionListener.routeAction(...args);
  }
  _bumpTreeVersion() {
    this._saveLayout();
    this.setState((prevState) => ({
      treeVersion: prevState.treeVersion + 1,
    }));
  }
  _registerVPair(vpair) {
    this._vpairs[vpair.props.twoId] = vpair;
  }
  _unregisterVPair(vpair) {
    delete this._vpairs[vpair.props.twoId];
  }
  _splitHorizontal(forwardableEvent) {
    forwardableEvent.stopPropagation();
    const stateOfViewBeingSplit = this.getImagegridState();
    const two = this._currentTwo.split(Two.HORIZONTAL);
    two.initialState = stateOfViewBeingSplit;
    this._bumpTreeVersion();
  }
  _splitVertical(forwardableEvent) {
    forwardableEvent.stopPropagation();
    const stateOfViewBeingSplit = this.getImagegridState();
    const two = this._currentTwo.split(Two.VERTICAL);
    two.initialState = stateOfViewBeingSplit;
    this._bumpTreeVersion();
  }
  _deletePane(forwardableEvent) {
    forwardableEvent.stopPropagation();
    if (this._currentTwo !== this._root) {
      this._setCurrentViewFromTwo(this._currentTwo.delete());
      this._bumpTreeVersion();
    }
  }
  _activateNextView(forwardableEvent) {
    forwardableEvent.stopPropagation();
    const next = this._currentTwo.getNext();
    this._setCurrentViewFromTwo(next);
  }
  _activatePrevView(forwardableEvent) {
    forwardableEvent.stopPropagation();
    const next = this._currentTwo.getPrev();
    this._setCurrentViewFromTwo(next);
  }
  _getCursorStyle() {
    const extra = this.state.splitType === 'horizontal' ? 1 : 0;
    return (this.props.rotateMode + extra) % 2 ? 'row-resize' : 'col-resize';
  }
  _setCurrentVPairAndTwo(vpair, two) {
    if (this._currentView) {
      this._currentView.getDownstreamEventBus().setForward(null);
    }
    this._currentView = vpair;
    this._currentTwo = two;
    this.props.setCurrentView(this);
    this._eventBus.setForward(vpair.getEventBus());
    vpair.getDownstreamEventBus().setForward(this.props.toolbarEventBus);
    this._bumpCurrentId();
  }
  _setCurrentViewFromTwo(two) {
    const vpair = this._vpairs[two.id];
    assert(vpair);
    this._setCurrentVPairAndTwo(vpair, two);
  }
  _setCurrentView(vpair) {
    assert(vpair);
    assert(vpair.props.twoId);
    const two = this._twos[vpair.props.twoId];
    assert(two);
    this._setCurrentVPairAndTwo(vpair, two);
  }
  _bumpCurrentId() {
    this._saveLayout();
    this.setState((prevState) => ({
      currentId: prevState.currentId + 1,
    }));
  }
  _handleSliderMouseDown(e, id) {
    e.stopPropagation();
    e.preventDefault();
    const two = this._twos[id];
    assert(two, 'found two for slider');
    this._currentSlider = two;
    this._logger('id:', id, 'two:', two);
    this._installSliderMouseHandlers();
    const mousePos = getRotatedXY(e, 'client', this.props.rotateMode);
    this._lastX = mousePos.x;
    this._lastY = mousePos.y;
  }
  _handleSliderMouseMove(e) {
    e.stopPropagation();
    e.preventDefault();
    assert(this._currentSlider, 'have current slider');
    const mousePos = getRotatedXY(e, 'client', this.props.rotateMode);
    const dx = mousePos.x - this._lastX;
    const dy = mousePos.y - this._lastY;
    this._lastX = mousePos.x;
    this._lastY = mousePos.y;
    this._logger('dx:', dx, 'dy:', dy);
    if (this._currentSlider.slide(dx, dy)) {
      this._bumpTreeVersion();
    }
  }
  _handleSliderMouseUp(e) {
    e.stopPropagation();
    e.preventDefault();
    this._uninstallSliderMouseHandlers();
  }
  _makeSliderMouseDownHandler(id) {
    return (e) => {
      this._handleSliderMouseDown(e, id);
    };
  }
  _installSliderMouseHandlers() {
    if (!this._sliderMouseHandlersInstalled) {
      this._sliderMouseHandlersInstalled = true;
      window.addEventListener('mousemove', this._handleSliderMouseMove);
      window.addEventListener('mouseup', this._handleSliderMouseUp);
    }
  }
  _uninstallSliderMouseHandlers() {
    this._currentSlider = null;
    if (this._sliderMouseHandlersInstalled) {
      this._sliderMouseHandlersInstalled = false;
      window.removeEventListener('mousemove', this._handleSliderMouseMove);
      window.removeEventListener('mouseup', this._handleSliderMouseUp);
    }
  }
  render() {
    this._logger('render');
    const width = this.state.dimensions.width;
    const height = this.state.dimensions.height;
    this._logger('Render:', 'width:', width, 'height:', height);
    const twos = this._root.layout(width, height);
    this._twos = {};
    const views = twos.map((two) => {
      this._twos[two.id] = two;
      const bounds = two.bounds;
      this._logger('splitType:', two.splitType, bounds);
      if (two.splitType === Two.NONE) {
        const style = {
          position: 'absolute',
          left: px(bounds.left),
          top: px(bounds.top),
          width: px(bounds.width),
          height: px(bounds.height),
        };
        return (
          <div
            className="viewholder"
            style={style}
            key={two.id}
          >
            <VPair
              root={this.props.root}
              twoId={two.id}
              initialState={two.initialState}
              isCurrentView={this._currentTwo === two}
              options={this.props.options}
              prefs={this.props.prefs}
              winState={this.props.winState}
              rotateMode={this.props.rotateMode}
              eventBus={this._eventBus}
              setCurrentView={this._setCurrentView}
              actionListener={this._actionListener}
              registerVPair={this._registerVPair}
              unregisterVPair={this._unregisterVPair}
            />
          </div>
        );
      } else {
        const rot90 = (this.props.rotateMode % 2) !== 0;
        // const h = two.splitType === Two.HORIZONTAL;
        // const horizontal = h ? !rot90 : rot90;
        const horizontal = two.splitType === Two.HORIZONTAL;
        const style = horizontal ? {
          position: 'absolute',
          width: px(bounds.width),
          height: px(sliderSize),
          left: px(bounds.left),
          top: px(two.sliderPos),
        } : {
          position: 'absolute',
          width: px(sliderSize),
          height: px(bounds.height),
          left: px(two.sliderPos),
          top: px(bounds.top),
        };
        const sliderCursorHorizonal = horizontal ? !rot90 : rot90;
        this._logger('sliderCurH:', sliderCursorHorizonal, rot90);
        return (
          <div
            className={`split-slider split-slider-${sliderCursorHorizonal ? 'horizontal' : 'vertical'}`}
            style={style}
            key={two.id}
            onMouseDown={this._makeSliderMouseDownHandler(two.id)}
          />
        );
      }
    });
    return (
      <Measure client onResize={this._handleResize}>
        {({ measureRef }) => (
          <div
            style={{position: 'relative', width: '100%', height: '100%'}}
            ref={measureRef}
          >
            {views}
          </div>
        )}
      </Measure>
    );
  }
}

export {
  ViewSplit as default,
};
