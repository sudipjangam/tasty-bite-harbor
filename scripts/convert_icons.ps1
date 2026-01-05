
Add-Type -AssemblyName System.Drawing

function Convert-ToPng {
    param ($path, $outPath)
    try {
        if (Test-Path $path) {
            $img = [System.Drawing.Image]::FromFile($path)
            $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $img.Dispose()
            Write-Host "Converted $path to $outPath"
        } else {
            Write-Warning "File not found: $path"
        }
    } catch {
        Write-Error "Failed to convert $path : $_"
    }
}

# Convert icons to new filenames to bust cache
Convert-ToPng -path 'public/icons/icon-192x192.png' -outPath 'public/icons/swadeshi-icon-192.png'
Convert-ToPng -path 'public/icons/icon-512x512.png' -outPath 'public/icons/swadeshi-icon-512.png'
Convert-ToPng -path 'public/icons/icon-maskable-192x192.png' -outPath 'public/icons/swadeshi-icon-maskable-192.png'
Convert-ToPng -path 'public/icons/icon-maskable-512x512.png' -outPath 'public/icons/swadeshi-icon-maskable-512.png'

# Convert screenshots
Convert-ToPng -path 'public/screenshot-mobile.png' -outPath 'public/swadeshi-screenshot-mobile.png'
Convert-ToPng -path 'public/og-image.png' -outPath 'public/swadeshi-screenshot-desktop.png'
