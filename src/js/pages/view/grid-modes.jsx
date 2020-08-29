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
import {px} from '../../lib/utils';
import {cssArray} from '../../lib/css-utils';
import KeyHelper from '../../lib/key-helper';

const g_backslashRE = /\\/g;
function prepForCSSUrl(url) {
  return url.replace(g_backslashRE, '\\\\');
}

class ColumnManager {
  constructor(totalWidth, options) {
    this.columns = [];
    this.height = 0;
    this.padding = options.padding;
    const numColumns = (totalWidth / options.columnWidth | 0) || 1;
    this.columnWidth = totalWidth / numColumns | 0;
    this.columnOffset = (this.columnWidth - options.columnWidth) / 2 | 0;
    this.drawWidth = options.columnWidth - this.padding;
    if (options.itemHeightRatio) {
      this.itemHeight = options.columnWidth / options.itemHeightRatio;
    }
    for (let ii = 0; ii < numColumns; ++ii) {
      this.columns.push({
        ndx: ii,
        bottom: 0,
      });
    }
  }
  _getShortestColumn() {
    let shortest = this.columns[0];
    this.columns.forEach((column) => {
      if (column.bottom < shortest.bottom) {
        shortest = column;
      }
    });
    return shortest;
  }
  getPositionForElement(zoomedWidth, zoomedHeight) {
    const scale =  this.drawWidth / zoomedWidth;
    const drawHeight = zoomedHeight * scale;
    const paddedHeight = (this.itemHeight || drawHeight) + this.padding;
    const column = this._getShortestColumn();
    const position = {
      x: this.columnWidth * column.ndx + this.columnOffset,
      y: column.bottom,
    };
    column.bottom += paddedHeight;
    this.height = Math.max(column.bottom - this.padding, this.height);
    return position;
  }
}

function computeColumnStyle(props) {
  const info = props.info;
  const pos = props.position;
  const thumbnail = info.thumbnail;
  const zoom = props.zoom;
  const thumbnailPageSize = info.bad ? 150 : thumbnail.pageSize;

  const width = props.options.columnWidth - props.options.padding;
  const scale = width / thumbnail.width;
  const height = thumbnail.height * scale;

  return {
    left: px(pos.x),
    top: px(pos.y),
    width: px(zoom(width)),
    height: px(zoom(height)),
    backgroundImage: `url(${prepForCSSUrl(thumbnail.url)})`,
    backgroundPositionX: px(zoom(-thumbnail.x * scale)),
    backgroundPositionY: px(zoom(-thumbnail.y * scale)),
    backgroundSize: `${px(zoom(thumbnailPageSize * scale))} ${px(zoom(thumbnailPageSize * scale))}`,
  };
}

function computeGridStyle(displayAspect, props) {
  const info = props.info;
  const pos = props.position;
  const thumbnail = info.thumbnail;
  const zoom = props.zoom;
  const thumbnailPageSize = info.bad ? 150 : thumbnail.pageSize;

  const imageAspect = thumbnail.width / thumbnail.height;
  const width  = props.options.columnWidth - props.options.padding;
  const height = width / displayAspect;

  let bkX;
  let bkY;
  let bkWidth;
  let bkHeight;

  if (imageAspect > displayAspect) {
    const expand = height / thumbnail.height;
    const thWidth = expand * thumbnail.width;
    bkX      = expand * (-thumbnail.x) - (thWidth - width) / 2;
    bkY      = expand * (-thumbnail.y);
    bkWidth  = expand * thumbnailPageSize;
    bkHeight = expand * thumbnailPageSize;
  } else {
    const expand = width / thumbnail.width;
    const thHeight = expand * thumbnail.height;
    bkX      = expand * -thumbnail.x;
    bkY      = expand * -thumbnail.y - (thHeight - height) / 2;
    bkWidth  = expand * thumbnailPageSize;
    bkHeight = expand * thumbnailPageSize;
  }

  return {
    left: px(pos.x),
    top: px(pos.y),
    width: px(zoom(width)),
    height: px(zoom(height)),
    backgroundImage: `url(${prepForCSSUrl(thumbnail.url)})`,
    backgroundPositionX: px(zoom(bkX)),
    backgroundPositionY: px(zoom(bkY)),
    backgroundSize: `${px(zoom(bkWidth))} ${px(zoom(bkHeight))}`,
  };
}

function computeFitStyle(displayAspect, props) {
  const info = props.info;
  const pos = props.position;
  const thumbnail = info.thumbnail;
  const zoom = props.zoom;
  const thumbnailPageSize = info.bad ? 150 : thumbnail.pageSize;

  const imageAspect = thumbnail.width / thumbnail.height;
  const areaWidth  = props.options.columnWidth - props.options.padding;
  const areaHeight = areaWidth / displayAspect;

  let bkX;
  let bkY;
  let bkWidth;
  let bkHeight;
  let x;
  let y;
  let width;
  let height;

  if (imageAspect > displayAspect) {
    // it's wider than the area
    const shrink = areaWidth / thumbnail.width;
    const thHeight = thumbnail.height * shrink;
    x        = pos.x;
    y        = pos.y + zoom(areaHeight - thHeight) / 2;
    width    = areaWidth;
    height   = thHeight;
    bkX      = shrink * (-thumbnail.x);
    bkY      = shrink * (-thumbnail.y);
    bkWidth  = shrink * thumbnailPageSize;
    bkHeight = shrink * thumbnailPageSize;
  } else {
    // it's taller than the area
    const shrink = areaHeight / thumbnail.height;
    const thWidth = thumbnail.width * shrink;
    x        = pos.x + zoom(areaWidth - thWidth) / 2;
    y        = pos.y;
    width    = thWidth;
    height   = areaHeight;
    bkX      = -thumbnail.x * shrink;
    bkY      = -thumbnail.y * shrink;
    bkWidth  = thumbnailPageSize * shrink;
    bkHeight = thumbnailPageSize * shrink;
  }

  return {
    left: px(x),
    top: px(y),
    width: px(zoom(width)),
    height: px(zoom(height)),
    backgroundImage: `url(${prepForCSSUrl(thumbnail.url)})`,
    backgroundPositionX: px(zoom(bkX)),
    backgroundPositionY: px(zoom(bkY)),
    backgroundSize: `${px(zoom(bkWidth))} ${px(zoom(bkHeight))}`,
  };
}

const gridModes = new KeyHelper({
  'columns':   {
    icon: 'images/buttons/columns.svg',
    hint: 'columns',
    helper: (width, options) => new ColumnManager(width, options),
    render: renderNoFrame,
    getStyle: computeColumnStyle,
  },
  'grid-fit':  {
    icon: 'images/buttons/grid-fit.svg',
    hint: 'fit',
    helper: (width, options) => new ColumnManager(width, ({itemHeightRatio: 1, ...options})),
    render: renderWithFrame,
    getStyle: (props) => computeFitStyle(1, props),
  },
  'grid-4x3':  {
    icon: 'images/buttons/grid-4-3.svg',
    hint: '4x3',
    helper: (width, options) => new ColumnManager(width, ({itemHeightRatio: 4 / 3, ...options})),
    render: renderNoFrame,
    getStyle: (props) => computeGridStyle(4 / 3, props),
  },
  'grid-3x4':  {
    icon: 'images/buttons/grid-3-4.svg',
    hint: '3x4',
    helper: (width, options) => new ColumnManager(width, ({itemHeightRatio: 3 / 4, ...options})),
    render: renderNoFrame,
    getStyle: (props) => computeGridStyle(3 / 4, props),
  },
  'grid-16x9': {
    icon: 'images/buttons/grid-16-9.svg',
    hint: '16x9',
    helper: (width, options) => new ColumnManager(width, ({itemHeightRatio: 16 / 9, ...options})),
    render: renderNoFrame,
    getStyle: (props) => computeGridStyle(16 / 9, props),
  },
  'grid-9x16': {
    icon: 'images/buttons/grid-9-16.svg',
    hint: '9x16',
    helper: (width, options) => new ColumnManager(width, ({itemHeightRatio: 9 / 16, ...options})),
    render: renderNoFrame,
    getStyle: (props) => computeGridStyle(9 / 16, props),
  },
  'grid-1x1':  {
    icon: 'images/buttons/grid-1-1.svg',
    hint: '1x1',
    helper: (width, options) => new ColumnManager(width, ({itemHeightRatio: 1, ...options})),
    render: renderNoFrame,
    getStyle: (props) => computeGridStyle(1, props),
  },
});

const s_slashRE = /[\\/]/g;

function renderName(props, info) {
  const name = path.basename(info.filename);
  const date = props.showDates ? `${(new Date(info.mtime))}:` : '';
  const dims = (props.showDimensions && info.width) ? `:${info.width}x${info.height}` : '';
  return `${date}${name}${dims}`;
}

function renderNoFrame(props, onClick, onContextMenu) {
  const info = props.info;
  const style = gridModes.value(props.gridMode).getStyle(props);
  const baseType = `mime-${info.type.split('/')[0]}`;
  const mimeType = `mime-${info.type.replace(s_slashRE, '-')}`;
  const className = cssArray('thumbnail', baseType, mimeType);
  return (
    <div onClick={onClick} onContextMenu={onContextMenu} className={className} style={style}>
      <div className="thumbinfo">
        <div className="name">{renderName(props, info)}</div>
      </div>
    </div>
  );
}
function renderWithFrame(props, onClick, onContextMenu) {
  const info = props.info;
  const pos = props.position;
  const style = gridModes.value(props.gridMode).getStyle(props);
  const baseType = `mime-${info.type.split('/')[0]}`;
  const mimeType = `mime-${info.type.replace(s_slashRE, '-')}`;
  const className = cssArray('thumbnail', baseType, mimeType);
  const width  = props.options.columnWidth - props.options.padding;
  const zoom = props.zoom;
  const frameStyle = {
    left: px(pos.x),
    top: px(pos.y),
    width: px(zoom(width)),
    height: px(zoom(width)),
  };
  return (
    <div>
      <div className="thumbnail-frame" style={frameStyle}></div>
      <div onClick={onClick} onContextMenu={onContextMenu} className={className} style={style}>
        <div className="thumbinfo">
          <div className="name">{renderName(props, info)}</div>
        </div>
      </div>
    </div>
  );
}

export {
  gridModes as default,
};
