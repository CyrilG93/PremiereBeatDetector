# 🥁 Premiere Pro Beat Detector

A powerful Adobe Premiere Pro extension for automatic beat detection and marker placement in audio tracks.

**[English](#english)** | **[Français](#français)**

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
- **Flexible Marker Placement** - Choose between clip markers or sequence markers

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
1. Open Terminal in the extension folder
2. Run:
```bash
chmod +x install-mac.sh
./install-mac.sh
```
The installer enables debug mode automatically.

#### Step 2: Restart Premiere Pro
Go to **Window** > **Extensions** > **Beat Detector**

#### Manual installation only (if script cannot be used)
Enable debug mode in Terminal:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
defaults write com.adobe.CSXS.13 PlayerDebugMode 1
```
Then copy the extension folder to:
```
/Library/Application Support/Adobe/CEP/extensions/
```
Or for user-only installation:
```
~/Library/Application Support/Adobe/CEP/extensions/
```

---

### Windows

#### Recommended installation
1. Open the extension folder
2. Run `install-windows.bat`
The installer enables debug mode automatically.
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

**Version**: 1.1.4  

---

# Français

---

## ✨ Fonctionnalités

- **Détection automatique du BPM** - Algorithme avancé avec analyse multi-octave
- **Deux modes de détection** :
  - **Mode grille manuelle** - Grille de beats parfaite basée sur le BPM (recommandé)
  - **Mode algorithmique** - Boucle à verrouillage de phase pour les rythmes complexes
- **Prévisualisation en temps réel** - Marqueurs visuels sur la forme d'onde
- **Contrôle précis** - Ajustement manuel du BPM avec précision de 1ms
- **Marqueurs précis au frame** - Alignement automatique sur les frames
- **Lecture audio** - Prévisualisez votre audio avec pause/reprise
- **Support de subdivision** - Créez des marqueurs sur les temps, demi-temps ou quarts
- **Placement flexible** - Choix entre marqueurs de clip ou de séquence

---

## 📋 Prérequis

Cette extension est **autonome** et ne nécessite aucune dépendance externe !

| Prérequis | Description |
|-----------|-------------|
| **Adobe Premiere Pro** | Version 2020 (14.0) ou supérieure |
| **Système d'exploitation** | Windows 10/11 ou macOS 10.14+ |

> **Aucune installation de Python, Node.js ou autre logiciel requise !** L'extension utilise les technologies web intégrées.

---

## 🚀 Installation

### macOS

#### Installation recommandée
1. Ouvrez le Terminal dans le dossier de l'extension
2. Lancez :
```bash
chmod +x install-mac.sh
./install-mac.sh
```
L'installateur active automatiquement le mode debug.

#### Étape 2 : Redémarrer Premiere Pro
Allez dans **Fenêtre** > **Extensions** > **Beat Detector**

#### Installation manuelle uniquement (si le script ne peut pas être utilisé)
Activez le mode debug dans le Terminal :
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
defaults write com.adobe.CSXS.13 PlayerDebugMode 1
```
Puis copiez le dossier de l'extension vers :
```
/Library/Application Support/Adobe/CEP/extensions/
```
Ou pour une installation utilisateur uniquement :
```
~/Library/Application Support/Adobe/CEP/extensions/
```

---

### Windows

#### Installation recommandée
1. Ouvrez le dossier de l'extension
2. Lancez `install-windows.bat`
L'installateur active automatiquement le mode debug.
Il reste ouvert et attend une touche avant de se fermer.
Important : extrayez d'abord le ZIP, ne lancez pas l'installateur depuis un dossier compressé.

#### Étape 2 : Redémarrer Premiere Pro
Allez dans **Fenêtre** > **Extensions** > **Beat Detector**

#### Installation manuelle uniquement (si le script ne peut pas être utilisé)
1. Appuyez sur `Win + R`, tapez `regedit`, appuyez sur Entrée
2. Naviguez vers : `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
3. Clic droit > Nouveau > Valeur chaîne
4. Nom : `PlayerDebugMode`
5. Double-cliquez et définissez la valeur : `1`
6. Répétez pour `CSXS.12` et `CSXS.13`
7. Copiez l'extension vers :
```
C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.antigravity.beatdetector
```
Ou pour une installation utilisateur uniquement (sans admin) :
```
C:\Users\[VotreNomUtilisateur]\AppData\Roaming\Adobe\CEP\extensions\com.antigravity.beatdetector
```

---

## 📖 Utilisation

### Démarrage rapide

1. **Charger l'audio**
   - Cliquez sur "Load Active Sequence Audio" pour charger depuis un clip sélectionné
   - Ou cliquez sur "Select Audio File" pour charger un fichier

2. **Analyse automatique**
   - L'extension détecte automatiquement le BPM au chargement

3. **Ajuster les paramètres** (Mode grille manuelle - Recommandé)
   - **BPM** : Ajustez le tempo (60-200 BPM)
   - **First Beat Offset** : Ajustez le début de la grille
   - Mise à jour en temps réel de la prévisualisation

4. **Prévisualiser**
   - Cliquez sur "▶ Play Preview" pour écouter
   - Appuyez sur **Espace** pour pause/reprise

5. **Créer les marqueurs**
   - Choisissez le type de marqueur
   - Cliquez sur "Create Markers"

---

## 🐛 Dépannage

### L'extension n'apparaît pas
- Vérifiez que PlayerDebugMode est activé
- Vérifiez l'emplacement du dossier de l'extension
- Redémarrez complètement Premiere Pro
- Videz le cache CEP (macOS) : `rm -rf ~/Library/Caches/Adobe/CEP`

### Pas d'audio chargé
- Assurez-vous d'avoir un clip sélectionné dans la timeline
- Le clip doit contenir de l'audio
- Essayez "Select Audio File" pour charger directement un fichier

### Audio chargé mais pas d'analyse
- Si la waveform/audio est visible mais que l'analyse ne démarre pas, essayez **Select Audio File** avec un fichier local
- Évitez les chemins réseau/UNC sur les hôtes Premiere/CEP plus anciens
- Ouvrez la Console (F12) et vérifiez les erreurs de décodage/CORS

### Marqueurs non créés
- Analysez d'abord l'audio
- Pour les marqueurs de clip, sélectionnez un clip dans la timeline

---

## 📝 Détails techniques

- **Algorithme** : Autocorrélation multi-octave avec pondération harmonique
- **Précision** : ±0.1 BPM, précision de 1ms pour le décalage
- **Alignement** : Marqueurs automatiquement alignés sur les frames
- **Moteur audio** : WaveSurfer.js pour la visualisation et la lecture (embarqué en local, pas d'Internet requis)
- **Formats supportés** : MP3, WAV, AIFF et autres formats audio

---

## 📄 Licence

Extension fournie telle quelle pour Adobe Premiere Pro.

**Version** : 1.1.4  
