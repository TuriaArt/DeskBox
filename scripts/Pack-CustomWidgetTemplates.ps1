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

    [string]$OutDir = ""
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

if ($Id.Count -eq 1 -and $Id[0] -eq "*") {
    $Id = Get-ChildItem -Directory $templatesRoot | ForEach-Object Name
}

foreach ($templateId in $Id) {
    $source = Join-Path $templatesRoot $templateId
    $manifest = Join-Path $source "manifest.json"
    if (-not (Test-Path $manifest)) {
        throw "Template '$templateId' not found (expected $manifest)."
    }

    $target = Join-Path $OutDir "$templateId.dbxwidget"
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
