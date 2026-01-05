
Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param ($path, $width, $height)
    try {
        if (Test-Path $path) {
            $img = [System.Drawing.Image]::FromFile($path)
            $newImg = new-object System.Drawing.Bitmap $width, $height
            $graph = [System.Drawing.Graphics]::FromImage($newImg)
            $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graph.DrawImage($img, 0, 0, $width, $height)
            $img.Dispose()
            $newImg.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
            $newImg.Dispose()
            $graph.Dispose()
            Write-Host "Resized $path to $width x $height"
        } else {
            Write-Warning "File not found: $path"
        }
    } catch {
        Write-Error "Failed to resize $path : $_"
    }
}

Resize-Image -path 'public/swadeshi-screenshot-mobile.png' -width 1080 -height 1920
