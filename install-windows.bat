@echo off
setlocal enableextensions enabledelayedexpansion
:: Beat Detector - Windows Installation Script
:: Version 1.2.4

title Beat Detector - Installation

echo.
echo ========================================
echo Beat Detector - Installation Windows
echo ========================================
echo.

set "SOURCE_DIR=%~dp0"
set "EXTENSION_ID=com.antigravity.beatdetector"
set "USER_EXT_PATH=%APPDATA%\Adobe\CEP\extensions\%EXTENSION_ID%"
set "EXTENSION_PATH=%USER_EXT_PATH%"

REM // Step 1: Enable CEP debug mode for common Premiere/CEP runtimes.
echo Step 1/2: Enabling CEP debug mode...
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
echo [OK] Debug mode enabled
echo.

REM // Step 2: Copy extension files from the extracted installer folder.
echo Step 2/2: Installing extension files...

REM // Check source files exist before touching the install target.
if not exist "!SOURCE_DIR!client\main.js" (
    echo ERROR: Extension files not found!
    echo Make sure the ZIP is fully extracted and run this script from that extracted folder.
    call :wait_for_close
    exit /b 1
)
if not exist "!SOURCE_DIR!host\index.jsx" (
    echo ERROR: Extension files not found!
    echo Make sure the ZIP is fully extracted and run this script from that extracted folder.
    call :wait_for_close
    exit /b 1
)
if not exist "!SOURCE_DIR!CSXS\manifest.xml" (
    echo ERROR: Extension files not found!
    echo Make sure the ZIP is fully extracted and run this script from that extracted folder.
    call :wait_for_close
    exit /b 1
)

REM // Install in the current user CEP folder so double-click installs do not need admin rights.
echo [INFO] Installing for current user.

if not exist "!EXTENSION_PATH!" mkdir "!EXTENSION_PATH!" >nul 2>&1
if not exist "!EXTENSION_PATH!" (
    echo ERROR: Could not create extension folder:
    echo !EXTENSION_PATH!
    echo.
    call :wait_for_close
    exit /b 1
)

REM // Copy runtime folders and optional metadata into the chosen CEP extension folder.
set "COPY_FAILED=0"
xcopy /Y /E /I /Q "!SOURCE_DIR!client" "!EXTENSION_PATH!\client\" >nul
if errorlevel 1 set "COPY_FAILED=1"
xcopy /Y /E /I /Q "!SOURCE_DIR!host" "!EXTENSION_PATH!\host\" >nul
if errorlevel 1 set "COPY_FAILED=1"
xcopy /Y /E /I /Q "!SOURCE_DIR!CSXS" "!EXTENSION_PATH!\CSXS\" >nul
if errorlevel 1 set "COPY_FAILED=1"

if exist "!SOURCE_DIR!.debug" copy /Y "!SOURCE_DIR!.debug" "!EXTENSION_PATH!\.debug" >nul
if errorlevel 1 set "COPY_FAILED=1"
if exist "!SOURCE_DIR!README.md" copy /Y "!SOURCE_DIR!README.md" "!EXTENSION_PATH!\README.md" >nul
if errorlevel 1 set "COPY_FAILED=1"

if "!COPY_FAILED!"=="1" (
    echo ERROR: Failed to copy one or more extension folders.
    echo Target path: !EXTENSION_PATH!
    echo Make sure this script is run from an extracted folder ^(not directly from a ZIP^).
    echo.
    call :wait_for_close
    exit /b 1
)

echo [OK] Extension installed successfully
echo [OK] Installed to: !EXTENSION_PATH!
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
call :wait_for_close
exit /b 0

:wait_for_close
echo Press any key to close this window...
pause >nul
goto :eof
