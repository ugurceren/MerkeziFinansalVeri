# Uygulama surumunu SemVer kuralina gore artirir.
# Kullanim: surum-artir.bat patch|minor|major|X.Y.Z [-NoGit]
#   patch  hata duzeltmesi          1.1.0 -> 1.1.1
#   minor  yeni ozellik             1.1.1 -> 1.2.0
#   major  uyumu bozan degisiklik   1.2.0 -> 2.0.0
# version.js ve API .csproj guncellenir; -NoGit verilmezse commit ve v-etiketi olusturulur.
param(
    [Parameter(Position = 0)][string]$Seviye,
    [switch]$NoGit
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$versionFile = Join-Path $root 'version.js'
$csprojFile = Join-Path $root 'src\MerkeziFinansalVeri.Api\MerkeziFinansalVeri.Api.csproj'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Fail([string]$message) {
    Write-Host "HATA: $message" -ForegroundColor Red
    exit 1
}

if (-not $Seviye) {
    Fail 'Seviye belirtin: patch, minor, major veya X.Y.Z (ornek: surum-artir.bat minor)'
}

$versionText = [System.IO.File]::ReadAllText($versionFile, $utf8)
$match = [regex]::Match($versionText, "version:\s*'(\d+)\.(\d+)\.(\d+)'")
if (-not $match.Success) { Fail "version.js icinde surum bulunamadi." }

$major = [int]$match.Groups[1].Value
$minor = [int]$match.Groups[2].Value
$patch = [int]$match.Groups[3].Value
$eski = "$major.$minor.$patch"

switch -Regex ($Seviye.ToLowerInvariant()) {
    '^patch$' { $patch++ }
    '^minor$' { $minor++; $patch = 0 }
    '^major$' { $major++; $minor = 0; $patch = 0 }
    '^\d+\.\d+\.\d+$' {
        $parts = $Seviye.Split('.') | ForEach-Object { [int]$_ }
        $major, $minor, $patch = $parts
    }
    default { Fail "Gecersiz seviye: '$Seviye'. patch, minor, major veya X.Y.Z kullanin." }
}

$yeni = "$major.$minor.$patch"
if ($yeni -eq $eski) { Fail "Surum zaten $eski." }

$tag = "v$yeni"
if (-not $NoGit) {
    git -C $root rev-parse -q --verify "refs/tags/$tag" *> $null
    if ($LASTEXITCODE -eq 0) { Fail "$tag etiketi zaten var." }
}

$bugun = Get-Date -Format 'yyyy-MM-dd'
$versionText = [regex]::Replace($versionText, "version:\s*'[^']*'", "version: '$yeni'")
$versionText = [regex]::Replace($versionText, "buildDate:\s*'[^']*'", "buildDate: '$bugun'")
[System.IO.File]::WriteAllText($versionFile, $versionText, $utf8)

$csprojText = [System.IO.File]::ReadAllText($csprojFile, $utf8)
if ($csprojText -notmatch '<Version>[^<]*</Version>') { Fail '.csproj icinde <Version> bulunamadi.' }
$csprojText = [regex]::Replace($csprojText, '<Version>[^<]*</Version>', "<Version>$yeni</Version>")
[System.IO.File]::WriteAllText($csprojFile, $csprojText, $utf8)

Write-Host "Surum: $eski -> $yeni ($bugun)" -ForegroundColor Green

if ($NoGit) {
    Write-Host 'Git islemi yapilmadi (-NoGit).'
    exit 0
}

# Yalnizca surum dosyalari commit edilir; diger bekleyen degisikliklere dokunulmaz
git -C $root add -- version.js 'src/MerkeziFinansalVeri.Api/MerkeziFinansalVeri.Api.csproj'
git -C $root commit -m "Surum $yeni" -- version.js 'src/MerkeziFinansalVeri.Api/MerkeziFinansalVeri.Api.csproj'
if ($LASTEXITCODE -ne 0) { Fail 'Commit olusturulamadi.' }
git -C $root tag -a $tag -m "Surum $yeni"
if ($LASTEXITCODE -ne 0) { Fail "$tag etiketi olusturulamadi." }

Write-Host "Commit ve $tag etiketi olusturuldu. GitHub'a gondermek icin:"
Write-Host '  git push origin main --follow-tags'
