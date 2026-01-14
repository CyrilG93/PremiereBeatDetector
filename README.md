# 🥁 Premiere Pro Beat Detector

A powerful Adobe Premiere Pro extension for automatic beat detection and marker placement in audio tracks.

**[English](#english)** | **[Français](#français)**

---

# English

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

#### Step 1: Enable Debug Mode
Open Terminal and run:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```
*Note: For Premiere Pro 2023 or earlier, you may also need CSXS.10*

#### Step 2: Install Extension
Copy the `PremiereBeatDetector` folder to:
```
/Library/Application Support/Adobe/CEP/extensions/
```
Or for user-only installation:
```
~/Library/Application Support/Adobe/CEP/extensions/
```

> **Tip**: Create the `extensions` folder if it doesn't exist.

#### Step 3: Restart Premiere Pro
Go to **Window** > **Extensions** > **Beat Detector**

---

### Windows

#### Step 1: Enable Debug Mode
1. Press `Win + R`, type `regedit`, press Enter
2. Navigate to: `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
3. Right-click > New > String Value
4. Name: `PlayerDebugMode`
5. Double-click and set Value: `1`
6. Repeat for `CSXS.12` if using Premiere Pro 2024+

#### Step 2: Install Extension
Copy the `PremiereBeatDetector` folder to:
```
C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\
```
Or for user-only installation:
```
C:\Users\[YourUsername]\AppData\Roaming\Adobe\CEP\extensions\
```

> **Tip**: Create the `extensions` folder if it doesn't exist.

#### Step 3: Restart Premiere Pro
Go to **Window** > **Extensions** > **Beat Detector**

---

## ✨ Features

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

---

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

### Markers Not Created
- Check the browser console (F12) for error messages
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
- **Audio Engine**: WaveSurfer.js for waveform visualization and playback
- **Supported Formats**: MP3, WAV, AIFF, and other browser-supported audio formats

---

## 📄 License

This extension is provided as-is for use with Adobe Premiere Pro.

**Version**: 1.0.0  
**Author**: Cyril V

---

# Français

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

#### Étape 1 : Activer le mode debug
Ouvrez le Terminal et exécutez :
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

#### Étape 2 : Installer l'extension
Copiez le dossier `PremiereBeatDetector` vers :
```
/Library/Application Support/Adobe/CEP/extensions/
```
Ou pour une installation utilisateur uniquement :
```
~/Library/Application Support/Adobe/CEP/extensions/
```

> **Conseil** : Créez le dossier `extensions` s'il n'existe pas.

#### Étape 3 : Redémarrer Premiere Pro
Allez dans **Fenêtre** > **Extensions** > **Beat Detector**

---

### Windows

#### Étape 1 : Activer le mode debug
1. Appuyez sur `Win + R`, tapez `regedit`, appuyez sur Entrée
2. Naviguez vers : `HKEY_CURRENT_USER\Software\Adobe\CSXS.11`
3. Clic droit > Nouveau > Valeur chaîne
4. Nom : `PlayerDebugMode`
5. Double-cliquez et définissez la valeur : `1`
6. Répétez pour `CSXS.12` si vous utilisez Premiere Pro 2024+

#### Étape 2 : Installer l'extension
Copiez le dossier `PremiereBeatDetector` vers :
```
C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\
```
Ou pour une installation utilisateur uniquement :
```
C:\Users\[VotreNomUtilisateur]\AppData\Roaming\Adobe\CEP\extensions\
```

> **Conseil** : Créez le dossier `extensions` s'il n'existe pas.

#### Étape 3 : Redémarrer Premiere Pro
Allez dans **Fenêtre** > **Extensions** > **Beat Detector**

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

### Marqueurs non créés
- Vérifiez la console du navigateur (F12) pour les erreurs
- Analysez d'abord l'audio
- Pour les marqueurs de clip, sélectionnez un clip dans la timeline

---

## 📝 Détails techniques

- **Algorithme** : Autocorrélation multi-octave avec pondération harmonique
- **Précision** : ±0.1 BPM, précision de 1ms pour le décalage
- **Alignement** : Marqueurs automatiquement alignés sur les frames
- **Moteur audio** : WaveSurfer.js pour la visualisation et la lecture
- **Formats supportés** : MP3, WAV, AIFF et autres formats audio

---

## 📄 Licence

Extension fournie telle quelle pour Adobe Premiere Pro.

**Version** : 1.0.0  
**Auteur** : Cyril V
