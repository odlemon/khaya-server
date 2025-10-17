# PowerShell script to kill processes using a specific port
param(
    [Parameter(Mandatory=$false)]
    [int]$Port = 3001
)

Write-Host "🔍 Checking for processes using port $Port..." -ForegroundColor Yellow

# Find processes using the specified port
$processes = netstat -ano | Select-String ":$Port " | ForEach-Object {
    $line = $_.Line.Trim()
    $parts = $line -split '\s+'
    if ($parts.Length -ge 5) {
        $pid = $parts[4]
        if ($pid -match '^\d+$') {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    [PSCustomObject]@{
                        PID = $pid
                        ProcessName = $process.ProcessName
                        Port = $Port
                    }
                }
            } catch {
                # Process might have already exited
            }
        }
    }
}

if ($processes) {
    Write-Host "📋 Found the following processes using port $Port:" -ForegroundColor Cyan
    $processes | Format-Table -AutoSize
    
    $confirmation = Read-Host "❓ Do you want to kill these processes? (y/N)"
    
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        foreach ($proc in $processes) {
            try {
                Stop-Process -Id $proc.PID -Force
                Write-Host "✅ Killed process $($proc.ProcessName) (PID: $($proc.PID))" -ForegroundColor Green
            } catch {
                Write-Host "❌ Failed to kill process $($proc.ProcessName) (PID: $($proc.PID)): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Write-Host "🎉 Port $Port should now be available!" -ForegroundColor Green
    } else {
        Write-Host "❌ Operation cancelled." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No processes found using port $Port" -ForegroundColor Green
}

Write-Host "`n💡 Usage examples:" -ForegroundColor Cyan
Write-Host "  .\kill-port.ps1           # Kill processes on port 3001 (default)"
Write-Host "  .\kill-port.ps1 -Port 3000  # Kill processes on port 3000"
Write-Host "  .\kill-port.ps1 8080        # Kill processes on port 8080"




