@echo off
setlocal
if "%~1"=="" (
    echo Kullanim: surum-artir.bat patch^|minor^|major^|X.Y.Z [-NoGit]
    echo   patch  hata duzeltmesi          1.1.0 -^> 1.1.1
    echo   minor  yeni ozellik             1.1.1 -^> 1.2.0
    echo   major  uyumu bozan degisiklik   1.2.0 -^> 2.0.0
    echo   -NoGit dosyalari gunceller, commit ve etiket olusturmaz
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0surum-artir.ps1" %*
exit /b %ERRORLEVEL%
