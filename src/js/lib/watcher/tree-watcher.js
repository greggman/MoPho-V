// parts of this code from Visual Studio Code
/*
MIT License

Copyright (c) 2015 - present Microsoft Corporation

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import EventEmitter from 'events';
import path from 'path';
import _ from 'lodash';
import bind from '../bind';
import debug from '../debug';
import WinTreeWatcher from './win-tree-watcher';
import ChokidarTreeWatcher from './chokidar-tree-watcher';
import FileChangeType from './file-change-types';

/* eslint-disable */

class TreeWatcher extends EventEmitter {
  constructor(folderpath) {
    super();
    this._logger = debug('TreeWatcher', folderpath);
    bind(
      this,
      '_onRawEvent',
      '_onError',
      '_onStart',
      '_sendEvents',
    );
    this._folderpath = folderpath;
    this._sendEvents = _.throttle(this._sendEvents, 250);
    this._bufferedEvents = [];
    const filter = () => true;
    const verbose = false;
    this._rawWatcher = process.platform.startsWith('win')
      ? new WinTreeWatcher(folderpath, filter, this._onStart, this._onRawEvent, this._onError, verbose)
      : new ChokidarTreeWatcher(folderpath, filter, this._onStart, this._onRawEvent, this._onError, verbose);
  }

  get folderPath() {
    return this._folderpath;
  }

  _sendEvents() {
    if (this._bufferedEvents.length == 0) {
      return;
    }

    const events = normalize(this._bufferedEvents);
    this._bufferedEvents = [];
    events.forEach((event) => {
      switch (event.type) {
        case FileChangeType.ADDED:
          this.emit('create', event.path);
          break;
        case FileChangeType.UPDATED:
          this.emit('change', event.path);
          break;
        case FileChangeType.DELETED:
          this.emit('remove', event.path);
          break;
        default:
          throw new Error('unknown event type');
      }
    });
  }

  _onRawEvent(rawEvents) {
    this._bufferedEvents.splice(this._bufferedEvents.length, 0, ...rawEvents);
    this._sendEvents();
  }

  _onStart(e) {
    this.emit('start');
  }

  _onError(e) {
    this._logger.error(e);
  }

  close() {
    this._logger('close');
    if (this._rawWatcher) {
      this._rawWatcher.close();
    }
  }
}


function isParent(p /* :string */, candidate /* :string */) /* : boolean */ {
  return p.indexOf(candidate + path.sep) === 0;
}

/**
 * Given events that occurred, applies some rules to normalize the events
 */
function normalize(changes /* : IRawFileChange[] */) /* : IRawFileChange[] */ {

  // Build deltas
  let normalizer = new EventNormalizer();
  for (let i = 0; i < changes.length; i++) {
    let event = changes[i];
    normalizer.processEvent(event);
  }

  return normalizer.normalize();
}

class EventNormalizer {
  // private normalized /* : IRawFileChange[] */;
  // private mapPathToChange /* : { [path: string]: IRawFileChange } */;

  constructor() {
    this.normalized = [];
    this.mapPathToChange = {};
  }

  processEvent(event /* : IRawFileChange*/) {

    // Event path already exists
    let existingEvent = this.mapPathToChange[event.path];
    if (existingEvent) {
      let currentChangeType = existingEvent.type;
      let newChangeType = event.type;

      // ignore CREATE followed by DELETE in one go
      if (currentChangeType === FileChangeType.ADDED && newChangeType === FileChangeType.DELETED) {
        delete this.mapPathToChange[event.path];
        this.normalized.splice(this.normalized.indexOf(existingEvent), 1);
      }

      // flatten DELETE followed by CREATE into CHANGE
      else if (currentChangeType === FileChangeType.DELETED && newChangeType === FileChangeType.ADDED) {
        existingEvent.type = FileChangeType.UPDATED;
      }

      // Do nothing. Keep the created event
      else if (currentChangeType === FileChangeType.ADDED && newChangeType === FileChangeType.UPDATED) {
      }

      // Otherwise apply change type
      else {
        existingEvent.type = newChangeType;
      }
    }

    // Otherwise Store
    else {
      this.normalized.push(event);
      this.mapPathToChange[event.path] = event;
    }
  }

  normalize() /* : IRawFileChange[] */ {
    let addedChangeEvents /* :IRawFileChange[] */ = [];
    let deletedPaths /* :string[] */ = [];

    // This algorithm will remove all DELETE events up to the root folder
    // that got deleted if any. This ensures that we are not producing
    // DELETE events for each file inside a folder that gets deleted.
    //
    // 1.) split ADD/CHANGE and DELETED events
    // 2.) sort short deleted paths to the top
    // 3.) for each DELETE, check if there is a deleted parent and ignore the event in that case

    const deleted = this.normalized.filter(e => {
      if (e.type !== FileChangeType.DELETED) {
        addedChangeEvents.push(e);
        return false; // remove ADD / CHANGE
      }

      return true; // keep DELETE
    });
    const shortestFirst = deleted.sort((e1, e2) => {
      return e1.path.length - e2.path.length; // shortest path first
    });
    const parentsWithoutChildren = shortestFirst.filter(e => {
      if (deletedPaths.some(d => isParent(e.path, d))) {
        return false; // DELETE is ignored if parent is deleted already
      }

      // otherwise mark as deleted
      deletedPaths.push(e.path);

      return true;
    });

    return [...parentsWithoutChildren, ...addedChangeEvents];
  }

}

export {
  TreeWatcher as default,
};
