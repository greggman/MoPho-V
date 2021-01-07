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
  noop:               { hint: '',                icon: 'noop.svg',            desc: 'do nothing', },
  newCollection:      { hint: 'new collection',  icon: 'new-collection.svg',  desc: 'create a new collection', },
  editCollection:     { hint: 'edit collection', icon: 'edit-collection.svg', desc: 'edit collection', },
  closeViewer:        { hint: 'close',           icon: 'close.svg',           desc: 'close the viewer', },
  zoomIn:             { hint: 'zoom in',         icon: 'zoomin.svg',          desc: 'zoom in', },
  zoomOut:            { hint: 'zoom out',        icon: 'zoomout.svg',         desc: 'zoom out', },
  setLoop:            { hint: 'loop',            icon: 'loop.svg',            desc: '1st = set start, 2nd = set end, 3rd = clear', },
  view:               { hint: 'view',            icon: '???.svg',             desc: 'view current selection', },
  gotoPrev:           { hint: 'next',            icon: 'prev.svg',            desc: 'go to next item', },
  gotoNext:           { hint: 'prev',            icon: 'next.svg',            desc: 'go ot previous item', },
  togglePlay:         { hint: 'play',            icon: 'play.svg',            desc: 'play - pause', },
  fastForward:        { hint: 'ff',              icon: 'ff.svg',              desc: 'step forward', },
  fastBackward:       { hint: 'rew',             icon: 'rew.svg',             desc: 'step backward', },
  scrollUp:           { hint: '',                icon: 'up.svg',              desc: 'TBD', },
  scrollDown:         { hint: '',                icon: 'down.svg',            desc: 'TBD', },
  setPlaybackSpeed1:  { hint: '1x',              icon: '1x.svg',              desc: 'playback speed 1x', },
  setPlaybackSpeed2:  { hint: '.66x',            icon: '0.66x.svg',           desc: 'playback speed .66x', },
  setPlaybackSpeed3:  { hint: '.5x',             icon: '0.5x.svg',            desc: 'playback speed .5x', },
  setPlaybackSpeed4:  { hint: '.33x',            icon: '0.33x.svg',           desc: 'playback speed .33x', },
  setPlaybackSpeed5:  { hint: '.25x',            icon: '0.25x.svg',           desc: 'playback speed .25x', },
  cyclePlaybackSpeed: { hint: 'cycle speed',     icon: 'speed.svg',           desc: 'cycle playback speed', },
  toggleSlideshow:    { hint: 'slideshow',       icon: 'slideshow.svg',       desc: 'start/stop slideshow', },
  rotate:             { hint: 'rotate',          icon: 'rotate.svg',          desc: 'rotate item', },
  changeStretchMode:  { hint: 'zoom mode',       icon: 'stretch-both.svg',    desc: 'change stretch mode', },
  nextView:           { hint: 'next view',       icon: 'prev-view.svg',       desc: 'switch to next view', },
  prevView:           { hint: 'prev view',       icon: 'next-view.svg',       desc: 'switch to previous view', },
  toggleUI:           { hint: 'ui',              icon: 'ui.svg',              desc: 'toggle toolbar, folder list', },
  splitHorizontal:    { hint: 'split h',         icon: 'split-h.svg',         desc: 'split current view horizontally', },
  splitHorizontalAlt: { hint: 'split h alt',     icon: 'split-h.svg',         desc: 'split current view horizontally alt', },
  splitVertical:      { hint: 'split v',         icon: 'split-v.svg',         desc: 'split current view vertically', },
  splitVerticalAlt:   { hint: 'split v alt',     icon: 'split-v.svg',         desc: 'split current view vertically alt', },
  deletePane:         { hint: 'del pane',        icon: 'delpane.svg',         desc: 'delete current view', },
  showHelp:           { hint: 'help',            icon: 'help.svg',            desc: 'show help', },
  cycleGridMode:      { hint: 'layout',          icon: 'columns.svg',         desc: 'change grid layout mode', },
  cycleSortMode:      { hint: 'sort mode',       icon: 'sort-by-path.svg',    desc: 'change sort mode', },
  toggleFullscreen:   { hint: 'fullscreen',      icon: '???.svg',             desc: 'toggle fullscreen', },
  newWindow:          { hint: 'new window',      icon: '???.svg',             desc: 'open a new window', },
};
Object.values(actions).forEach((a) => { a.icon = `images/buttons/${a.icon}`; });

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
