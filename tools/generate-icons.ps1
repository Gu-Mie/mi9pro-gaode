$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOut = Join-Path $taskRoot 'wearable\src\common'
New-Item -ItemType Directory -Force -Path $taskOut | Out-Null
$taskMint = [Drawing.ColorTranslator]::FromHtml('#80f5be')
foreach ($taskName in @('left','right','straight','slight_left','slight_right','sharp_left','sharp_right','uturn','roundabout','arrive','unknown','icon')) {
    $taskBitmap = [Drawing.Bitmap]::new(192,192)
    $taskGraphics = [Drawing.Graphics]::FromImage($taskBitmap)
    $taskGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $taskPen = [Drawing.Pen]::new($taskMint,16)
    $taskPen.StartCap = [Drawing.Drawing2D.LineCap]::Round
    $taskPen.EndCap = [Drawing.Drawing2D.LineCap]::Round
    $taskPen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
    $taskBrush = [Drawing.SolidBrush]::new($taskMint)
    if ($taskName -eq 'icon') {
        $taskGraphics.Clear([Drawing.ColorTranslator]::FromHtml('#0c141d'))
        $taskGraphics.FillPolygon($taskBrush, [Drawing.PointF[]]@([Drawing.PointF]::new(96,20),[Drawing.PointF]::new(160,166),[Drawing.PointF]::new(96,132),[Drawing.PointF]::new(32,166)))
    } elseif ($taskName -eq 'unknown') {
        $taskGraphics.DrawEllipse($taskPen,32,32,128,128)
        $taskGraphics.DrawLine($taskPen,96,90,96,130)
        $taskGraphics.FillEllipse($taskBrush,88,56,16,16)
    } elseif ($taskName -eq 'arrive') {
        $taskGraphics.DrawLine($taskPen,48,160,48,32)
        $taskGraphics.FillPolygon($taskBrush, [Drawing.PointF[]]@([Drawing.PointF]::new(48,32),[Drawing.PointF]::new(152,32),[Drawing.PointF]::new(132,96),[Drawing.PointF]::new(48,96)))
    } elseif ($taskName -eq 'roundabout') {
        $taskGraphics.DrawArc($taskPen,42,42,108,108,20,300)
        $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(112,28),[Drawing.PointF]::new(140,42),[Drawing.PointF]::new(130,74)))
    } else {
        if ($taskName -eq 'uturn') {
            $taskGraphics.DrawArc($taskPen,44,32,104,96,180,180)
            $taskGraphics.DrawLine($taskPen,148,80,148,156)
            $taskGraphics.DrawLine($taskPen,44,80,44,132)
            $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(20,110),[Drawing.PointF]::new(44,140),[Drawing.PointF]::new(68,110)))
        } else {
            if ($taskName -match 'left') { $taskGraphics.TranslateTransform(192,0); $taskGraphics.ScaleTransform(-1,1) }
            if ($taskName -match '^slight') {
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(76,156),[Drawing.PointF]::new(76,102),[Drawing.PointF]::new(140,38)))
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(96,38),[Drawing.PointF]::new(140,38),[Drawing.PointF]::new(140,82)))
            } elseif ($taskName -match '^sharp') {
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(56,156),[Drawing.PointF]::new(56,42),[Drawing.PointF]::new(140,120)))
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(140,76),[Drawing.PointF]::new(140,120),[Drawing.PointF]::new(96,120)))
            } elseif ($taskName -eq 'straight') {
                $taskGraphics.DrawLine($taskPen,96,156,96,36)
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(56,76),[Drawing.PointF]::new(96,36),[Drawing.PointF]::new(136,76)))
            } else {
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(56,156),[Drawing.PointF]::new(56,68),[Drawing.PointF]::new(148,68)))
                $taskGraphics.DrawLines($taskPen,[Drawing.PointF[]]@([Drawing.PointF]::new(112,32),[Drawing.PointF]::new(148,68),[Drawing.PointF]::new(112,104)))
            }
        }
    }
    $taskBitmap.Save((Join-Path $taskOut "$taskName.png"),[Drawing.Imaging.ImageFormat]::Png)
    $taskBrush.Dispose(); $taskPen.Dispose(); $taskGraphics.Dispose(); $taskBitmap.Dispose()
}
Write-Output 'Generated navigation icons from drawing primitives.'

