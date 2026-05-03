# Start Nyaya Setu API. If port 8000 is held by a previous Python/uvicorn, stop it first (fixes WinError 10048).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$port = 8000
$listen = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listen) {
    $pidOld = $listen.OwningProcess
    $proc = Get-Process -Id $pidOld -ErrorAction SilentlyContinue
    if ($proc -and $proc.Name -eq "python") {
        Write-Host "Port $port is in use by python.exe (PID $pidOld). Stopping it so uvicorn can bind..."
        Stop-Process -Id $pidOld -Force
        Start-Sleep -Milliseconds 400
    }
    else {
        Write-Host "Port $port is in use by PID $pidOld ($($proc.Name)). Free the port or change it in this script."
        exit 1
    }
}

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Missing .venv. Create it with: py -3 -m venv .venv && .\.venv\Scripts\pip install -r requirements.txt"
    exit 1
}

Write-Host "Starting uvicorn on http://127.0.0.1:$port ..."
& ".\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port $port --reload
