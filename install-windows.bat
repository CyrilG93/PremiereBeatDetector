@echo off
setlocal enableextensions
:: Beat Detector - Windows Installation Script
:: Version 1.1.4

title Beat Detector - Installation

echo.
echo ========================================
echo Beat Detector - Installation Windows
echo ========================================
echo.

set "SOURCE_DIR=%~dp0"
set "EXTENSION_ID=com.antigravity.beatdetector"
set "SYSTEM_EXT_PATH_X86=%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\%EXTENSION_ID%"
set "SYSTEM_EXT_PATH_X64=%ProgramFiles%\Common Files\Adobe\CEP\extensions\%EXTENSION_ID%"
set "USER_EXT_PATH=%APPDATA%\Adobe\CEP\extensions\%EXTENSION_ID%"
set "EXTENSION_PATH="

:: Step 1: Enable debug mode
echo Step 1/2: Enabling CEP debug mode...
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
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

:: Prefer system install when writable; fallback to user profile if not.
call :try_system_path "%SYSTEM_EXT_PATH_X86%"
if not defined EXTENSION_PATH call :try_system_path "%SYSTEM_EXT_PATH_X64%"

if not defined EXTENSION_PATH (
    set "EXTENSION_PATH=%USER_EXT_PATH%"
    if not exist "%EXTENSION_PATH%" mkdir "%EXTENSION_PATH%" >nul 2>&1
    if not exist "%EXTENSION_PATH%" (
        echo ERROR: Could not create extension folder:
        echo %EXTENSION_PATH%
        echo.
        pause
        exit /b 1
    )
    echo [INFO] Installing for current user (no system write access).
) else (
    echo [OK] Installing to system extensions folder.
)

:: Copy files
set "COPY_FAILED=0"
xcopy /Y /E /I /Q "%SOURCE_DIR%client" "%EXTENSION_PATH%\client\" >nul
if errorlevel 2 set "COPY_FAILED=1"
xcopy /Y /E /I /Q "%SOURCE_DIR%host" "%EXTENSION_PATH%\host\" >nul
if errorlevel 2 set "COPY_FAILED=1"
xcopy /Y /E /I /Q "%SOURCE_DIR%CSXS" "%EXTENSION_PATH%\CSXS\" >nul
if errorlevel 2 set "COPY_FAILED=1"

if exist "%SOURCE_DIR%.debug" copy /Y "%SOURCE_DIR%.debug" "%EXTENSION_PATH%\.debug" >nul
if exist "%SOURCE_DIR%README.md" copy /Y "%SOURCE_DIR%README.md" "%EXTENSION_PATH%\README.md" >nul

if "%COPY_FAILED%"=="1" (
    echo ERROR: Failed to copy one or more extension folders.
    echo Target path: %EXTENSION_PATH%
    echo.
    pause
    exit /b 1
)

echo [OK] Extension installed successfully
echo [OK] Installed to: %EXTENSION_PATH%
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
exit /b 0

:try_system_path
set "CANDIDATE=%~1"
if "%CANDIDATE%"=="" goto :eof

for %%P in ("%CANDIDATE%") do set "CANDIDATE_PARENT=%%~dpP"
if not exist "%CANDIDATE_PARENT%" goto :eof

if not exist "%CANDIDATE%" mkdir "%CANDIDATE%" >nul 2>&1
if not exist "%CANDIDATE%" goto :eof

set "WRITE_TEST_FILE=%CANDIDATE%\.__beatdetector_write_test"
type nul > "%WRITE_TEST_FILE%" 2>nul
if exist "%WRITE_TEST_FILE%" (
    del /Q "%WRITE_TEST_FILE%" >nul 2>&1
    set "EXTENSION_PATH=%CANDIDATE%"
)
goto :eof
