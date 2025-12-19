# Premiere Pro Beat Detector

A powerful Adobe Premiere Pro extension for automatic beat detection and marker placement in audio tracks.

## Features

- **Automatic BPM Detection** - Advanced algorithm with multi-octave analysis and harmonic weighting
- **Two Detection Modes**:
  - **Manual Grid Mode** - Perfect beat grid based on BPM and first beat offset (recommended)
  - **Algorithmic Mode** - Phase-locked loop for complex rhythms
- **Real-time Preview** - Visual beat markers on waveform with live updates
- **Precise Control** - Manual BPM adjustment and first beat offset with 1ms precision
- **Frame-Accurate Markers** - Markers snap to exact frames in Premiere Pro timeline
- **Audio Playback** - Preview your audio with pause/resume functionality
- **Subdivision Support** - Create markers at full beats, half notes (/2), or quarter notes (/4)
- **Flexible Marker Placement** - Choose between clip markers or sequence markers

## Installation

### Mac

1. **Enable Debug Mode**
   ```bash
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   ```
   *Note: For Premiere Pro 2024 or earlier, use CSXS.10 or CSXS.9*

2. **Install Extension**
   - Copy the `PremiereBeatDetector` folder to:
     ```
     ~/Library/Application Support/Adobe/CEP/extensions/
     ```
   - If the `extensions` folder doesn't exist, create it

3. **Clear CEP Cache** (optional but recommended)
   ```bash
   rm -rf ~/Library/Caches/Adobe/CEP
   ```

4. **Restart Premiere Pro**

5. **Open Extension**
   - Go to `Window > Extensions > Beat Detector`

### Windows

1. **Enable Debug Mode**
   - Create or edit the file:
     ```
     C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions\.debug
     ```
   - Add this content:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <ExtensionList>
         <Extension Id="com.example.beatdetector">
             <HostList>
                 <Host Name="PPRO" Port="8088"/>
             </HostList>
         </Extension>
     </ExtensionList>
     ```

2. **Install Extension**
   - Copy the `PremiereBeatDetector` folder to:
     ```
     C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\
     ```
   - Or for user-specific installation:
     ```
     C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions\
     ```

3. **Restart Premiere Pro**

4. **Open Extension**
   - Go to `Window > Extensions > Beat Detector`

## Usage

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
   - Use the minimap below the waveform to zoom and navigate

5. **Create Markers**
   - Choose marker type:
     - **Clip Markers (Source)**: Markers on the source clip
     - **Sequence Markers (Offset)**: Markers on the timeline
   - Click "Create Markers" to add beat markers to Premiere Pro

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

### Tips

- **BPM Detection**: The algorithm is accurate to ±0.1 BPM. Check the browser console (F12) for detailed detection info
- **First Beat Alignment**: Use the First Beat Offset slider to align the grid with the actual first beat of your music
- **Subdivision**: Use /2 or /4 to create markers on half notes or quarter notes
- **Zoom**: Use the minimap to zoom in on specific sections of your waveform
- **Frame Accuracy**: All markers are automatically snapped to exact frames

## Troubleshooting

### Extension Not Visible
- Make sure PlayerDebugMode is enabled (see installation steps)
- Check that the extension folder is in the correct location
- Restart Premiere Pro completely
- Clear CEP cache and restart

### No Audio Loaded
- Make sure you have a clip selected in the timeline
- The clip must have audio
- Try using "Select Audio File" to load a file directly

### Markers Not Created
- Check the browser console (F12) for error messages
- Make sure you have analyzed the audio first
- For clip markers, ensure a clip is selected in the timeline
- Try using sequence markers instead

### BPM Detection Issues
- The algorithm works best with clear, percussive music
- For complex music, try adjusting the Threshold slider in Algorithmic mode
- You can always manually adjust the BPM slider in Manual Grid mode

## Technical Details

- **Algorithm**: Multi-octave autocorrelation with harmonic weighting and comb filtering
- **Precision**: ±0.1 BPM tempo detection, 1ms offset precision
- **Frame Snapping**: Markers are automatically aligned to timeline frames
- **Audio Engine**: WaveSurfer.js for waveform visualization and playback
- **Supported Formats**: MP3, WAV, AIFF, and other browser-supported audio formats

## Version

1.0.0 - Initial Release

## License

This extension is provided as-is for use with Adobe Premiere Pro.

## Support

For issues or questions, check the browser console (F12) for detailed error messages and detection logs.
