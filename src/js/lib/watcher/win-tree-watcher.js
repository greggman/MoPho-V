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

/* eslint-disable */

import cp from 'child_process';
import path from 'path';
import debug from '../debug';
import LineDecoder from '../line-decoder';
import FileChangeType from './file-change-types';
import {getResourcePath} from '../resources';
// import {IRawFileChange} from 'vs/workbench/services/files/node/watcher/common';

function alwaysTrue() {
  return true;
}

// NOTE: In my experience NEVER USE 0 as an ENUM because too many things
// default / coerce to 0 which hides errors
const changeTypeMap /* : FileChangeType[] */ = [FileChangeType.UPDATED, FileChangeType.ADDED, FileChangeType.DELETED];

class WinTreeWatcher {

  constructor(
    watchedFolder, // : string,
    filter, //: function(string):bool,
    startCallback, //
    eventCallback, //: (events: IRawFileChange[]) => void,
    errorCallback, //: (error: string) => void,
    verboseLogging, //: boolean
  ) {
    this._watchedFolder = watchedFolder;
    this._filter = filter || alwaysTrue;
    this._logger = debug('WinTreeWatcher', watchedFolder);
    this._verboseLogging = verboseLogging;
    this._startCallback = () => {
      this._startCallback = () => {};
      this._logger('calling startCallback');
      startCallback();
    };
    this._eventCallback = eventCallback;
    this._errorCallback = errorCallback;
    this._start();
  }

  _start() {
    const args = [path.resolve(this._watchedFolder)];
    if (this._verboseLogging) {
      args.push('-verbose');
    }

    const helperFilePath = getResourcePath('helpers/win32/CodeHelper.exe');
    this._logger('starting:', helperFilePath, ...args);
    this._handle = cp.spawn(helperFilePath, args);

    const stdoutLineDecoder = new LineDecoder();

    // Events over stdout
    this._handle.stdout.on('data', (data /* : NodeBuffer */) => {
      this._startCallback();
      // Collect raw events from output
      const rawEvents /* : IRawFileChange[] */ = [];
      stdoutLineDecoder.write(data).forEach((line) => {
        const eventParts = line.split('|');
        if (eventParts.length === 2) {
          const changeType = Number(eventParts[0]);
          const absolutePath = eventParts[1];

          // File Change Event (0 Changed, 1 Created, 2 Deleted)
          if (changeType >= 0 && changeType < 3) {

            if (!this._filter(absolutePath)) {
              return;
            }
            // Otherwise record as event
            rawEvents.push({
              type: changeTypeMap[changeType],
              path: absolutePath
            });
          }

          // 3 Logging
          else {
            this._logger(eventParts[1]);
          }
        } else {
          this._logger('line:', line);
        }
      });

      // Trigger processing of events through the delayer to batch them up properly
      if (rawEvents.length > 0) {
        this._eventCallback(rawEvents);
      }
    });

    // Errors
    this._handle.on('error', (error /* : Error */) => this._onError(error));
    this._handle.stderr.on('data', (data /* : NodeBuffer */) => this._onError(data));

    // Exit
    this._handle.on('exit', (code /* : any */, signal /* : any */) => this._onExit(code, signal));
  }

  _onError(error /* : Error | NodeBuffer */) {
    this._errorCallback(`${this._logger.getPrefix()} process error: ${error}`);
  }

  _onExit(code /* : any */, signal /* : any */) {
    if (this._handle) { // exit while not yet being disposed is unexpected!
      this._errorCallback(`${this._logger.getPrefix()} terminated unexpectedly (code: ${code}, signal: ${signal})`);
      this._start(); // restart
    }
  }

  close() {
    if (this._handle) {
      this._handle.kill();
      this._handle = null;
    }
  }
}

export {
  WinTreeWatcher as default,
};
