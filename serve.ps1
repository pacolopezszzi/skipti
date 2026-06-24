$root = "C:\Users\Francisco\Desktop\Claude Inicio"
$port = 3456
$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript'
    '.css'  = 'text/css'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

# Detecta la IP de la red local (excluye loopback y link-local)
$lanIP = try {
    (Get-NetIPAddress -AddressFamily IPv4 |
     Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
     Select-Object -First 1).IPAddress
} catch { $null }

# Intenta escuchar en TODAS las interfaces (requiere Administrador).
# Si falla, cae de vuelta a solo localhost.
$http = [System.Net.HttpListener]::new()
$networkMode = $false
try {
    $http.Prefixes.Add("http://+:$port/")
    $http.Start()
    $networkMode = $true
} catch {
    $http = [System.Net.HttpListener]::new()
    $http.Prefixes.Add("http://localhost:$port/")
    $http.Start()
}

Write-Host ""
Write-Host "============================================"
Write-Host "  CoinTrack - Servidor activo en puerto $port"
Write-Host "============================================"
Write-Host ""
Write-Host "  Admin (esta PC):"
Write-Host "    http://localhost:$port/CoinTrack.html"
Write-Host ""
if ($networkMode -and $lanIP) {
    Write-Host "  App Cliente (celular - misma red WiFi):"
    Write-Host "    http://${lanIP}:$port/CoinTrackCliente.html"
    Write-Host ""
} else {
    Write-Host "  App Cliente (esta PC):"
    Write-Host "    http://localhost:$port/CoinTrackCliente.html"
    Write-Host ""
    Write-Host "  PARA ABRIR EN CELULAR: ejecuta PowerShell"
    Write-Host "  como Administrador y vuelve a correr este"
    Write-Host "  script. Luego usa esta URL en el celular:"
    if ($lanIP) {
        Write-Host "    http://${lanIP}:$port/CoinTrackCliente.html"
    }
    Write-Host ""
}
Write-Host "  Ctrl+C para detener."
Write-Host "============================================"
Write-Host ""

while ($http.IsListening) {
    $ctx = $http.GetContext()
    try {
        $local = $ctx.Request.Url.LocalPath
        if ($local -eq '/' -or $local -eq '') { $local = '/CoinTrack.html' }
        $file = Join-Path $root ($local.TrimStart('/').Replace('/', '\'))

        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file)
            $ct  = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
            $data = [System.IO.File]::ReadAllBytes($file)
            $ctx.Response.StatusCode     = 200
            $ctx.Response.ContentType    = $ct
            $ctx.Response.SendChunked    = $true
            $ctx.Response.OutputStream.Write($data, 0, $data.Length)
            Write-Host "200 $local"
        } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $ctx.Response.StatusCode  = 404
            $ctx.Response.SendChunked = $true
            $ctx.Response.OutputStream.Write($body, 0, $body.Length)
            Write-Host "404 $local"
        }
    } catch {
        Write-Host "ERR: $_"
    } finally {
        try { $ctx.Response.OutputStream.Close() } catch {}
        try { $ctx.Response.Close() } catch {}
    }
}
