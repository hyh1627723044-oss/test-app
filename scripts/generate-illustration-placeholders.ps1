Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\assets\illustrations'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Canvas($width, $height) {
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function New-Pen($color, $width) {
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($color), $width)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function New-Brush($color) {
  return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($color))
}

function Save-Icon($name, $draw) {
  $canvas = New-Canvas 512 512
  $g = $canvas.Graphics
  $ink = New-Pen '#2b2119' 14
  $thin = New-Pen '#2b2119' 8
  $orange = New-Brush '#c87420'
  $cream = New-Brush '#fff8ef'
  $green = New-Brush '#dfe9d7'
  $peach = New-Brush '#f3d8c6'
  $draw.Invoke($g, $ink, $thin, $orange, $cream, $green, $peach)
  $path = Join-Path $outDir $name
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $canvas.Bitmap.Dispose()
}

Save-Icon 'search-cat.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillEllipse($peach, 68, 250, 360, 118)
  $g.DrawEllipse($thin, 68, 250, 360, 118)
  $g.FillPolygon($orange, @([System.Drawing.Point]::new(160,126), [System.Drawing.Point]::new(206,230), [System.Drawing.Point]::new(112,230)))
  $g.FillPolygon($orange, @([System.Drawing.Point]::new(352,126), [System.Drawing.Point]::new(400,230), [System.Drawing.Point]::new(306,230)))
  $g.FillEllipse($orange, 118, 170, 276, 214)
  $g.DrawPolygon($ink, @([System.Drawing.Point]::new(160,126), [System.Drawing.Point]::new(206,230), [System.Drawing.Point]::new(112,230)))
  $g.DrawPolygon($ink, @([System.Drawing.Point]::new(352,126), [System.Drawing.Point]::new(400,230), [System.Drawing.Point]::new(306,230)))
  $g.DrawEllipse($ink, 118, 170, 276, 214)
  $g.FillEllipse((New-Brush '#2b2119'), 202, 258, 14, 20)
  $g.FillEllipse((New-Brush '#2b2119'), 296, 258, 14, 20)
  $g.FillEllipse((New-Brush '#2b2119'), 250, 306, 16, 12)
  $g.DrawArc($thin, 216, 294, 42, 56, 20, 120)
  $g.DrawArc($thin, 254, 294, 42, 56, 40, 120)
  $g.DrawLine($thin, 154, 310, 218, 302)
  $g.DrawLine($thin, 154, 338, 218, 326)
  $g.DrawLine($thin, 294, 302, 358, 310)
  $g.DrawLine($thin, 294, 326, 358, 338)
}

Save-Icon 'my-recipes-pot.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillRectangle($peach, 96, 286, 320, 108)
  $g.DrawArc($ink, 92, 194, 328, 250, 0, 180)
  $g.DrawLine($ink, 106, 320, 406, 320)
  $g.DrawArc($ink, 94, 226, 324, 180, 0, 180)
  $g.DrawLine($thin, 104, 396, 408, 396)
  $g.DrawArc($thin, 62, 288, 72, 70, 100, 160)
  $g.DrawArc($thin, 378, 288, 72, 70, -80, 160)
  $g.FillEllipse($orange, 224, 164, 64, 42)
  $g.DrawEllipse($thin, 224, 164, 64, 42)
  $g.DrawLine($thin, 188, 122, 170, 72)
  $g.DrawLine($thin, 256, 116, 256, 62)
  $g.DrawLine($thin, 324, 122, 346, 72)
}

Save-Icon 'empty-recipes.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillRectangle($cream, 132, 126, 248, 286)
  $g.DrawRectangle($ink, 132, 126, 248, 286)
  $g.FillRectangle($orange, 184, 90, 144, 70)
  $g.DrawRectangle($thin, 184, 90, 144, 70)
  $g.DrawLine($thin, 178, 222, 334, 210)
  $g.DrawLine($thin, 178, 270, 316, 260)
  $g.DrawLine($thin, 178, 318, 348, 310)
  $g.DrawArc($thin, 218, 354, 80, 46, 20, 140)
}

Save-Icon 'empty-plan.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillRectangle($cream, 92, 116, 328, 300)
  $g.DrawRectangle($ink, 92, 116, 328, 300)
  $g.FillRectangle($green, 92, 116, 328, 74)
  $g.DrawLine($ink, 92, 190, 420, 190)
  $g.DrawLine($thin, 156, 90, 156, 146)
  $g.DrawLine($thin, 356, 90, 356, 146)
  $g.DrawLine($thin, 148, 248, 364, 248)
  $g.DrawLine($thin, 148, 306, 332, 306)
  $g.FillEllipse($orange, 230, 342, 54, 54)
  $g.DrawEllipse($thin, 230, 342, 54, 54)
}

Save-Icon 'upload-recipe.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillRectangle($cream, 112, 130, 288, 250)
  $g.DrawRectangle($ink, 112, 130, 288, 250)
  $g.FillEllipse($peach, 156, 174, 82, 82)
  $g.DrawEllipse($thin, 156, 174, 82, 82)
  $g.DrawPolygon($green, @([System.Drawing.Point]::new(134,342), [System.Drawing.Point]::new(230,250), [System.Drawing.Point]::new(292,318), [System.Drawing.Point]::new(338,276), [System.Drawing.Point]::new(392,342)))
  $g.DrawPolygon($thin, @([System.Drawing.Point]::new(134,342), [System.Drawing.Point]::new(230,250), [System.Drawing.Point]::new(292,318), [System.Drawing.Point]::new(338,276), [System.Drawing.Point]::new(392,342)))
  $g.DrawLine($ink, 256, 84, 256, 156)
  $g.DrawLine($ink, 222, 118, 256, 84)
  $g.DrawLine($ink, 290, 118, 256, 84)
}

Save-Icon 'ai-chef.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillEllipse($cream, 132, 132, 248, 248)
  $g.DrawEllipse($ink, 132, 132, 248, 248)
  $g.FillEllipse($green, 158, 86, 74, 78)
  $g.FillEllipse($green, 216, 68, 96, 96)
  $g.FillEllipse($green, 294, 86, 74, 78)
  $g.DrawEllipse($thin, 158, 86, 74, 78)
  $g.DrawEllipse($thin, 216, 68, 96, 96)
  $g.DrawEllipse($thin, 294, 86, 74, 78)
  $g.FillEllipse((New-Brush '#2b2119'), 210, 242, 14, 20)
  $g.FillEllipse((New-Brush '#2b2119'), 288, 242, 14, 20)
  $g.DrawArc($thin, 224, 268, 64, 46, 20, 140)
  $g.DrawLine($thin, 118, 410, 394, 410)
  $g.DrawLine($thin, 176, 392, 176, 450)
  $g.DrawLine($thin, 336, 392, 336, 450)
}

Save-Icon 'plan-success.png' {
  param($g, $ink, $thin, $orange, $cream, $green, $peach)
  $g.FillEllipse($green, 104, 104, 304, 304)
  $g.DrawEllipse($ink, 104, 104, 304, 304)
  $g.DrawLine($ink, 176, 262, 236, 322)
  $g.DrawLine($ink, 236, 322, 344, 196)
  $g.FillEllipse($orange, 354, 116, 44, 44)
  $g.DrawEllipse($thin, 354, 116, 44, 44)
  $g.DrawLine($thin, 136, 394, 376, 394)
}

Write-Host "Generated illustration placeholders in $outDir"
