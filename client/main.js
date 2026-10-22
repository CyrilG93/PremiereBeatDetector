var csInterface = new CSInterface();
var wavesurfer;
var wsRegions;
var audioBuffer = null;
var allDetectedBeats = []; // Stores all raw detected beats
var filteredBeats = []; // Stores beats after subdivision
var filteredBeatColorIndexes = []; // Keeps each generated marker's Premiere color aligned with its beat.
var beatRegions = []; // Keeps green WaveSurfer regions so slider updates do not blank the waveform.
var firstBeatRegion = null; // Keeps the red first-beat region independent from the green beat list.
var subdivision = 1; // 1, 2, or 4
var clipStartOffset = 0; // Start time of the clip on the timeline
var autoAnalyzeTimer = null; // Debounce automatic analysis across decode/ready events
var manualPreviewFrame = null; // Coalesces rapid manual-slider input into one visual update per frame.
var markerColorsEnabled = false; // Uses one configurable color until the user enables the repeating beat palette.
var singleMarkerColorIndex = 0; // Green is Premiere's default marker color.
var markerColorCycle = [0, 1, 2, 3]; // Defaults to Green, Red, Purple, and Orange for a four-beat cycle.

function toWaveSurferUrl(pathOrUrl) {
    // Keep already valid URLs untouched (http, https, file, blob, etc.).
    if (!pathOrUrl || /^[a-z]+:\/\//i.test(pathOrUrl) || pathOrUrl.indexOf('blob:') === 0) {
        return pathOrUrl;
    }

    // Convert Windows backslashes to slashes and build a file:// URL for local files.
    var normalizedPath = pathOrUrl.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\//.test(normalizedPath)) {
        return 'file:///' + encodeURI(normalizedPath);
    }

    // Convert absolute Unix-like paths to file:// URLs.
    if (normalizedPath.charAt(0) === '/') {
        return 'file://' + encodeURI(normalizedPath);
    }

    return pathOrUrl;
}

var CEP_THEME_COLOR_CHANGED_EVENT = 'com.adobe.csxs.events.ThemeColorChanged';

function clampThemeChannel(value) {
    // Keep CEP RGB channels inside the valid CSS color range.
    var numericValue = Number(value);
    if (!isFinite(numericValue)) {
        return null;
    }

    return Math.max(0, Math.min(255, Math.round(numericValue)));
}

function readThemeRgbTriplet(value) {
    // Read direct CEP RGB payloads shaped as { red, green, blue }.
    if (!value || typeof value !== 'object') {
        return null;
    }

    var red = clampThemeChannel(value.red);
    var green = clampThemeChannel(value.green);
    var blue = clampThemeChannel(value.blue);
    if (red === null || green === null || blue === null) {
        return null;
    }

    return { red: red, green: green, blue: blue };
}

function readThemeColor(value) {
    // Support both CEP RGBColor and UIColor.color shapes from appSkinInfo.
    return readThemeRgbTriplet(value) || (value && readThemeRgbTriplet(value.color));
}

function mixThemeColor(left, right, rightWeight) {
    // Blend two RGB colors so derived surfaces stay near Premiere's host color.
    var clampedWeight = Math.max(0, Math.min(1, rightWeight));
    var leftWeight = 1 - clampedWeight;
    return {
        red: Math.round(left.red * leftWeight + right.red * clampedWeight),
        green: Math.round(left.green * leftWeight + right.green * clampedWeight),
        blue: Math.round(left.blue * leftWeight + right.blue * clampedWeight)
    };
}

function offsetThemeColor(color, delta) {
    // Nudge a neutral color brighter or darker without leaving RGB bounds.
    return {
        red: Math.max(0, Math.min(255, Math.round(color.red + delta))),
        green: Math.max(0, Math.min(255, Math.round(color.green + delta))),
        blue: Math.max(0, Math.min(255, Math.round(color.blue + delta)))
    };
}

function themeLuminance(color) {
    // Estimate perceived brightness to separate Light, Dark, and Darkest Premiere skins.
    return (0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue) / 255;
}

function normalizePanelBackground(color) {
    // Keep the main panel close to Premiere's host background, including Darkest mode.
    var luminance = themeLuminance(color);
    if (luminance <= 0.16) {
        return mixThemeColor(color, { red: 24, green: 24, blue: 24 }, luminance <= 0.04 ? 0.65 : 0.12);
    }
    if (luminance <= 0.32) {
        return mixThemeColor(color, { red: 58, green: 58, blue: 58 }, 0.42);
    }
    if (luminance >= 0.7) {
        return mixThemeColor(color, { red: 246, green: 246, blue: 246 }, 0.72);
    }
    if (luminance >= 0.55) {
        return mixThemeColor(color, { red: 242, green: 242, blue: 242 }, 0.5);
    }

    return color;
}

function setThemeColorVariable(name, color) {
    // Publish each token as a normal CSS color and as an RGB triplet for rgba().
    document.documentElement.style.setProperty(name, 'rgb(' + color.red + ', ' + color.green + ', ' + color.blue + ')');
    document.documentElement.style.setProperty(name + '-rgb', color.red + ', ' + color.green + ', ' + color.blue);
}

function readHostSkinInfo() {
    // Read the current CEP host theme; return null during local browser testing.
    try {
        if (!window.__adobe_cep__ || typeof window.__adobe_cep__.getHostEnvironment !== 'function') {
            return null;
        }

        var hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
        return hostEnvironment && hostEnvironment.appSkinInfo ? hostEnvironment.appSkinInfo : null;
    } catch (e) {
        console.warn('[Theme] Unable to read Premiere theme:', e);
        return null;
    }
}

function applyPremierePanelTheme() {
    // Convert Premiere appSkinInfo into stable panel tokens used by the CSS.
    var skinInfo = readHostSkinInfo();
    if (!skinInfo) {
        return;
    }

    var panelBackground = readThemeColor(skinInfo.panelBackgroundColorSRGB) ||
        readThemeColor(skinInfo.panelBackgroundColor) ||
        { red: 48, green: 48, blue: 48 };
    var highlightColor = readThemeColor(skinInfo.systemHighlightColor) || { red: 70, green: 137, blue: 255 };
    var hostLuminance = themeLuminance(panelBackground);
    var base = normalizePanelBackground(panelBackground);
    var isLightTheme = hostLuminance >= 0.55;
    var isDarkestTheme = hostLuminance <= 0.18;
    var textPrimary = isLightTheme ? { red: 36, green: 36, blue: 36 } : { red: 236, green: 236, blue: 236 };
    var textMuted = mixThemeColor(textPrimary, base, isLightTheme ? 0.58 : 0.44);
    var accentSeed = mixThemeColor(highlightColor, { red: 0, green: 100, blue: 203 }, 0.72);
    var accent = isLightTheme ? offsetThemeColor(accentSeed, -8) : offsetThemeColor(accentSeed, 10);

    document.documentElement.dataset.themeVariant = isLightTheme ? 'light' : isDarkestTheme ? 'darkest' : 'dark';
    setThemeColorVariable('--bg-primary', base);
    setThemeColorVariable('--bg-surface', offsetThemeColor(base, isLightTheme ? -7 : isDarkestTheme ? 8 : 6));
    setThemeColorVariable('--bg-soft', offsetThemeColor(base, isLightTheme ? -3 : isDarkestTheme ? 13 : 10));
    setThemeColorVariable('--bg-input', offsetThemeColor(base, isLightTheme ? -14 : isDarkestTheme ? -2 : -1));
    setThemeColorVariable('--bg-hover', offsetThemeColor(base, isLightTheme ? -17 : 20));
    setThemeColorVariable('--text-primary', textPrimary);
    setThemeColorVariable('--text-muted', textMuted);
    setThemeColorVariable('--accent', accent);
    setThemeColorVariable('--accent-hover', offsetThemeColor(accent, isLightTheme ? -10 : 18));
    setThemeColorVariable('--accent-active', offsetThemeColor(accent, isLightTheme ? -22 : -18));
    setThemeColorVariable('--border', offsetThemeColor(base, isLightTheme ? -28 : 16));
    setThemeColorVariable('--border-strong', offsetThemeColor(base, isLightTheme ? -42 : 24));
    setThemeColorVariable('--button-primary-text', themeLuminance(accent) >= 0.5 ? { red: 18, green: 18, blue: 18 } : { red: 246, green: 246, blue: 246 });

    var baseFontFamily = String(skinInfo.baseFontFamily || '').trim();
    if (baseFontFamily) {
        document.documentElement.style.setProperty('--ui-font-family', '"' + baseFontFamily + '", "Segoe UI", "San Francisco", sans-serif');
    }
}

function getCssVariable(name, fallback) {
    // Read a resolved CSS custom property for JS-owned canvas colors.
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function refreshWaveformTheme() {
    // Update WaveSurfer colors after Premiere theme changes when supported by the bundled version.
    if (wavesurfer && typeof wavesurfer.setOptions === 'function') {
        wavesurfer.setOptions({
            waveColor: getCssVariable('--accent', '#4a90e2'),
            progressColor: getCssVariable('--accent-active', '#d0021b'),
            cursorColor: getCssVariable('--text-primary', '#ffffff')
        });
    }
}

function bindPremiereThemeListener() {
    // Subscribe once so the panel follows Premiere light/dark changes without a reload.
    if (!window.__adobe_cep__ || typeof window.__adobe_cep__.addEventListener !== 'function') {
        return;
    }

    window.__adobe_cep__.addEventListener(CEP_THEME_COLOR_CHANGED_EVENT, function () {
        applyPremierePanelTheme();
        refreshWaveformTheme();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    applyPremierePanelTheme();
    bindPremiereThemeListener();
    initWaveSurfer();
    setupEventListeners();
    checkForUpdates();
});

// ============================================================================
// UPDATE SYSTEM
// ============================================================================

const GITHUB_REPO = 'CyrilG93/PremiereBeatDetector';
const PRODUCT_PAGE_URL = 'https://www.cyrilplugin.com/beat-detector';
let CURRENT_VERSION = '1.2.1';

// Open product and update links through CEP, with a browser fallback for local testing.
function openExternalUrl(url) {
    try {
        if (csInterface && typeof csInterface.openURLInDefaultBrowser === 'function') {
            csInterface.openURLInDefaultBrowser(url);
            return;
        }
    } catch (e) {
        console.error('[Link] Error opening URL through CEP:', e);
    }

    try {
        var popup = window.open(url, '_blank');
        if (!popup) {
            window.location.href = url;
        }
    } catch (fallbackError) {
        console.error('[Link] Browser fallback failed:', fallbackError);
    }
}

// Keep the existing badge layout while making the version clickable from mouse and keyboard.
function bindVersionBadgeLink(versionBadge, localVersion) {
    versionBadge.setAttribute('role', 'button');
    versionBadge.setAttribute('tabindex', '0');
    versionBadge.setAttribute('title', 'Open Beat Detector page');
    versionBadge.setAttribute('aria-label', 'Open Beat Detector page for version ' + localVersion);
    versionBadge.onclick = function () {
        openExternalUrl(PRODUCT_PAGE_URL);
    };
    versionBadge.onkeydown = function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openExternalUrl(PRODUCT_PAGE_URL);
        }
    };
}

/**
 * Compare two version strings (e.g. "1.0.0" vs "1.0.1")
 */
function compareVersions(v1, v2) {
    const p1 = v1.replace(/^v/, '').split('.').map(Number);
    const p2 = v2.replace(/^v/, '').split('.').map(Number);
    const len = Math.max(p1.length, p2.length);

    for (let i = 0; i < len; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    return 0;
}

/**
 * Get current version from manifest
 */
function getAppVersion() {
    try {
        if (window.cep && window.cep.fs) {
            const path = window.cep.fs.readFile(csInterface.getSystemPath(SystemPath.EXTENSION) + "/CSXS/manifest.xml");
            if (path.data) {
                const match = path.data.match(/ExtensionBundleVersion="([^"]+)"/);
                if (match && match[1]) {
                    return match[1];
                }
            }
        }
    } catch (e) {
        console.error('[Update] Error reading manifest:', e);
    }
    return CURRENT_VERSION;
}

/**
 * Check for updates on GitHub
 */
async function checkForUpdates() {
    console.log('[Update] Checking for updates...');
    const localVersion = getAppVersion();
    console.log('[Update] Local version:', localVersion);

    // Update settings badge
    const versionBadge = document.getElementById('versionInfo');
    if (versionBadge) {
        versionBadge.textContent = 'v' + localVersion;
        bindVersionBadgeLink(versionBadge, localVersion);
    }

    try {
        // Use standard fetch or Node https if available
        // Premiere extensions run in CEF, so fetch is available but CORS might be an issue.
        // Node is enabled in manifest, so we can use it.
        if (window.require) {
            const https = require('https');
            const options = {
                hostname: 'api.github.com',
                path: `/repos/${GITHUB_REPO}/releases/latest`,
                method: 'GET',
                headers: {
                    'User-Agent': 'PremiereCommon-UpdateCheck'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    handleUpdateResponse(data, localVersion);
                });
            });

            req.on('error', (e) => {
                console.error('[Update] Network error:', e);
            });

            req.end();
        } else {
            // Fallback to fetch (might fail due to CORS)
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            if (response.ok) {
                const data = await response.text();
                handleUpdateResponse(data, localVersion);
            }
        }

    } catch (e) {
        console.error('[Update] Unexpected error:', e);
    }
}

function handleUpdateResponse(data, localVersion) {
    try {
        const release = JSON.parse(data);
        const latestVersion = release.tag_name.replace(/^v/, '');

        console.log('[Update] Latest version:', latestVersion);

        if (compareVersions(latestVersion, localVersion) > 0) {
            console.log('[Update] New version available!');

            // Find zip asset
            const zipAsset = release.assets.find(asset => asset.name.endsWith('.zip'));
            const downloadUrl = zipAsset ? zipAsset.browser_download_url : release.html_url;

            showUpdateBanner(downloadUrl);
        } else {
            console.log('[Update] App is up to date.');
        }
    } catch (e) {
        console.error('[Update] Error parsing response:', e);
    }
}

/**
 * Show update banner
 */
function showUpdateBanner(downloadUrl) {
    const banner = document.getElementById('updateBanner');
    if (banner) {
        banner.style.display = 'block';

        // i18n logic based on Host Locale
        let locale = 'en_US';
        try {
            locale = csInterface.getHostEnvironment().appLocale;
        } catch (e) { }

        const isFrench = locale && locale.toLowerCase().startsWith('fr');
        banner.textContent = isFrench
            ? '🚀 Nouvelle version disponible ! Cliquez pour mettre à jour.'
            : '🚀 New version available! Click to update.';

        banner.onclick = function () {
            if (downloadUrl) {
                openExternalUrl(downloadUrl);
            }
        };
    }
}

function initWaveSurfer() {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: getCssVariable('--accent', '#4a90e2'),
        progressColor: getCssVariable('--accent-active', '#d0021b'),
        cursorColor: getCssVariable('--text-primary', '#ffffff'),
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
        waveColor: getCssVariable('--bg-hover', '#555555'),
        progressColor: getCssVariable('--text-muted', '#999999'),
        cursorColor: getCssVariable('--text-primary', '#ffffff'),
        height: 40,
        overlayColor: 'rgba(100, 100, 100, 0.4)',
        insertPosition: 'afterend'
    }));

    wavesurfer.on('load', function () {
        // Keep users informed during fetch/decode, especially on slower CEP hosts.
        document.getElementById('status-msg').textContent = "Loading audio data...";
    });

    wavesurfer.on('decode', function () {
        // Prefer decode event for stable buffer availability on older CEP runtimes.
        audioBuffer = wavesurfer.getDecodedData();
        scheduleAutoAnalysis('decode');
    });

    wavesurfer.on('ready', function () {
        document.getElementById('status-msg').textContent = "Audio loaded. Preparing analysis...";

        // Keep any existing decoded buffer if this host fires ready before decode.
        var decoded = wavesurfer.getDecodedData();
        if (decoded) {
            audioBuffer = decoded;
        }
        scheduleAutoAnalysis('ready');
    });

    wavesurfer.on('error', function (error) {
        console.error('[WaveSurfer] Audio load/decode error:', error);
        document.getElementById('status-msg').textContent =
            "Audio loaded but decode failed. Try 'Select Audio File' on a local file.";
    });
}

function scheduleAutoAnalysis(sourceEvent) {
    if (autoAnalyzeTimer) {
        clearTimeout(autoAnalyzeTimer);
    }

    // Debounce so decode/ready firing order differences do not trigger duplicate runs.
    autoAnalyzeTimer = setTimeout(function () {
        runAutoAnalysis(sourceEvent);
    }, 120);
}

function runAutoAnalysis(sourceEvent) {
    try {
        // Re-check decoded data at runtime for CEP hosts where decode arrives late.
        var decoded = wavesurfer.getDecodedData();
        if (decoded) {
            audioBuffer = decoded;
        }

        if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
            document.getElementById('status-msg').textContent =
                "Audio loaded, but analysis data is unavailable on this host.";
            console.warn('[Analysis] Missing decoded buffer after', sourceEvent);
            return;
        }

        document.getElementById('status-msg').textContent = "Audio loaded. Analyzing...";

        // Quick BPM detection used to initialize the manual grid controls.
        var threshold = 0.35;
        var minDistance = 0.45;
        var detectionResult = detectFirstBeatAndTempo(audioBuffer, threshold, minDistance, true);

        // Update BPM slider with detected tempo.
        document.getElementById('bpm').value = Math.round(detectionResult.tempo);
        document.getElementById('bpm-val').textContent = Math.round(detectionResult.tempo) + ' BPM';

        // Update first beat offset.
        document.getElementById('first-beat').value = detectionResult.firstBeat;
        document.getElementById('first-beat-val').textContent = detectionResult.firstBeat.toFixed(3) + 's';

        analyzeBeats();
    } catch (e) {
        console.error('[Analysis] Auto-analysis failed:', e);
        document.getElementById('status-msg').textContent =
            "Analysis failed on this host. Open Console (F12) for details.";
    }
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
        csInterface.evalScript("BeatDetector_getSelectedClipPath()", function (result) {
            console.log("getSelectedClipPath result:", result);
            try {
                var data = JSON.parse(result);
                if (data.error) {
                    document.getElementById('status-msg').textContent = "Error: " + data.error;
                    alert("Error loading clip: " + data.error);
                } else if (data.path) {
                    clipStartOffset = data.startSeconds || 0;
                    // Support both Windows and macOS path separators.
                    var clipName = data.name || data.path.split(/[\\/]/).pop();
                    loadAudio(data.path, clipName);
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

    // Let users keep one color or assign a repeating palette that follows the selected subdivision.
    document.getElementById('marker-colors-enabled').addEventListener('change', function (e) {
        markerColorsEnabled = e.target.checked;
        updateMarkerColorControls();
        updateFilteredBeats();
    });
    document.getElementById('marker-color-single').addEventListener('change', function (e) {
        singleMarkerColorIndex = getPremiereMarkerColorIndex(e.target.value, 0);
        updateFilteredBeats();
    });
    for (var colorSlot = 0; colorSlot < markerColorCycle.length; colorSlot++) {
        document.getElementById('marker-color-cycle-' + colorSlot).addEventListener('change', function (e) {
            var slot = parseInt(e.target.id.replace('marker-color-cycle-', ''), 10);
            markerColorCycle[slot] = getPremiereMarkerColorIndex(e.target.value, 0);
            updateFilteredBeats();
        });
    }
    updateMarkerColorControls();

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

    // Recalculate the visible color slots before regenerating the marker color list.
    updateMarkerColorControls();
    updateFilteredBeats();
}

function getPremiereMarkerColorIndex(value, fallback) {
    // Accept only Premiere's documented marker palette indexes (0 Green through 7 Cyan).
    var colorIndex = parseInt(value, 10);
    if (isNaN(colorIndex) || colorIndex < 0 || colorIndex > 7) {
        return fallback;
    }
    return colorIndex;
}

function getMarkerColorCycleLength() {
    // A four-beat musical cycle contains four colors at /1, two at /2, and one at /4.
    return Math.max(1, Math.round(4 / subdivision));
}

function getMarkerColorIndexForBeat(beatIndex, firstBeatIndex) {
    // Keep a single chosen color when color coding is off, regardless of the generated beat position.
    if (!markerColorsEnabled) {
        return singleMarkerColorIndex;
    }

    // Convert the original beat index into a non-negative position in the selected marker cycle.
    var selectedBeatPosition = Math.round((beatIndex - firstBeatIndex) / subdivision);
    var cycleLength = getMarkerColorCycleLength();
    var cyclePosition = ((selectedBeatPosition % cycleLength) + cycleLength) % cycleLength;
    return markerColorCycle[cyclePosition];
}

function updateMarkerColorControls() {
    // Show only the controls that matter for the active one-color or repeating-color mode.
    var singleColorControl = document.getElementById('single-marker-color-control');
    var cycleControls = document.getElementById('marker-color-cycle-controls');
    var cycleLength = getMarkerColorCycleLength();
    singleColorControl.style.display = markerColorsEnabled ? 'none' : 'flex';
    cycleControls.style.display = markerColorsEnabled ? 'block' : 'none';

    if (!markerColorsEnabled) {
        return;
    }

    document.getElementById('marker-color-help').textContent =
        'Repeats every four original beats: ' + cycleLength + (cycleLength === 1 ? ' color' : ' colors') + ' at /' + subdivision + '.';
    for (var slot = 0; slot < markerColorCycle.length; slot++) {
        var colorControl = document.querySelector('[data-color-slot="' + slot + '"]');
        colorControl.style.display = slot < cycleLength ? 'flex' : 'none';
    }
}

function loadAudio(url, name) {
    document.getElementById('file-name').textContent = name || url;
    document.getElementById('status-msg').textContent = "Loading audio...";

    // Reset state
    allDetectedBeats = [];
    filteredBeats = [];
    filteredBeatColorIndexes = [];
    beatRegions = [];
    firstBeatRegion = null;
    audioBuffer = null;
    if (autoAnalyzeTimer) {
        clearTimeout(autoAnalyzeTimer);
        autoAnalyzeTimer = null;
    }
    wsRegions.clearRegions();
    document.getElementById('btn-create-markers').disabled = true;

    wavesurfer.load(toWaveSurferUrl(url));
}

function analyzeBeats() {
    if (!audioBuffer) {
        document.getElementById('status-msg').textContent = "No audio loaded!";
        return;
    }

    document.getElementById('status-msg').textContent = "Analyzing...";

    var mode = window.detectionMode || 'manual';

    // Keep the inexpensive manual grid synchronous so its preview follows the slider directly.
    function runAnalysis() {
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
    }

    if (mode === 'manual') {
        runAnalysis();
    } else {
        // Let the panel repaint its status before the heavier automatic analysis starts.
        setTimeout(runAnalysis, 50);
    }
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

function scheduleManualGridPreview() {
    // Limit rapid range-input events to one grid refresh per painted frame.
    if (manualPreviewFrame !== null) {
        return;
    }

    manualPreviewFrame = requestAnimationFrame(function () {
        manualPreviewFrame = null;
        analyzeBeats();
    });
}

// Live preview for manual mode sliders
document.getElementById('bpm').addEventListener('input', function () {
    if (audioBuffer && window.detectionMode === 'manual') {
        scheduleManualGridPreview();
    }
});

document.getElementById('first-beat').addEventListener('input', function () {
    if (audioBuffer && window.detectionMode === 'manual') {
        scheduleManualGridPreview();
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

    // Find the generated beat that represents the user's first-beat offset.
    var firstBeatOffset = parseFloat(document.getElementById('first-beat').value);
    var firstBeatIndex = 0;
    var smallestOffsetDifference = Infinity;
    for (var i = 0; i < allDetectedBeats.length; i++) {
        var offsetDifference = Math.abs(allDetectedBeats[i] - firstBeatOffset);
        if (offsetDifference < smallestOffsetDifference) {
            smallestOffsetDifference = offsetDifference;
            firstBeatIndex = i;
        }
    }

    // Apply subdivision and retain the matching Premiere color for every selected beat.
    filteredBeats = [];
    filteredBeatColorIndexes = [];
    for (var j = 0; j < allDetectedBeats.length; j++) {
        // Anchor /2 and /4 to the first beat, rather than to the clip's changing leading beat.
        if ((j - firstBeatIndex) % subdivision === 0) {
            filteredBeats.push(allDetectedBeats[j]);
            filteredBeatColorIndexes.push(getMarkerColorIndexForBeat(j, firstBeatIndex));
        }
    }

    document.getElementById('status-msg').textContent =
        "Detected " + filteredBeats.length + " beats (/" + subdivision + ")";

    // Update the first beat separately so it never exchanges its red region with a green neighbor.
    var firstBeatTime = allDetectedBeats[firstBeatIndex];
    var firstBeatOptions = {
        start: firstBeatTime,
        end: firstBeatTime + 0.05,
        color: 'rgba(255, 0, 0, 0.3)',
        drag: false,
        resize: false
    };
    if (firstBeatRegion) {
        firstBeatRegion.setOptions(firstBeatOptions);
    } else if (wsRegions) {
        firstBeatRegion = wsRegions.addRegion(firstBeatOptions);
    }

    // Update existing green regions in place so the waveform never briefly loses all beat bars.
    var greenBeatIndex = 0;
    for (var k = 0; k < filteredBeats.length; k++) {
        var beatTime = filteredBeats[k];
        if (beatTime === firstBeatTime) {
            continue;
        }
        var regionOptions = {
            start: beatTime,
            end: beatTime + 0.05,
            color: 'rgba(0, 255, 0, 0.3)',
            drag: false,
            resize: false
        };

        if (beatRegions[greenBeatIndex]) {
            beatRegions[greenBeatIndex].setOptions(regionOptions);
        } else if (wsRegions) {
            beatRegions[greenBeatIndex] = wsRegions.addRegion(regionOptions);
        }
        greenBeatIndex++;
    }

    // Remove only regions no longer needed after an audio duration or subdivision change.
    while (beatRegions.length > greenBeatIndex) {
        beatRegions.pop().remove();
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
    var markerColorsJson = JSON.stringify(filteredBeatColorIndexes);
    var markerType = document.getElementById('marker-type').value;
    var offset = clipStartOffset; // Use the captured start time

    // Debug info
    var debugInfo = "Creating markers:\n";
    debugInfo += "- Beats count: " + filteredBeats.length + "\n";
    debugInfo += "- First 5 beats: " + filteredBeats.slice(0, 5).join(", ") + "s\n";
    debugInfo += "- Last 5 beats: " + filteredBeats.slice(-5).join(", ") + "s\n";
    debugInfo += "- Marker type: " + markerType + "\n";
    debugInfo += "- Offset: " + offset + "s\n";
    debugInfo += "- Marker colors: " + markerColorsJson;

    console.log(debugInfo);
    console.log("Beats JSON:", beatsJson.substring(0, 200));

    // Properly escape the JSON string for ExtendScript
    // We need to escape quotes and pass it as a string literal
    var escapedJson = beatsJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    var escapedMarkerColorsJson = markerColorsJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    var script = 'BeatDetector_addMarkers("' + escapedJson + '", ' + offset + ', "' + markerType + '", "' + escapedMarkerColorsJson + '")';

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
