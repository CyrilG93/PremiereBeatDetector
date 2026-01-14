@echo off
:: Beat Detector - Windows Installation Script
:: Version 1.0.0

title Beat Detector - Installation

echo.
echo ========================================
echo Beat Detector - Installation Windows
echo ========================================
echo.

:: Check for administrator privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo ERREUR: Privileges administrateur requis!
    echo.
    echo Clic droit sur install-windows.bat
    echo et selectionnez "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

echo [OK] Running with administrator privileges
echo.

set "SOURCE_DIR=%~dp0"
set "EXTENSION_PATH=%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\PremiereBeatDetector"

:: Step 1: Enable debug mode
echo Step 1/2: Enabling CEP debug mode...
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
echo [OK] Debug mode enabled
echo.

:: Step 2: Copy extension files
echo Step 2/2: Installing extension files...

:: Check source files exist
if not exist "%SOURCE_DIR%client" (
    echo ERROR: Extension files not found!
    echo This script must be run from the extension folder.
    pause
    exit /b 1
)

:: Create extension directory
if not exist "%EXTENSION_PATH%" (
    mkdir "%EXTENSION_PATH%"
)

:: Copy files
xcopy /Y /E /I /Q "%SOURCE_DIR%client" "%EXTENSION_PATH%\client\" >nul
xcopy /Y /E /I /Q "%SOURCE_DIR%host" "%EXTENSION_PATH%\host\" >nul
xcopy /Y /E /I /Q "%SOURCE_DIR%CSXS" "%EXTENSION_PATH%\CSXS\" >nul

if exist "%SOURCE_DIR%.debug" copy /Y "%SOURCE_DIR%.debug" "%EXTENSION_PATH%\.debug" >nul
if exist "%SOURCE_DIR%README.md" copy /Y "%SOURCE_DIR%README.md" "%EXTENSION_PATH%\README.md" >nul

echo [OK] Extension installed successfully
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart Adobe Premiere Pro
echo 2. Go to Window ^> Extensions ^> Beat Detector
echo 3. Load an audio clip and detect beats!
echo.
pause
