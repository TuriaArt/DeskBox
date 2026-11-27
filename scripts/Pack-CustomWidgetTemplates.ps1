<#
.SYNOPSIS
    Packs built-in custom widget templates into importable .dbxwidget share packages.

.DESCRIPTION
    A .dbxwidget file is a plain ZIP with manifest.json, optional logic.js and locales/*.json
    at the archive root (see CustomWidgetPackageService). Any installed DeskBox build can import
    it - double-click the file, drag it onto the Widget Workshop, or use "Import package" -
    so templates can be tried without rebuilding the app.

.PARAMETER Id
    Template folder names under src/DeskBox/Assets/CustomWidgets/Templates.
    Defaults to the presets added on this branch. Pass "*" to pack every template.

.PARAMETER OutDir
    Output folder (default: artifacts/widgets, which is git-ignored).

.PARAMETER Commit
    Commit id to put into file names (default: git HEAD). CI passes the PR head commit,
    because pull_request runs check out a temporary merge commit.

.PARAMETER PlainNames
    Name files just "<id>.dbxwidget". By default names carry the app version and git commit
    the packages were built from, e.g. "DeskBox-1.6.2-d3f7263_timer.dbxwidget", so packages
    from different builds never get mixed up.

.EXAMPLE
    pwsh scripts/Pack-CustomWidgetTemplates.ps1
.EXAMPLE
    pwsh scripts/Pack-CustomWidgetTemplates.ps1 -Id timer, link-cleaner -OutDir $HOME\Desktop
#>
[CmdletBinding()]
param(
    [string[]]$Id = @(
        "day-progress", "month-progress", "year-progress", "stopwatch", "timer",
        "quick-settings", "sound-display", "currency-converter", "crypto-watchlist",
        "link-cleaner", "unit-converter"
    ),

    [string]$OutDir = "",

    [string]$Commit = "",

    [switch]$PlainNames
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $PSScriptRoot
$templatesRoot = Join-Path $repoRoot "src/DeskBox/Assets/CustomWidgets/Templates"
if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $repoRoot "artifacts/widgets"
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

$prefix = ""
if (-not $PlainNames) {
    $appVersion = "dev"
    $appxManifest = Join-Path $repoRoot "src/DeskBox/Package.appxmanifest"
    if (Test-Path $appxManifest) {
        # <Identity ...> spans several lines, so match against the whole file.
        $match = [regex]::Match((Get-Content -Raw $appxManifest), '<Identity\b[^>]*?\sVersion="(\d+\.\d+\.\d+)')
        if ($match.Success) { $appVersion = $match.Groups[1].Value }
    }
    $commitTag = "local"
    if (-not [string]::IsNullOrWhiteSpace($Commit)) {
        $trimmed = $Commit.Trim()
        $commitTag = $trimmed.Substring(0, [Math]::Min(7, $trimmed.Length))
    }
    else {
        try {
            $sha = (& git -C $repoRoot rev-parse --short=7 HEAD 2>$null)
            if ($LASTEXITCODE -eq 0 -and $sha) { $commitTag = $sha.Trim() }
            & git -C $repoRoot diff --quiet HEAD -- "src/DeskBox/Assets/CustomWidgets/Templates" 2>$null
            if ($LASTEXITCODE -ne 0) { $commitTag += "-dirty" }
        }
        catch { }
    }
    $prefix = "DeskBox-$appVersion-${commitTag}_"
}

if ($Id.Count -eq 1 -and $Id[0] -eq "*") {
    $Id = Get-ChildItem -Directory $templatesRoot | ForEach-Object Name
}

foreach ($templateId in $Id) {
    $source = Join-Path $templatesRoot $templateId
    $manifest = Join-Path $source "manifest.json"
    if (-not (Test-Path $manifest)) {
        throw "Template '$templateId' not found (expected $manifest)."
    }

    $target = Join-Path $OutDir "$prefix$templateId.dbxwidget"
    if (Test-Path $target) {
        Remove-Item $target -Force
    }

    $zip = [System.IO.Compression.ZipFile]::Open($target, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $files = @(Get-Item $manifest)
        $logic = Join-Path $source "logic.js"
        if (Test-Path $logic) {
            $files += Get-Item $logic
        }
        $localesDir = Join-Path $source "locales"
        if (Test-Path $localesDir) {
            $files += Get-ChildItem -File -Filter "*.json" $localesDir
        }

        foreach ($file in $files) {
            # Always use forward slashes inside the archive, regardless of host OS.
            $entryName = $file.FullName.Substring($source.Length).TrimStart('\', '/').Replace('\', '/')
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        }
    }
    finally {
        $zip.Dispose()
    }

    $sizeKb = [math]::Round((Get-Item $target).Length / 1KB, 1)
    Write-Host ("packed {0,-20} -> {1} ({2} KB)" -f $templateId, $target, $sizeKb)
}
