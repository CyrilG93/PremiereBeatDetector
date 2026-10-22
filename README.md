# 🥁 Premiere Pro Beat Detector

A powerful Adobe Premiere Pro extension for automatic beat detection and marker placement in audio tracks.

---

# English

---

## ✨ Features

- **Automatic BPM Detection** - Advanced algorithm with multi-octave analysis and harmonic weighting
- **Two Detection Modes**:
  - **Manual Grid Mode** - Perfect beat grid based on BPM and first beat offset (recommended)
  - **Algorithmic Mode** - Phase-locked loop for complex rhythms (for experimentation)
- **Real-time Preview** - Visual beat markers on waveform with live updates
- **Precise Control** - Manual BPM adjustment and first beat offset with 1ms precision
- **Audio Playback** - Preview your audio with pause/resume functionality
- **Subdivision Support** - Create markers at full beats, half notes (/2), or quarter notes (/4)
- **Configurable Marker Colors** - Keep one marker color or repeat Premiere's marker colors by beat position
- **Flexible Marker Placement** - Choose between clip markers or sequence markers
- **Premiere Theme Support** - The panel follows Premiere Pro's light and dark interface colors

---

## 📋 Requirements

This extension is **self-contained** and requires no external dependencies!

| Requirement | Description |
|-------------|-------------|
| **Adobe Premiere Pro** | Version 2020 (14.0) or later |
| **Operating System** | Windows 10/11 or macOS 10.14+ |

> **No Python, Node.js, or other software installation required!** The extension uses built-in web technologies.

---

## 🚀 Installation

### macOS

#### Recommended installation
1. Open terminal and drag and drop `install-mac.sh` on it and launch it.

Or:
1. Open Terminal in the extension folder
2. Run:
```bash
./install-mac.sh
```
The installer enables debug mode automatically and installs Beat Detector for the current user, without administrator rights.

#### Step 2: Restart Premiere Pro
Go to **Window** > **Extensions** > **Beat Detector**

#### Manual installation only (if script cannot be used)
Enable debug mode in Terminal:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
defaults write com.adobe.CSXS.13 PlayerDebugMode 1
```
Then copy the extension folder to the user extensions folder:
```
~/Library/Application Support/Adobe/CEP/extensions/
```

---

### Windows

#### Recommended installation
1. Open the extension folder
2. Run `install-windows.bat`
The installer enables debug mode automatically.
It installs Beat Detector for the current Windows user, without administrator rights.
It stays open and waits for a key press before closing.
Important: extract the ZIP first, do not run the installer directly from a compressed folder.

#### Step 2: Restart Premiere Pro
Go to **Window** > **Extensions** > **Beat Detector**

#### Manual installation only (if script cannot be used)
1. Press `Win + R`, type `regedit`, press Enter
2. Navigate to: `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
3. Right-click > New > String Value
4. Name: `PlayerDebugMode`
5. Double-click and set Value: `1`
6. Repeat for `CSXS.12` and `CSXS.13`
7. Copy the extension to:
```
C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.antigravity.beatdetector
```
Or for user-only installation (no admin):
```
C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions\com.antigravity.beatdetector
```


## 📖 Usage

### Quick Start

1. **Load Audio**
   - Click "Load Active Sequence Audio" to load audio from a selected clip in your timeline
   - Or click "Select Audio File" to load any audio file

2. **Auto-Analysis**
   - The extension automatically detects BPM and analyzes beats when audio is loaded
   - BPM and first beat are detected and displayed

3. **Adjust Parameters** (Manual Grid Mode - Recommended)
   - **BPM**: Fine-tune the detected tempo (60-200 BPM)
   - **First Beat Offset**: Adjust where the beat grid starts (0-5 seconds)
   - Both sliders update the preview in real-time

4. **Preview**
   - Click "▶ Play Preview" to listen to your audio
   - Visual beat markers appear on the waveform (first beat in red, others in green)
   - Press **Spacebar** to play/pause

5. **Create Markers**
   - Choose marker type:
     - **Clip Markers (Source)**: Markers on the source clip
     - **Sequence Markers (Offset)**: Markers on the timeline
   - Click "Create Markers" to add beat markers to Premiere Pro
   - While markers are being created, click "Stop" to keep the markers already placed and cancel the remaining ones

6. **Marker Colors**
   - Leave "Different colors by beat" off to use one selected Premiere marker color
   - Turn it on to choose a repeating color for each beat position: four colors at `/1`, two at `/2`, and one at `/4`

### Detection Modes

#### Manual Grid Mode (Recommended)
- Creates a perfect beat grid based on BPM and first beat
- No drift over time
- Best for music with consistent tempo
- Full manual control over BPM and timing

#### Algorithmic Mode
- Advanced phase-locked loop algorithm
- Adapts to tempo changes
- Best for complex or variable tempo music
- Adjustable threshold and minimum beat distance

---

## 🐛 Troubleshooting

### Extension Not Visible
- Make sure PlayerDebugMode is enabled (see installation steps)
- Check that the extension folder is in the correct location
- Restart Premiere Pro completely
- Clear CEP cache (macOS): `rm -rf ~/Library/Caches/Adobe/CEP`

### No Audio Loaded
- Make sure you have a clip selected in the timeline
- The clip must have audio
- Try using "Select Audio File" to load a file directly

### Audio Loads But No Analysis
- If waveform/audio appears but analysis does not start, try **Select Audio File** with a local file path
- Avoid network/UNC paths when possible on older Premiere/CEP hosts
- Open Console (F12) and check for decode/CORS errors

### Markers Not Created
- Make sure you have analyzed the audio first
- For clip markers, ensure a clip is selected in the timeline
- Try using sequence markers instead

### BPM Detection Issues
- The algorithm works best with clear, percussive music
- For complex music, try adjusting the Threshold slider in Algorithmic mode
- You can always manually adjust the BPM slider in Manual Grid mode

---

## 📝 Technical Details

- **Algorithm**: Multi-octave autocorrelation with harmonic weighting and comb filtering
- **Precision**: ±0.1 BPM tempo detection, 1ms offset precision
- **Frame Snapping**: Markers are automatically aligned to timeline frames
- **Audio Engine**: WaveSurfer.js for waveform visualization and playback (bundled locally, no internet required)
- **Supported Formats**: MP3, WAV, AIFF, and other browser-supported audio formats

---

## 📄 License

This extension is provided as-is for use with Adobe Premiere Pro.

**Version**: 1.2.3

---

## Changelog

### 1.2.0 — 2026-10-15

- The Manual Grid preview is now stable while adjusting BPM or the first beat: `/2` and `/4` always keep the selected first beat visible, with smoother marker updates.
- The panel now follows Premiere Pro's light and dark themes, and its version badge opens the Beat Detector page.
- Improved audio loading and automatic analysis reliability in CEP hosts, including Premiere Pro 2024 on Windows.
- Simplified installation on macOS and Windows: both installers work in the current user account without administrator rights and provide clearer feedback.

### 1.1.3 — 2026-02-06

- Added an automatic update notification with a direct download link and a localized update banner.
- Fixed macOS installer permission issues.

### 1.1.2 — 2026-01-20

- Added `BeatDetector_` prefixes to ExtendScript functions to prevent conflicts with other Premiere extensions.

### 1.1.1 — 2026-01-14

- Improved the bilingual README and added macOS and Windows installer scripts.
- Corrected the Windows debug-mode registry instructions.

### 1.1.0 — 2025-12-19

- First public release of Premiere Pro Beat Detector.
