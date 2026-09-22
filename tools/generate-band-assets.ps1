$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'wearable\src\common'
$maneuvers = @('left','right','straight','slight_left','slight_right','sharp_left','sharp_right','uturn','roundabout','arrive','unknown')
foreach ($weight in 4..10) {
    $assetDirectory = Join-Path $assetRoot "arrows\$weight"
    New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null
    foreach ($maneuver in $maneuvers) {
        $bitmap = [Drawing.Bitmap]::new(160,160)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.ScaleTransform(2,2)
        $pen = [Drawing.Pen]::new([Drawing.Color]::White,$weight)
        $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
        $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
        $brush = [Drawing.SolidBrush]::new([Drawing.Color]::White)
        if ($maneuver -eq 'unknown') {
            $graphics.DrawEllipse($pen,12,12,56,56)
            $graphics.DrawLine($pen,40,37,40,55)
            $graphics.FillEllipse($brush,37,23,6,6)
        } elseif ($maneuver -eq 'arrive') {
            $graphics.DrawLine($pen,20,70,20,10)
            $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(20,12),[Drawing.PointF]::new(63,12),[Drawing.PointF]::new(55,38),[Drawing.PointF]::new(20,38)))
        } elseif ($maneuver -eq 'roundabout') {
            $graphics.DrawArc($pen,15,15,50,50,20,300)
            $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(46,8),[Drawing.PointF]::new(60,15),[Drawing.PointF]::new(55,30)))
        } elseif ($maneuver -eq 'uturn') {
            $graphics.DrawArc($pen,19,10,42,38,180,180)
            $graphics.DrawLine($pen,61,29,61,70)
            $graphics.DrawLine($pen,19,29,19,57)
            $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(7,47),[Drawing.PointF]::new(19,59),[Drawing.PointF]::new(31,47)))
        } else {
            if ($maneuver -match 'left') { $graphics.TranslateTransform(80,0); $graphics.ScaleTransform(-1,1) }
            if ($maneuver -eq 'straight') {
                $graphics.DrawLine($pen,40,72,40,8)
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(20,28),[Drawing.PointF]::new(40,8),[Drawing.PointF]::new(60,28)))
            } elseif ($maneuver -match '^slight') {
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(24,72),[Drawing.PointF]::new(24,43),[Drawing.PointF]::new(62,10)))
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(39,10),[Drawing.PointF]::new(62,10),[Drawing.PointF]::new(62,33)))
            } elseif ($maneuver -match '^sharp') {
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(21,72),[Drawing.PointF]::new(21,13),[Drawing.PointF]::new(64,53)))
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(64,31),[Drawing.PointF]::new(64,53),[Drawing.PointF]::new(42,53)))
            } else {
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(22,72),[Drawing.PointF]::new(22,29),[Drawing.PointF]::new(68,29)))
                $graphics.DrawLines($pen,[Drawing.PointF[]]@([Drawing.PointF]::new(49,10),[Drawing.PointF]::new(68,29),[Drawing.PointF]::new(49,48)))
            }
        }
        $bitmap.Save((Join-Path $assetDirectory "$maneuver.png"),[Drawing.Imaging.ImageFormat]::Png)
        $brush.Dispose(); $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
    }
}
$bitmap = [Drawing.Bitmap]::new(112,112)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$pen = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#88958c'),6)
$pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
$points = for ($index = 0; $index -lt 32; $index++) {
    $radius = if (($index % 4) -in @(0,3)) { 35 } else { 44 }
    $angle = ($index * 360 / 32) * [Math]::PI / 180
    [Drawing.PointF]::new([float](56+$radius*[Math]::Cos($angle)),[float](56+$radius*[Math]::Sin($angle)))
}
$graphics.DrawPolygon($pen,[Drawing.PointF[]]$points)
$graphics.DrawEllipse($pen,40,40,32,32)
$bitmap.Save((Join-Path $assetRoot 'settings.png'),[Drawing.Imaging.ImageFormat]::Png)
$pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
Write-Output 'Generated 77 white maneuver assets and the settings icon.'
