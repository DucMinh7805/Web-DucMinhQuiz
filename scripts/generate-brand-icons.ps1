Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'public\ducminh_logo.png'
$outputDir = Join-Path $projectRoot 'public\icons'
[System.IO.Directory]::CreateDirectory($outputDir) | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
  foreach ($size in @(180, 192, 512)) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
        $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
          $rect,
          [System.Drawing.Color]::FromArgb(255, 248, 250, 252),
          [System.Drawing.Color]::FromArgb(255, 224, 242, 254),
          45
        )
        try { $graphics.FillRectangle($gradient, $rect) } finally { $gradient.Dispose() }

        $inset = [int]($size * 0.12)
        $targetWidth = $size - ($inset * 2)
        $targetHeight = [int]($targetWidth * $source.Height / $source.Width)
        $targetY = [int](($size - $targetHeight) / 2)
        $target = New-Object System.Drawing.Rectangle($inset, $targetY, $targetWidth, $targetHeight)
        $graphics.DrawImage($source, $target)
      } finally {
        $graphics.Dispose()
      }

      $name = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
      $bitmap.Save((Join-Path $outputDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  }
} finally {
  $source.Dispose()
}
