# simplay

simplay (simply play) is a very simple website to play audio files using a web browser. It features
a single html file `index.html` with a very simple javascript backend `simplay.js` to request a list
of files from a webserver. After retrieving this list, it displays the files in a very ugly list
while also listing directories into which one can descend.

## Installation

### Configuring nginx
Simplay was tested with the json representation of directory listings as returned from nginx's
`ngx_http_autoindex_module`. Configure nginx to return the contents of the directory to be served similar to this
example:

    events {
    }

    http {
        server {
            listen 8080;
            root /the/root

            location /audio_files {
                autoindex on;
                autoindex_format jsonp;
            }
        }
    }

The configuration is intentionally simple. Adapt and strengthen it using your own judgement!

### Configuring simplay
In `simplay.js`, set the variable `Player.base_dir` to the base directory on the server. Using the
nginx example above, you should set it to `/audio_files`. Then, simply serve `index.html` and
`simplay.js` using the webserver.
