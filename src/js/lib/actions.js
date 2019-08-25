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

// it seems like these should be auto generated, actions should
// get registered but that's easier said than done.
//
// 1. The actions exist in another process
//
// 2. The actions don't exist until the view for them exist
//    so for example no viewer = no viewer actions registered

const actions = {
  noop:              { hint: '',          icon: 'images/buttons/noop.svg',         desc: 'do nothing', },
  newCollection:     { hint: 'new collection', icon: 'images/buttons/new-collection.svg', desc: 'create a new collection', },
  editCollection:    { hint: 'edit collection', icon: 'images/buttons/edit-collection.svg', desc: 'edit collection', },
  closeViewer:       { hint: 'close',     icon: 'images/buttons/close.svg',        desc: 'close the viewer', },
  zoomIn:            { hint: 'zoom in',   icon: 'images/buttons/zoomin.svg',       desc: 'zoom in', },
  zoomOut:           { hint: 'zoom out',  icon: 'images/buttons/zoomout.svg',      desc: 'zoom out', },
  setLoop:           { hint: 'loop',      icon: 'images/buttons/loop.svg',         desc: '1st = set start, 2nd = set end, 3rd = clear', },
  view:              { hint: 'view',      icon: 'images/buttons/???.svg',          desc: 'view current selection', },
  gotoPrev:          { hint: 'next',      icon: 'images/buttons/prev.svg',         desc: 'go to next item', },
  gotoNext:          { hint: 'prev',      icon: 'images/buttons/next.svg',         desc: 'go ot previous item', },
  togglePlay:        { hint: 'play',      icon: 'images/buttons/play.svg',         desc: 'play - pause', },
  fastForward:       { hint: 'ff',        icon: 'images/buttons/ff.svg',           desc: 'step forward', },
  fastBackward:      { hint: 'rew',       icon: 'images/buttons/rew.svg',          desc: 'step backward', },
  scrollUp:          { hint: '',          icon: 'images/buttons/up.svg',           desc: 'TBD', },
  scrollDown:        { hint: '',          icon: 'images/buttons/down.svg',         desc: 'TBD', },
  setPlaybackSpeed1: { hint: '1x',        icon: 'images/buttons/1x.svg',           desc: 'playback speed 1x', },
  setPlaybackSpeed2: { hint: '.66x',      icon: 'images/buttons/0.66x.svg',        desc: 'playback speed .66x', },
  setPlaybackSpeed3: { hint: '.5x',       icon: 'images/buttons/0.5x.svg',         desc: 'playback speed .5x', },
  setPlaybackSpeed4: { hint: '.33x',      icon: 'images/buttons/0.33x.svg',        desc: 'playback speed .33x', },
  setPlaybackSpeed5: { hint: '.25x',      icon: 'images/buttons/0.25x.svg',        desc: 'playback speed .25x', },
  cyclePlaybackSpeed:{ hint: 'cycle speed', icon: 'images/buttons/speed.svg',      desc: 'cycle playback speed', },
  toggleSlideshow:   { hint: 'slideshow', icon: 'images/buttons/slideshow.svg',    desc: 'start/stop slideshow', },
  rotate:            { hint: 'rotate',    icon: 'images/buttons/rotate.svg',       desc: 'rotate item', },
  changeStretchMode: { hint: 'zoom mode', icon: 'images/buttons/stretch-both.svg', desc: 'change stretch mode', },
  nextView:          { hint: 'next view', icon: 'images/buttons/prev-view.svg',    desc: 'switch to next view', },
  prevView:          { hint: 'prev view', icon: 'images/buttons/next-view.svg',    desc: 'switch to previous view', },
  toggleUI:          { hint: 'ui',        icon: 'images/buttons/ui.svg',           desc: 'toggle toolbar, folder list', },
  splitHorizontal:   { hint: 'split h',   icon: 'images/buttons/split-h.svg',      desc: 'split current view horitzontally', },
  splitVertical:     { hint: 'split v',   icon: 'images/buttons/split-v.svg',      desc: 'split current view vertically', },
  deletePane:        { hint: 'del pane',  icon: 'images/buttons/delpane.svg',      desc: 'delete current view', },
  showHelp:          { hint: 'help',      icon: 'images/buttons/help.svg',         desc: 'show help', },
  cycleGridMode:     { hint: 'layout',    icon: 'images/buttons/columns.svg',      desc: 'change grid layout mode', },
  cycleSortMode:     { hint: 'sort mode', icon: 'images/buttons/sort-by-path.svg', desc: 'change sort mode', },
  toggleFullscreen:  { hint: 'fullscreen', icon: 'images/buttons/???.svg',         desc: 'toggle fullscreen', },
  newWindow:         { hint: 'new window', icon: 'images/buttons/???.svg',         desc: 'open a new window', },
};

function makeActionFuncs(emitFn) {
  const funcs = {};
  Object.keys(actions).forEach((actionId) => {
    funcs[actionId] = () => {
      emitFn({action: actionId});
    };
  });
  return funcs;
}

export {
  actions,
  makeActionFuncs,
};
