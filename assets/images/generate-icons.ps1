Add-Type -AssemblyName System.Drawing

function New-DietIcon([string]$Path, [bool]$WithBackground) {
  $bitmap = [System.Drawing.Bitmap]::new(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  if ($WithBackground) {
    $background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#EAF3EC'))
    $graphics.FillRectangle($background, 0, 0, 1024, 1024)
    $background.Dispose()
  } else {
    $graphics.TranslateTransform(512, 512)
    $graphics.ScaleTransform(0.74, 0.74)
    $graphics.TranslateTransform(-512, -512)
  }

  $plate = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#FFFFFF'))
  $graphics.FillEllipse($plate, 186, 186, 652, 652)
  $plate.Dispose()
  $ring = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#DDE9DF'), 18)
  $graphics.DrawEllipse($ring, 216, 216, 592, 592)
  $ring.Dispose()

  $applePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $applePath.AddBezier(354, 470, 334, 397, 395, 354, 478, 401)
  $applePath.AddBezier(478, 401, 490, 409, 500, 413, 512, 413)
  $applePath.AddBezier(512, 413, 526, 413, 537, 404, 551, 397)
  $applePath.AddBezier(551, 397, 631, 357, 690, 398, 670, 480)
  $applePath.AddBezier(670, 480, 647, 583, 578, 666, 512, 683)
  $applePath.AddBezier(512, 683, 443, 666, 377, 582, 354, 470)
  $apple = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#E87964'))
  $graphics.FillPath($apple, $applePath)
  $apple.Dispose()
  $applePath.Dispose()

  $stem = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#355C43'), 24)
  $stem.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $stem.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($stem, 510, 405, 537, 268)
  $stem.Dispose()
  $leafState = $graphics.Save()
  $graphics.TranslateTransform(530, 295)
  $graphics.RotateTransform(-25)
  $leaf = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#4D9463'))
  $graphics.FillEllipse($leaf, -18, -28, 125, 64)
  $leaf.Dispose()
  $graphics.Restore($leafState)
  $vein = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#DCEBDF'), 7)
  $graphics.DrawLine($vein, 540, 286, 612, 267)
  $vein.Dispose()

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-DietIcon (Join-Path $PSScriptRoot 'icon.png') $true
New-DietIcon (Join-Path $PSScriptRoot 'adaptive-icon.png') $false
