@echo off
title Merkezi Finansal Veri - Baslatici
cd /d "%~dp0"

set WEB_PORT=5500
set API_PORT=5038

echo ============================================
echo  Merkezi Finansal Veri - Gelistirme Ortami
echo ============================================
echo.
echo API:    http://localhost:%API_PORT%
echo Portal: http://localhost:%WEB_PORT%/HomePage.html
echo.

REM API (ayri pencere)
start "MGV - API (%API_PORT%)" cmd /k call "%~dp0start-api.bat"

REM Statik web sunucusu (ayri pencere)
where python >nul 2>&1
if %ERRORLEVEL%==0 (
    start "MGV - Web (%WEB_PORT%)" cmd /k "cd /d ""%~dp0"" && python -m http.server %WEB_PORT%"
) else (
    echo Python bulunamadi, npx serve kullaniliyor...
    start "MGV - Web (%WEB_PORT%)" cmd /k "cd /d ""%~dp0"" && npx --yes serve -l %WEB_PORT%"
)

REM API'nin ayaga kalkmasi icin kisa bekleme
timeout /t 4 /nobreak >nul
start "" "http://localhost:%WEB_PORT%/HomePage.html"

echo.
echo Tarayici acildi. API ve web sunucusu ayri pencerelerde calisiyor.
echo Durdurmak icin o pencereleri kapatin veya Ctrl+C kullanin.
echo.
echo Masaustu kisayolu: baslat.bat dosyasina sag tik ^> Masaustune gonder
echo.
pause
