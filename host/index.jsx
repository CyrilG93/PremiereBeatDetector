// ExtendScript for Beat Detector

function BeatDetector_addMarkers(beatsJson, offsetSeconds, markerType) {
    try {
        var beats = JSON.parse(beatsJson);
        var activeSequence = app.project.activeSequence;

        if (!activeSequence) {
            return JSON.stringify({ error: "No active sequence found." });
        }

        var successCount = 0;
        var failCount = 0;
        var errors = [];
        var offset = parseFloat(offsetSeconds) || 0;

        // Get sequence timebase for frame-accurate markers
        var timebase = activeSequence.timebase;
        var fps = parseFloat(timebase);

        if (isNaN(fps) || fps <= 0) {
            // Fallback: try to get from sequence settings
            fps = 25; // Default fallback
        }

        if (markerType === "clip") {
            // Add markers to the selected clip(s)
            var selection = activeSequence.getSelection();
            if (!selection || selection.length === 0) {
                return JSON.stringify({ error: "No clip selected for clip markers." });
            }

            var clip = selection[0];
            var projectItem = clip.projectItem;

            if (!projectItem) {
                return JSON.stringify({ error: "Selected clip has no project item." });
            }

            if (typeof projectItem.getMarkers !== 'function') {
                return JSON.stringify({ error: "Clip markers not supported in this Premiere Pro version. Use 'Sequence Markers' instead." });
            }

            var markers = projectItem.getMarkers();

            if (!markers) {
                return JSON.stringify({ error: "Could not get markers object from clip. Use 'Sequence Markers' instead." });
            }

            for (var i = 0; i < beats.length; i++) {
                var timeInSeconds = parseFloat(beats[i]);
                if (isNaN(timeInSeconds)) continue;

                try {
                    // Snap to nearest frame
                    var frameNumber = Math.round(timeInSeconds * fps);
                    var frameAccurateTime = frameNumber / fps;

                    var newMarker = markers.createMarker(frameAccurateTime);
                    newMarker.name = "Beat";
                    newMarker.comments = "Beat (frame " + frameNumber + ")";
                    newMarker.setColorByIndex(0);
                    successCount++;
                } catch (e) {
                    failCount++;
                    if (errors.length < 3) {
                        errors.push("Beat " + i + " (" + timeInSeconds + "s): " + e.toString());
                    }
                }
            }

        } else {
            // Add markers to the sequence
            var markers = activeSequence.markers;

            if (!markers) {
                return JSON.stringify({ error: "Could not get markers object from sequence." });
            }

            for (var i = 0; i < beats.length; i++) {
                var timeInSeconds = parseFloat(beats[i]);
                if (isNaN(timeInSeconds)) continue;

                try {
                    var seqTimeInSeconds = timeInSeconds + offset;

                    // Snap to nearest frame for frame-accurate markers
                    var frameNumber = Math.round(seqTimeInSeconds * fps);
                    var frameAccurateTime = frameNumber / fps;

                    var newMarker = markers.createMarker(frameAccurateTime);
                    newMarker.name = "Beat";
                    newMarker.comments = "Beat (frame " + frameNumber + ")";
                    newMarker.setColorByIndex(0);
                    successCount++;
                } catch (e) {
                    failCount++;
                    if (errors.length < 3) {
                        errors.push("Beat " + i + " (" + seqTimeInSeconds.toFixed(3) + "s): " + e.toString());
                    }
                }
            }
        }

        if (successCount === 0 && failCount > 0) {
            return JSON.stringify({
                success: false,
                count: successCount,
                error: "All markers failed. Sample errors: " + errors.join("; ")
            });
        }

        return JSON.stringify({ success: true, count: successCount, failed: failCount });

    } catch (error) {
        return JSON.stringify({ error: "Exception: " + error.toString() });
    }
}

function BeatDetector_getSelectedClipPath() {
    var activeSequence = app.project.activeSequence;
    if (!activeSequence) {
        return JSON.stringify({ error: "No active sequence found." });
    }

    var selection = activeSequence.getSelection();
    if (!selection || selection.length === 0) {
        return JSON.stringify({ error: "No clip selected on the timeline." });
    }

    var clip = selection[0];

    if (!clip.projectItem) {
        return JSON.stringify({ error: "Selected item is not linked to a project item." });
    }

    var path = clip.projectItem.getMediaPath();

    // Get clip start time in seconds
    // clip.start is in ticks usually, need to convert? 
    // Actually, ExtendScript API usually returns Time objects or ticks.
    // Let's try to get seconds directly if possible, or return ticks.
    // For PPro 2025, clip.start.seconds should work if it's a Time object.

    var startSeconds = 0;
    if (clip.start) {
        startSeconds = clip.start.seconds;
    }

    if (path) {
        return JSON.stringify({
            path: path,
            startSeconds: startSeconds,
            name: clip.name
        });
    } else {
        return JSON.stringify({ error: "Selected clip '" + clip.name + "' has no media path." });
    }
}

// Polyfill for JSON if needed (though PPro 2025 should have it)
if (typeof JSON !== 'object') {
    JSON = {};
}

(function () {
    'use strict';

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        return n < 10 ? '0' + n : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear() + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate()) + 'T' +
                f(this.getUTCHours()) + ':' +
                f(this.getUTCMinutes()) + ':' +
                f(this.getUTCSeconds()) + 'Z'
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? '"' + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string'
                    ? c
                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"'
            : '"' + string + '"';
    }


    function str(key, holder) {

        var i;
        var k;
        var v;
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

        if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

        switch (typeof value) {
            case 'string':
                return quote(value);

            case 'number':

                return isFinite(value) ? String(value) : 'null';

            case 'boolean':
            case 'null':

                return String(value);

            case 'object':

                if (!value) {
                    return 'null';
                }

                gap += indent;
                partial = [];

                if (Object.prototype.toString.apply(value) === '[object Array]') {

                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }

                    v = partial.length === 0
                        ? '[]'
                        : gap
                            ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                            : '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }

                if (rep && typeof rep === 'object') {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        if (typeof rep[i] === 'string') {
                            k = rep[i];
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                } else {

                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                }

                v = partial.length === 0
                    ? '{}'
                    : gap
                        ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                        : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
        }
    }

    if (typeof JSON.stringify !== 'function') {
        meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        };
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = '';
            indent = '';

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

            } else if (typeof space === 'string') {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

            return str('', { '': value });
        };
    }


    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

            var j;

            function walk(holder, key) {

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }


            if (rx_one.test(text
                .replace(rx_two, '@')
                .replace(rx_three, ']')
                .replace(rx_four, ''))) {

                j = eval('(' + text + ')');

                return typeof reviver === 'function'
                    ? walk({ '': j }, '')
                    : j;
            }

            throw new SyntaxError('JSON.parse');
        };
    }
}());
