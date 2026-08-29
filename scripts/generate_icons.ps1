Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\Ketan\Desktop\Settle (Splitwise Pro )\assets\settle_raw_logo.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Create-App-Icon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark background #0A0D14
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 13, 20))
    $g.FillRectangle($brush, 0, 0, $size, $size)

    # Invert/White Logo
    # Draw inverted color matrix
    $cm = New-Object System.Drawing.Imaging.ColorMatrix
    $cm.Matrix00 = -1.0
    $cm.Matrix11 = -1.0
    $cm.Matrix22 = -1.0
    $cm.Matrix33 = 1.0
    $cm.Matrix40 = 1.0
    $cm.Matrix41 = 1.0
    $cm.Matrix42 = 1.0
    $cm.Matrix44 = 1.0

    $ia = New-Object System.Drawing.Imaging.ImageAttributes
    $ia.SetColorMatrix($cm)

    # Center Logo
    $targetWidth = [int]($size * 0.70)
    $targetHeight = [int]($src.Height * $targetWidth / $src.Width)
    $x = [int](($size - $targetWidth) / 2)
    $y = [int](($size - $targetHeight) / 2)
    $destRect = New-Object System.Drawing.Rectangle($x, $y, $targetWidth, $targetHeight)

    $g.DrawImage($src, $destRect, 0, 0, $src.Width, $src.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Create-App-Icon 512 "c:\Users\Ketan\Desktop\Settle (Splitwise Pro )\public\icon-512.png"
Create-App-Icon 192 "c:\Users\Ketan\Desktop\Settle (Splitwise Pro )\public\icon-192.png"
Create-App-Icon 512 "c:\Users\Ketan\Desktop\Settle (Splitwise Pro )\assets\icon.png"
Create-App-Icon 512 "c:\Users\Ketan\Desktop\Settle (Splitwise Pro )\assets\android-icon-foreground.png"
Create-App-Icon 512 "c:\Users\Ketan\Desktop\Settle (Splitwise Pro )\assets\splash-icon.png"

$src.Dispose()
Write-Host "✅ Icons successfully generated from official Settle logo!"
