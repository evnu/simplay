/****
simplay.js
A simple audio player.
Author: Magnus Ottenklinger

    The MIT License (MIT)

    Copyright (c) 2015 Magnus Ottenklinger

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

function popDirectory(path) {
    var splitted = path.split('/');
    splitted.pop();
    return splitted.join('/');
}

var Player = {
    'base_dir': 'Set this variable according to the README',

    'current_dir': undefined, // string
    'current_track': undefined, // integer
    'tracks': undefined,
    'directories': undefined,
    'erroneous_tracks': {}, // per directory: reset on new directory or on roll-over
    'divs': {
        'player': document.getElementById('#player'),
        'breadcrumb': document.getElementById('#breadcrumb'),
        'tracklist': document.getElementById('#tracklist'),
        'directories': document.getElementById('#directories'),
        'next': document.getElementById('#next'),
        'prev': document.getElementById('#prev')

    },

    'setup': function() {
        var self = this;

        this.setupEventListeners();

        this.divs.next.onclick = function() { Player.nextTrack.call(self); return false; };
        this.divs.prev.onclick = function() { Player.previousTrack.call(self); return false; };

        this.current_dir = this.base_dir;

        this.setupTracksAndDirectories();
    },

    'setupEventListeners': function() {
        var self = this;

        this.divs.player.addEventListener('ended',
                function() {
                    if (self.tracks.length > 0) {
                        self.nextTrack.call(self);
                        self.play.call(self);
                    }
                });

        this.divs.player.addEventListener('error', function() {
            self.erroneous_tracks[self.current_track] = true;
            self.nextTrack();
            self.play();
        });
    },

    'setBreadcrumb': function() {
        this.divs.breadcrumb.innerHTML = this.current_dir;
    },

    'setupTracksAndDirectories': function() {
        this.emptyTracklist();
        this.emptyDirectories();
        this.setBreadcrumb();

        var self = this;
        var req = new XMLHttpRequest();

        req.overrideMimeType('application/json');
        req.onload = function() {
            self.doSetupAfterRequest.call(self, req);
        };
        req.open('GET', this.current_dir, true);
        req.send();
    },

    'emptyTracklist': function() {
        this.tracks = [];
        this.divs.tracklist.innerHTML = '';
    },

    'emptyDirectories': function() {
        this.directories = [];
        this.divs.directories.innerHTML = '';
    },

    // TODO error handling
    'doSetupAfterRequest': function(req) {
        var self = this;
        JSON.parse(req.responseText).forEach(
                function(entry) {
                    if (entry.type === 'file') {
			self.tracks.push(entry.name);
                    } else if (entry.type === 'directory') {
                        self.directories.push(entry.name);
                    } else {
                        throw ('unhandled entry type: ' + entry.type);
                    }
                });

        this.erroneous_tracks = {};
        this.setupTracks();
        this.setupDirectories();

        if (this.tracks.length > 0) {
            this.setTrack(0);
        }
    },

    // Helper for setupTracks and setupDirectories: display entries from arr under ol by creating an
    // li which contains elements of type innerElement (STRING).
    // If the callback onclick is provided, it is registered as the onclick handler of
    // each new element. Also, each new element is then provided with fields 'idx' and
    // 'entry', holding its index and element value.
    'listEntries': function(ol, arr, innerElement, onclick) {
        arr.forEach(
                function(entry, idx) {
                    var li = document.createElement('li');
                    var inner = document.createElement(innerElement);
                    inner.innerHTML = entry;

                    if (onclick) {
                        inner.entry = entry;
                        inner.idx = idx;
                        inner.onclick = function() {
                            onclick(inner);
                        };
                    }

                    li.appendChild(inner);
                    ol.appendChild(li);
                });
    },

    // List the tracks in the current_dir and associate each track with an onclick handler
    // which allows clicking the track to play it.
    'setupTracks': function() {
        var self = this;
        this.listEntries(this.divs.tracklist, this.tracks, 'a',
                // play a track by clicking it
                function(track) {
                    self.setTrack.call(self, track.idx);
                    self.play();
                });
    },

    'changeToDirectory': function(self, dir) {
        if (! self.paused()) {
            self.pause();
        }
        self.current_dir = dir;
        self.setupTracksAndDirectories();
    },

    // List the directories under current_dir and associate each directory with an onclick
    // handler which allows descending into that directory.
    'setupDirectories': function() {
        var self = this;
        this.listEntries(this.divs.directories, this.directories, 'a',
                // descend into a subdirectory
                function(directory) {
                    self.changeToDirectory(self, self.current_dir + '/' + directory.entry);
                });

        // allow jumping to base_dir and one dir up
        if (this.current_dir !== this.base_dir) {
            var to_base = document.createElement('li');
            var one_up = document.createElement('li');
            to_base.appendChild(document.createTextNode('to ' + this.base_dir));
            one_up.appendChild(document.createTextNode('..'));

            this.divs.directories.insertBefore(
                    to_base,
                    this.divs.directories.firstChild);

            this.divs.directories.insertBefore(
                    one_up,
                    this.divs.directories.firstChild);

            to_base.onclick = function() {
                self.changeToDirectory(self, self.base_dir);
            };

            one_up.onclick = function() {
                self.changeToDirectory(self, popDirectory(self.current_dir));
            };
        }
    },

    'toPath': function(idx) {
        return this.current_dir + '/' + encodeURIComponent(this.tracks[idx]);
    },

    'play': function() {
        return this.divs.player.play();
    },

    'pause': function() {
        return this.divs.player.pause();
    },

    'paused': function() {
        return this.divs.player.paused;
    },

    'nextTrack': function() {
        var next_track = (this.current_track + 1) % this.tracks.length;
        if (next_track == 0) {
            if (Object.keys(this.erroneous_tracks).length == this.tracks.length) {
                // Abort: all tracks where erroneous!
                return;
            } else {
                this.erroneous_tracks = {};
            }
        }
        this.setTrack(next_track);
    },

    'previousTrack': function() {
        // shift into a range where we can use modulo
        this.setTrack((this.current_track - 1 + this.tracks.length) % this.tracks.length);
    },

    'setTrack': function(idx) {
        var paused = this.paused();

        this.current_track = idx;
        this.divs.player.src = this.toPath(idx);

        this.clearHighlight();
        this.highlightTrack(idx);

        if (! paused) {
            this.play();
        }
    },

    'trackNodes': function() {
        return this.divs.tracklist.childNodes;
    },

    'clearHighlight': function() {
        var trackNodes = this.trackNodes();
        for (i = 0; i < trackNodes.length; i++) {
            trackNodes[i].className = '';
        }
    },

    'highlightTrack': function(idx) {
        this.trackNodes()[idx].className = 'current';
    }
};

Player.setup();
