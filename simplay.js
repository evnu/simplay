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
    'divs': {
        'player': document.getElementById('#player'),
        'playing': document.getElementById('#playing'),
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

        this.divs.player.addEventListener('playing', function() { self.displayCurrentTrack.call(self); });
        this.divs.player.addEventListener('abort', function() { self.displayNoTrack.call(self); });
        this.divs.player.addEventListener('error', function() { self.nextTrack(); self.play(); });
    },

    'setupTracksAndDirectories': function() {
        this.emptyTracklist();
        this.emptyDirectories();

        var self = this;
        var req = new XMLHttpRequest();

        req.overrideMimeType('application/json');
        req.onload = function() {
            self.doSetupAfterRequest.call(self, req);
        };
        req.open("GET", this.current_dir, true);
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
                        if (self.matchFileExtension(entry.name)) {
                            self.tracks.push(entry.name);
                        }
                    } else if (entry.type === 'directory') {
                        self.directories.push(entry.name);
                    } else {
                        throw ('unhandled entry type: ' + entry.type);
                    }
                });

        this.setupTracks();
        this.setupDirectories();

        if (this.tracks.length > 0) {
            this.setTrack(0);
        }
    },

    'matchFileExtension': function(filename) {
        return filename.match(/(\.mp3)|(\.ogg)$/);
    },

    // Helper for setupTracks and setupDirectories: display entries from arr under ol.
    // If the callback onclick is provided, it is registered as the onclick handler of
    // each new element. Also, each new element is then provided with fields 'idx' and
    // 'entry', holding its index and element value.
    'listEntries': function(ol, arr, onclick) {
        arr.forEach(
                function(entry, idx) {
                    var li = document.createElement('li');

                    if (onclick) {
                        li.entry = entry;
                        li.idx = idx;
                        li.onclick = function() {
                            onclick(li);
                        };
                    }

                    li.appendChild(
                            document.createTextNode(entry)
                            );
                    ol.appendChild(li);
                });
    },

    // List the tracks in the current_dir and associate each track with an onclick handler
    // which allows clicking the track to play it.
    'setupTracks': function() {
        var self = this;
        this.listEntries(this.divs.tracklist, this.tracks,
                // play a track by clicking it
                function(track) {
                    self.setTrack.call(self, track.idx);
                    self.play();
                });
    },

    // List the directories under current_dir and associate each directory with an onclick
    // handler which allows descending into that directory.
    'setupDirectories': function() {
        var self = this;
        this.listEntries(this.divs.directories, this.directories,
                // descend into a subdirectory
                function (directory) {
                    if (! self.paused()) {
                        self.pause();
                    }
                    self.current_dir = self.current_dir + '/' + directory.entry;
                    self.setupTracksAndDirectories();
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
                self.current_dir = self.base_dir;
                self.setupTracksAndDirectories();
            };

            one_up.onclick = function() {
                self.current_dir = popDirectory(self.current_dir);
                self.setupTracksAndDirectories();
            };
        }
    },

    'displayTrack': function(trackName) {
        this.divs.playing.innerHTML = trackName;
    },

    'displayCurrentTrack': function() {
        this.displayTrack(this.tracks[this.current_track]);
    },

    'displayNoTrack': function() {
        this.displayTrack('');
    },

    'toPath': function(idx) {
        return this.current_dir + '/' + this.tracks[idx];
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
        this.setTrack((this.current_track + 1) % this.tracks.length);
    },

    'previousTrack': function() {
        // shift into a range where we can use modulo
        this.setTrack((this.current_track - 1 + this.tracks.length) % this.tracks.length);
    },

    'setTrack': function(idx) {
        var paused = this.paused();

        this.current_track = idx;
        this.divs.player.src = this.toPath(idx);

        if (! paused) {
            this.play();
        }
    },
};

Player.setup();
