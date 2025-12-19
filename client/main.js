var csInterface = new CSInterface();
var wavesurfer;
var wsRegions;
var audioBuffer = null;
var allDetectedBeats = []; // Stores all raw detected beats
var filteredBeats = []; // Stores beats after subdivision
var subdivision = 1; // 1, 2, or 4
var clipStartOffset = 0; // Start time of the clip on the timeline

document.addEventListener('DOMContentLoaded', function () {
    initWaveSurfer();
    setupEventListeners();
});

function initWaveSurfer() {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#4a90e2',
        progressColor: '#d0021b',
        cursorColor: '#fff',
        height: 128,
        normalize: true,
        minPxPerSec: 100, // Increased for better zoom
        scrollParent: true,
        hideScrollbar: false
    });

    // Initialize Regions plugin
    wsRegions = wavesurfer.registerPlugin(WaveSurfer.Regions.create());

    // Initialize Minimap plugin for timeline-style navigation with handles
    var minimap = wavesurfer.registerPlugin(WaveSurfer.Minimap.create({
        container: '#wave-minimap',
        waveColor: '#555',
        progressColor: '#999',
        cursorColor: '#fff',
        height: 40,
        overlayColor: 'rgba(100, 100, 100, 0.4)',
        insertPosition: 'afterend'
    }));

    wavesurfer.on('ready', function () {
        document.getElementById('status-msg').textContent = "Audio loaded. Analyzing...";

        // Get the decoded audio buffer
        audioBuffer = wavesurfer.getDecodedData();

        // Auto-detect BPM and analyze on load
        setTimeout(function () {
            // Quick BPM detection
            var threshold = 0.35;
            var minDistance = 0.45;
            var detectionResult = detectFirstBeatAndTempo(audioBuffer, threshold, minDistance, true);

            // Update BPM slider with detected tempo
            document.getElementById('bpm').value = Math.round(detectionResult.tempo);
            document.getElementById('bpm-val').textContent = Math.round(detectionResult.tempo) + ' BPM';

            // Update first beat offset
            document.getElementById('first-beat').value = detectionResult.firstBeat;
            document.getElementById('first-beat-val').textContent = detectionResult.firstBeat.toFixed(3) + 's';

            // Run analysis
            analyzeBeats();
        }, 100);
    });
}

function setupEventListeners() {
    var detectionMode = 'manual'; // 'manual' or 'auto'

    // Mode switching
    document.getElementById('btn-mode-manual').addEventListener('click', function () {
        detectionMode = 'manual';
        window.detectionMode = 'manual'; // Update global immediately
        document.getElementById('btn-mode-manual').classList.add('active');
        document.getElementById('btn-mode-auto').classList.remove('active');
        document.getElementById('manual-controls').style.display = 'block';
        document.getElementById('auto-controls').style.display = 'none';
        if (audioBuffer) analyzeBeats();
    });

    document.getElementById('btn-mode-auto').addEventListener('click', function () {
        detectionMode = 'auto';
        window.detectionMode = 'auto'; // Update global immediately
        document.getElementById('btn-mode-auto').classList.add('active');
        document.getElementById('btn-mode-manual').classList.remove('active');
        document.getElementById('manual-controls').style.display = 'none';
        document.getElementById('auto-controls').style.display = 'block';
        if (audioBuffer) analyzeBeats();
    });

    // Store mode globally
    window.detectionMode = detectionMode;

    document.getElementById('btn-select-file').addEventListener('click', function () {
        if (window.cep) {
            var result = window.cep.fs.showOpenDialog(false, false, "Select Audio File", null, ["mp3", "wav", "aiff"]);
            if (result.data && result.data.length > 0) {
                loadAudio(result.data[0]);
                clipStartOffset = 0;
            }
        } else {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.onchange = function (e) {
                var file = e.target.files[0];
                if (file) {
                    var url = URL.createObjectURL(file);
                    loadAudio(url, file.name);
                }
            };
            input.click();
        }
    });

    document.getElementById('btn-load-active').addEventListener('click', function () {
        document.getElementById('status-msg').textContent = "Getting selected clip...";
        csInterface.evalScript("getSelectedClipPath()", function (result) {
            console.log("getSelectedClipPath result:", result);
            try {
                var data = JSON.parse(result);
                if (data.error) {
                    document.getElementById('status-msg').textContent = "Error: " + data.error;
                    alert("Error loading clip: " + data.error);
                } else if (data.path) {
                    clipStartOffset = data.startSeconds || 0;
                    loadAudio(data.path, data.path.split('/').pop());
                    document.getElementById('status-msg').textContent = "Loaded clip (Start: " + clipStartOffset.toFixed(2) + "s)";
                }
            } catch (e) {
                document.getElementById('status-msg').textContent = "Error parsing response: " + result;
                console.error("Parse error:", e);
            }
        });
    });

    document.getElementById('btn-create-markers').addEventListener('click', createMarkersInPremiere);

    // Threshold slider with live update
    document.getElementById('threshold').addEventListener('input', function (e) {
        document.getElementById('threshold-val').textContent = e.target.value + '%';
    });

    // Min distance slider with live update
    document.getElementById('min-distance').addEventListener('input', function (e) {
        document.getElementById('min-distance-val').textContent = e.target.value + 'ms';
    });

    // BPM input with live update
    document.getElementById('bpm').addEventListener('input', function (e) {
        document.getElementById('bpm-val').textContent = e.target.value + ' BPM';
    });

    // First beat offset input with live update
    document.getElementById('first-beat').addEventListener('input', function (e) {
        document.getElementById('first-beat-val').textContent = parseFloat(e.target.value).toFixed(3) + 's';
    });

    // Subdivision buttons
    document.getElementById('btn-sub-1').addEventListener('click', function () { setSubdivision(1, this); });
    document.getElementById('btn-sub-2').addEventListener('click', function () { setSubdivision(2, this); });
    document.getElementById('btn-sub-4').addEventListener('click', function () { setSubdivision(4, this); });

    // Click track
    document.getElementById('btn-play-click').addEventListener('click', playClickTrack);

    // Spacebar to play/pause click track - simple and reliable
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' || e.key === ' ') {
            // Prevent default only if we have audio loaded
            if (audioBuffer) {
                e.preventDefault();
                e.stopPropagation();
                // Trigger click track button
                document.getElementById('btn-play-click').click();
            }
        }
    });
}

function setSubdivision(val, btn) {
    subdivision = val;

    // Update UI
    document.querySelectorAll('.button-group button').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');

    updateFilteredBeats();
}

function loadAudio(url, name) {
    document.getElementById('file-name').textContent = name || url;
    document.getElementById('status-msg').textContent = "Loading audio...";

    // Reset state
    allDetectedBeats = [];
    filteredBeats = [];
    wsRegions.clearRegions();
    document.getElementById('btn-create-markers').disabled = true;

    wavesurfer.load(url);
}

function analyzeBeats() {
    if (!audioBuffer) {
        document.getElementById('status-msg').textContent = "No audio loaded!";
        return;
    }

    document.getElementById('status-msg').textContent = "Analyzing...";

    var mode = window.detectionMode || 'manual';

    setTimeout(function () {
        try {
            if (mode === 'manual') {
                // Manual grid mode
                var manualBPM = parseInt(document.getElementById('bpm').value);
                var firstBeatOffset = parseFloat(document.getElementById('first-beat').value);
                var threshold = parseInt(document.getElementById('threshold').value) / 100;
                var minDistance = parseInt(document.getElementById('min-distance').value) / 1000;

                // Use the manual offset directly (no auto-detection)
                var firstBeat = firstBeatOffset;

                // Generate beat grid using manual BPM and first beat
                allDetectedBeats = generateBeatGrid(firstBeat, manualBPM, audioBuffer.duration);
                console.log("Manual Grid: First beat at " + firstBeat.toFixed(3) + "s, BPM: " + manualBPM + ", Total: " + allDetectedBeats.length + " beats");
            } else {
                // Algorithmic mode
                var threshold = parseInt(document.getElementById('threshold').value) / 100;
                var minDistance = parseInt(document.getElementById('min-distance').value) / 1000;
                allDetectedBeats = getImprovedBeats(audioBuffer, threshold, minDistance);
                console.log("Algorithmic: Detected " + allDetectedBeats.length + " beats");
            }

            updateFilteredBeats();
        } catch (e) {
            console.error(e);
            document.getElementById('status-msg').textContent = "Analysis failed: " + e.message;
        }
    }, 50);
}

// Detect first beat and estimate tempo
function detectFirstBeatAndTempo(buffer, threshold, minDistance, updateUI) {
    var data = buffer.getChannelData(0);
    var sampleRate = buffer.sampleRate;
    var length = data.length;

    // Calculate onset strength
    var windowSize = 1024;
    var hopSize = 256;
    var onsetStrength = [];

    for (var i = windowSize; i < length - windowSize; i += hopSize) {
        var prevEnergy = 0;
        var currEnergy = 0;

        for (var j = 0; j < windowSize; j++) {
            prevEnergy += data[i - windowSize + j] * data[i - windowSize + j];
            currEnergy += data[i + j] * data[i + j];
        }

        var diff = Math.sqrt(currEnergy / windowSize) - Math.sqrt(prevEnergy / windowSize);
        onsetStrength.push({
            time: i / sampleRate,
            strength: Math.max(0, diff)
        });
    }

    // Find threshold
    var strengths = onsetStrength.map(function (o) { return o.strength; });
    strengths.sort(function (a, b) { return a - b; });
    var median = strengths[Math.floor(strengths.length / 2)];
    var mean = strengths.reduce(function (a, b) { return a + b; }, 0) / strengths.length;
    var variance = 0;
    for (var i = 0; i < strengths.length; i++) {
        variance += Math.pow(strengths[i] - mean, 2);
    }
    var stdDev = Math.sqrt(variance / strengths.length);
    var autoThreshold = median + (1.5 * stdDev);
    var finalThreshold = autoThreshold * (0.5 + threshold);

    // Find first strong beat
    var firstBeat = 0;
    for (var i = 2; i < onsetStrength.length - 2; i++) {
        var current = onsetStrength[i];
        var isLocalMax = current.strength > onsetStrength[i - 1].strength &&
            current.strength > onsetStrength[i - 2].strength &&
            current.strength > onsetStrength[i + 1].strength &&
            current.strength > onsetStrength[i + 2].strength;

        if (isLocalMax && current.strength > finalThreshold * 1.2) {
            firstBeat = current.time;
            break;
        }
    }

    // Estimate BPM using autocorrelation
    var tempo = estimateTempo(onsetStrength, sampleRate, { min: 60, max: 200 });

    console.log("Detected: First beat at " + firstBeat.toFixed(2) + "s, Tempo: " + tempo.toFixed(1) + " BPM");

    // Only update BPM slider if requested (for auto mode)
    if (updateUI) {
        document.getElementById('bpm').value = Math.round(tempo);
        document.getElementById('bpm-val').textContent = Math.round(tempo) + ' BPM';
    }

    return {
        firstBeat: firstBeat,
        tempo: tempo
    };
}

// Generate beat grid from first beat and BPM
function generateBeatGrid(firstBeat, bpm, duration) {
    var beatInterval = 60.0 / bpm;
    var beats = [];

    // Start from first beat and go forward
    var time = firstBeat;
    while (time < duration) {
        beats.push(time);
        time += beatInterval;
    }

    // Also go backward from first beat if needed
    time = firstBeat - beatInterval;
    while (time >= 0) {
        beats.unshift(time);
        time -= beatInterval;
    }

    return beats;
}

// Live preview for manual mode sliders
document.getElementById('bpm').addEventListener('input', function () {
    if (audioBuffer && window.detectionMode === 'manual') {
        analyzeBeats();
    }
});

document.getElementById('first-beat').addEventListener('input', function () {
    if (audioBuffer && window.detectionMode === 'manual') {
        analyzeBeats();
    }
});

// Live preview for algorithmic mode sliders
document.getElementById('threshold').addEventListener('input', function () {
    if (audioBuffer && window.detectionMode === 'auto') {
        analyzeBeats();
    }
});

document.getElementById('min-distance').addEventListener('input', function () {
    if (audioBuffer && window.detectionMode === 'auto') {
        analyzeBeats();
    }
});

// Filter existing beats by new threshold
function filterByThreshold(beats, threshold, minDistance) {
    // Re-analyze is needed for threshold changes
    // For now, just return existing beats
    return beats;
}

// Fully automatic beat detection with phase-locked loop
function getImprovedBeats(buffer, threshold, minDistance) {
    var data = buffer.getChannelData(0);
    var sampleRate = buffer.sampleRate;
    var length = data.length;

    console.log("Starting phase-locked beat detection...");

    // Step 1: Calculate onset strength function
    var windowSize = 1024;
    var hopSize = 256;
    var onsets = [];

    for (var i = 0; i < length - windowSize; i += hopSize) {
        var sum = 0;
        for (var j = 0; j < windowSize; j++) {
            var sample = data[i + j];
            sum += sample * sample;
        }
        var energy = Math.sqrt(sum / windowSize);
        onsets.push({
            time: i / sampleRate,
            energy: energy
        });
    }

    // Step 2: Calculate onset strength (first derivative)
    var onsetStrength = [];
    for (var i = 1; i < onsets.length; i++) {
        var diff = onsets[i].energy - onsets[i - 1].energy;
        onsetStrength.push({
            time: onsets[i].time,
            strength: Math.max(0, diff)
        });
    }

    // Step 3: Estimate tempo
    var tempo = estimateTempo(onsetStrength, sampleRate, { min: 60, max: 180 });
    var beatInterval = 60.0 / tempo;

    console.log("Detected tempo: " + tempo.toFixed(1) + " BPM");

    // Step 4: Calculate automatic threshold
    var strengths = onsetStrength.map(function (o) { return o.strength; });
    strengths.sort(function (a, b) { return a - b; });

    var median = strengths[Math.floor(strengths.length / 2)];
    var mean = strengths.reduce(function (a, b) { return a + b; }, 0) / strengths.length;

    var variance = 0;
    for (var i = 0; i < strengths.length; i++) {
        variance += Math.pow(strengths[i] - mean, 2);
    }
    var stdDev = Math.sqrt(variance / strengths.length);

    var autoThreshold = median + (1.5 * stdDev);
    var finalThreshold = autoThreshold * (0.5 + threshold);

    console.log("Auto threshold: " + autoThreshold.toFixed(4) + ", Final: " + finalThreshold.toFixed(4));

    // Step 5: Phase-locked loop beat tracking
    var peaks = [];
    var beatPhase = 0; // Current phase in the beat cycle (0 to 1)
    var lastBeatTime = -beatInterval;
    var phaseCorrection = 0;

    for (var i = 2; i < onsetStrength.length - 2; i++) {
        var current = onsetStrength[i];

        // Check if it's a local maximum
        var isLocalMax = current.strength > onsetStrength[i - 1].strength &&
            current.strength > onsetStrength[i - 2].strength &&
            current.strength > onsetStrength[i + 1].strength &&
            current.strength > onsetStrength[i + 2].strength;

        if (!isLocalMax || current.strength < finalThreshold) {
            continue;
        }

        var timeSinceLastBeat = current.time - lastBeatTime;

        // First few beats: establish the grid
        if (peaks.length < 4) {
            if (timeSinceLastBeat > minDistance) {
                peaks.push(current.time);
                lastBeatTime = current.time;
                beatPhase = 0;
            }
        } else {
            // Phase-locked loop: predict next beat time
            var predictedBeatTime = lastBeatTime + beatInterval;
            var timeError = current.time - predictedBeatTime;
            var phaseError = timeError / beatInterval;

            // Accept beat if within phase tolerance
            if (Math.abs(phaseError) < 0.25 && timeSinceLastBeat > minDistance * 0.7) {
                peaks.push(current.time);

                // Phase correction: adjust interval based on error
                beatInterval = beatInterval + (timeError * 0.1); // Gentle correction
                lastBeatTime = current.time;
                beatPhase = 0;
            }
            // If we've waited too long, insert a predicted beat
            else if (timeSinceLastBeat > beatInterval * 1.3) {
                // Insert predicted beat to maintain grid
                var predictedTime = lastBeatTime + beatInterval;
                peaks.push(predictedTime);
                lastBeatTime = predictedTime;
                beatPhase = 0;

                // Check if current onset could be the next beat
                if (current.time - predictedTime > beatInterval * 0.5 &&
                    current.time - predictedTime < beatInterval * 1.3) {
                    peaks.push(current.time);
                    lastBeatTime = current.time;
                }
            }
        }
    }

    // Step 6: Fill in any gaps with predicted beats
    var filledBeats = [];
    for (var i = 0; i < peaks.length - 1; i++) {
        filledBeats.push(peaks[i]);

        var gap = peaks[i + 1] - peaks[i];
        if (gap > beatInterval * 1.8) {
            // Fill gap with predicted beats
            var numMissing = Math.round(gap / beatInterval) - 1;
            for (var j = 1; j <= numMissing; j++) {
                filledBeats.push(peaks[i] + (beatInterval * j));
            }
        }
    }
    if (peaks.length > 0) {
        filledBeats.push(peaks[peaks.length - 1]);
    }

    console.log("Detected " + peaks.length + " beats, filled to " + filledBeats.length + " beats");
    return filledBeats;
}

// Improved tempo estimation with harmonic analysis and multi-octave detection
function estimateTempo(onsets, sampleRate, bpmRange) {
    var hopTime = 256 / sampleRate;
    var minLag = Math.floor((60.0 / bpmRange.max) / hopTime);
    var maxLag = Math.floor((60.0 / bpmRange.min) / hopTime);

    console.log("Tempo estimation: lag range " + minLag + " to " + maxLag);

    // Step 1: Calculate autocorrelation with energy weighting
    var correlations = [];

    for (var lag = minLag; lag < maxLag && lag < onsets.length / 3; lag++) {
        var score = 0;
        var count = 0;

        for (var i = 0; i < onsets.length - lag; i++) {
            // Weight by energy to emphasize strong beats
            var weight = onsets[i].strength * onsets[i + lag].strength;
            score += weight;
            count++;
        }

        if (count > 0) {
            score = score / count;
        }

        var bpm = 60.0 / (lag * hopTime);
        correlations.push({
            lag: lag,
            score: score,
            bpm: bpm
        });
    }

    // Step 2: Find peaks in correlation function
    var peaks = [];
    for (var i = 2; i < correlations.length - 2; i++) {
        var curr = correlations[i];
        // Check if it's a local maximum
        if (curr.score > correlations[i - 1].score &&
            curr.score > correlations[i - 2].score &&
            curr.score > correlations[i + 1].score &&
            curr.score > correlations[i + 2].score) {
            peaks.push(curr);
        }
    }

    // Sort peaks by score
    peaks.sort(function (a, b) { return b.score - a.score; });

    if (peaks.length === 0) {
        console.log("No peaks found, using fallback");
        return 120; // Fallback
    }

    console.log("Found " + peaks.length + " tempo peaks");

    // Step 3: Multi-octave analysis - check for half/double tempo errors
    var candidates = [];

    // Consider top 5 peaks
    for (var i = 0; i < Math.min(5, peaks.length); i++) {
        var peak = peaks[i];
        var bpm = peak.bpm;

        // Add this candidate
        candidates.push({
            bpm: bpm,
            score: peak.score,
            confidence: peak.score
        });

        // Also consider octave variations (half and double)
        if (bpm * 2 >= bpmRange.min && bpm * 2 <= bpmRange.max) {
            candidates.push({
                bpm: bpm * 2,
                score: peak.score * 0.8, // Slightly lower confidence
                confidence: peak.score * 0.8
            });
        }

        if (bpm / 2 >= bpmRange.min && bpm / 2 <= bpmRange.max) {
            candidates.push({
                bpm: bpm / 2,
                score: peak.score * 0.8,
                confidence: peak.score * 0.8
            });
        }
    }

    // Step 4: Score candidates based on musical plausibility
    for (var i = 0; i < candidates.length; i++) {
        var bpm = candidates[i].bpm;

        // Prefer tempos in common ranges
        var plausibilityBonus = 1.0;

        if (bpm >= 115 && bpm <= 145) {
            plausibilityBonus = 1.3; // Strong preference for 120-140 range
        } else if (bpm >= 80 && bpm <= 105) {
            plausibilityBonus = 1.2; // Good preference for 80-100 range
        } else if (bpm >= 145 && bpm <= 180) {
            plausibilityBonus = 1.15; // Moderate preference for fast tempos
        } else if (bpm >= 60 && bpm <= 80) {
            plausibilityBonus = 1.1; // Slight preference for slow tempos
        }

        candidates[i].confidence *= plausibilityBonus;
    }

    // Step 5: Find best candidate
    candidates.sort(function (a, b) { return b.confidence - a.confidence; });

    var bestTempo = candidates[0].bpm;

    console.log("Top 3 candidates:");
    for (var i = 0; i < Math.min(3, candidates.length); i++) {
        console.log("  " + candidates[i].bpm.toFixed(1) + " BPM (confidence: " + candidates[i].confidence.toFixed(4) + ")");
    }

    // Step 6: Refine using comb filtering
    var refinedTempo = refineTempoComb(onsets, bestTempo, hopTime);

    console.log("Final tempo: " + refinedTempo.toFixed(1) + " BPM (refined from " + bestTempo.toFixed(1) + ")");

    return refinedTempo;
}

// Refine tempo using comb filtering
function refineTempoComb(onsets, initialTempo, hopTime) {
    // Try small variations around the initial tempo
    var bestTempo = initialTempo;
    var bestScore = 0;

    // Search ±5% around initial tempo
    var minTempo = initialTempo * 0.95;
    var maxTempo = initialTempo * 1.05;
    var step = 0.1; // 0.1 BPM steps

    for (var tempo = minTempo; tempo <= maxTempo; tempo += step) {
        var beatInterval = 60.0 / tempo;
        var lagSamples = beatInterval / hopTime;

        // Calculate comb filter score
        var score = 0;
        var count = 0;

        // Check alignment at multiples of the beat interval
        for (var mult = 1; mult <= 8; mult++) {
            var lag = Math.round(lagSamples * mult);

            if (lag >= onsets.length) break;

            for (var i = 0; i < onsets.length - lag; i++) {
                score += onsets[i].strength * onsets[i + lag].strength;
                count++;
            }
        }

        if (count > 0) {
            score = score / count;
        }

        if (score > bestScore) {
            bestScore = score;
            bestTempo = tempo;
        }
    }

    return bestTempo;
}

function updateFilteredBeats() {
    if (allDetectedBeats.length === 0) return;

    // Apply subdivision
    filteredBeats = [];
    for (var i = 0; i < allDetectedBeats.length; i++) {
        if (subdivision === 1) {
            filteredBeats.push(allDetectedBeats[i]);
        } else if (subdivision === 2) {
            if (i % 2 === 0) filteredBeats.push(allDetectedBeats[i]);
        } else if (subdivision === 4) {
            if (i % 4 === 0) filteredBeats.push(allDetectedBeats[i]);
        }
    }

    document.getElementById('status-msg').textContent =
        "Detected " + filteredBeats.length + " beats (/" + subdivision + ")";

    // Clear existing regions
    if (wsRegions) {
        wsRegions.clearRegions();
    }

    // Get first beat offset to determine which beat is the "first"
    var firstBeatOffset = parseFloat(document.getElementById('first-beat').value);

    // Add new regions for each beat
    for (var i = 0; i < filteredBeats.length; i++) {
        var beatTime = filteredBeats[i];

        // Check if this is the first beat (the one at the offset position)
        var isFirstBeat = Math.abs(beatTime - firstBeatOffset) < 0.01; // Within 10ms tolerance

        wsRegions.addRegion({
            start: beatTime,
            end: beatTime + 0.05,
            color: isFirstBeat ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)', // Red for first, green for others
            drag: false,
            resize: false
        });
    }
    document.getElementById('btn-create-markers').disabled = false;
}

// Spectral Flux Beat Detection - much more accurate
function getEnergyPeaks(buffer, threshold, minDistance) {
    var data = buffer.getChannelData(0);
    var sampleRate = buffer.sampleRate;
    var length = data.length;
    var peaks = [];

    // Apply simple low-pass filter by averaging nearby samples
    var filteredData = new Float32Array(length);
    var filterSize = 5; // Average 5 samples (focuses on bass frequencies)

    for (var i = 0; i < length; i++) {
        var sum = 0;
        var count = 0;
        for (var j = Math.max(0, i - filterSize); j < Math.min(length, i + filterSize); j++) {
            sum += data[j];
            count++;
        }
        filteredData[i] = sum / count;
    }

    // Calculate energy envelope using RMS in sliding windows
    var windowSize = 2048; // ~46ms at 44.1kHz
    var hopSize = 512; // 75% overlap
    var energyHistory = [];

    for (var i = 0; i < length - windowSize; i += hopSize) {
        var sum = 0;
        for (var j = 0; j < windowSize; j++) {
            var sample = filteredData[i + j];
            sum += sample * sample;
        }
        var rms = Math.sqrt(sum / windowSize);
        energyHistory.push({
            time: i / sampleRate,
            energy: rms
        });
    }

    // Calculate spectral flux (energy difference between windows)
    var flux = [];
    for (var i = 1; i < energyHistory.length; i++) {
        var diff = energyHistory[i].energy - energyHistory[i - 1].energy;
        flux.push({
            time: energyHistory[i].time,
            flux: Math.max(0, diff) // Only positive changes (onsets)
        });
    }

    // Calculate adaptive threshold
    var fluxValues = flux.map(function (f) { return f.flux; });
    var meanFlux = fluxValues.reduce(function (a, b) { return a + b; }, 0) / fluxValues.length;
    var adaptiveThreshold = meanFlux * (1 + threshold * 2); // Scale with user threshold

    // Find peaks in flux that exceed adaptive threshold
    var lastPeakTime = -minDistance;

    for (var i = 1; i < flux.length - 1; i++) {
        var current = flux[i];
        var prev = flux[i - 1];
        var next = flux[i + 1];

        // Peak detection: current > neighbors and above threshold
        if (current.flux > prev.flux &&
            current.flux > next.flux &&
            current.flux > adaptiveThreshold) {

            if (current.time - lastPeakTime > minDistance) {
                peaks.push(current.time);
                lastPeakTime = current.time;
            }
        }
    }

    console.log("Spectral flux detection: " + peaks.length + " peaks, threshold: " + adaptiveThreshold.toFixed(4));
    return peaks;
}

// Fallback: Simple Peak Detection (faster but less accurate)
function getPeaks(buffer, threshold, minDistance) {
    var data = buffer.getChannelData(0);
    var peaks = [];
    var lastPeakTime = -minDistance;
    var sampleRate = buffer.sampleRate;
    var length = data.length;
    var step = 50;

    for (var i = 0; i < length; i += step) {
        var amplitude = Math.abs(data[i]);

        if (amplitude > threshold) {
            var time = i / sampleRate;
            if (time - lastPeakTime > minDistance) {
                peaks.push(time);
                lastPeakTime = time;
            }
        }
    }
    return peaks;
}

function createMarkersInPremiere() {
    if (filteredBeats.length === 0) {
        alert("No beats detected! Please analyze audio first.");
        return;
    }

    document.getElementById('status-msg').textContent = "Creating markers in Premiere...";

    // Convert beats array to string for passing to ExtendScript
    var beatsJson = JSON.stringify(filteredBeats);
    var markerType = document.getElementById('marker-type').value;
    var offset = clipStartOffset; // Use the captured start time

    // Debug info
    var debugInfo = "Creating markers:\n";
    debugInfo += "- Beats count: " + filteredBeats.length + "\n";
    debugInfo += "- First 5 beats: " + filteredBeats.slice(0, 5).join(", ") + "s\n";
    debugInfo += "- Last 5 beats: " + filteredBeats.slice(-5).join(", ") + "s\n";
    debugInfo += "- Marker type: " + markerType + "\n";
    debugInfo += "- Offset: " + offset + "s";

    console.log(debugInfo);
    console.log("Beats JSON:", beatsJson.substring(0, 200));

    // Properly escape the JSON string for ExtendScript
    // We need to escape quotes and pass it as a string literal
    var escapedJson = beatsJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    var script = 'addMarkers("' + escapedJson + '", ' + offset + ', "' + markerType + '")';

    console.log("ExtendScript call:", script.substring(0, 200));

    csInterface.evalScript(script, function (result) {
        console.log("addMarkers result:", result);
        try {
            var res = JSON.parse(result);
            console.log("Parsed result:", res);

            if (res.success) {
                var msg = "Created " + res.count + " markers!";
                document.getElementById('status-msg').textContent = msg;

                if (res.count === 0) {
                    alert("WARNING: 0 markers created!\n\n" + debugInfo);
                } else if (res.failed && res.failed > 0) {
                    alert("Created " + res.count + " markers, but " + res.failed + " failed.");
                }
            } else if (res.error) {
                document.getElementById('status-msg').textContent = "Error: " + res.error;
                alert("Failed to create markers:\n\n" + res.error + "\n\n" + debugInfo);
            }
        } catch (e) {
            console.error("Parse error:", e);
            alert("Response parse error!\n\nRaw response: " + result + "\n\nError: " + e.toString());
            document.getElementById('status-msg').textContent = "Markers created (response parse error)";
        }
    });
}

function playClickTrack() {
    if (!audioBuffer || filteredBeats.length === 0) return;

    var btn = document.getElementById('btn-play-click');

    // Toggle play/pause
    if (wavesurfer.isPlaying()) {
        wavesurfer.pause();
        btn.textContent = '▶ Play Preview';
        return;
    }

    wavesurfer.play();
    btn.textContent = '⏸ Pause Preview';

    // Update button when playback finishes
    wavesurfer.on('finish', function () {
        btn.textContent = '▶ Play Preview';
    });
}
