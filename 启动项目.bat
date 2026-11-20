@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0" || (
  echo Cannot open the project folder.
  pause
  exit /b 1
)
set "JICUI_LAUNCHER_FILE=%~f0"
set "JICUI_LAUNCHER_CI="
if /i "%~1"=="--ci" set "JICUI_LAUNCHER_CI=1"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; try { $text=[IO.File]::ReadAllText($env:JICUI_LAUNCHER_FILE); $marker=':__JICUI_'+'POWERSHELL__'; $start=$text.IndexOf($marker,[StringComparison]::Ordinal); if($start -lt 0){throw 'Launcher payload is missing.'}; & ([scriptblock]::Create($text.Substring($start+$marker.Length))); exit 0 } catch { Write-Host ''; Write-Host ('[Error] ' + $_.Exception.Message) -ForegroundColor Red; exit 1 }"
set "JICUI_LAUNCHER_RESULT=%ERRORLEVEL%"
popd
if not "%JICUI_LAUNCHER_RESULT%"=="0" if not defined JICUI_LAUNCHER_CI pause
exit /b %JICUI_LAUNCHER_RESULT%

:__JICUI_POWERSHELL__
$project = (Get-Location).Path
$downloadSite = 'https://nodejs.org/dist'
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'JicuiJasmine\Node'
$required = @('package.json', 'package-lock.json', '.env.example', 'vite.config.ts', 'server\index.ts')
foreach ($name in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $project $name) -PathType Leaf)) {
        throw "Missing $name. Put this launcher in the Jicui Jasmine project folder and keep the complete project together."
    }
}

function Get-CompatibleNode([string]$executable) {
    if (-not $executable -or -not (Test-Path -LiteralPath $executable -PathType Leaf)) { return }
    $directory = Split-Path -Parent $executable
    $npm = Join-Path $directory 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path -LiteralPath $npm -PathType Leaf)) { return }
    try {
        $details = & $executable --disable-warning=ExperimentalWarning -p "require('node:sqlite'); process.versions.node + ' ' + process.arch" 2>$null
        if ($LASTEXITCODE -ne 0 -or "$details" -notmatch '^24\.\d+\.\d+ (x64|arm64)$') { return }
        $version, $architecture = "$details".Split(' ')
        $npmVersion = & $executable $npm --version 2>$null
        if ($LASTEXITCODE -ne 0 -or "$npmVersion" -notmatch '^\d+\.\d+\.\d+') { return }
        [pscustomobject]@{ Node = $executable; Npm = $npm; Directory = $directory; Version = $version; Architecture = $architecture }
    } catch {
        return
    }
}

function Get-WindowsArchitecture {
    try {
        $native = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
        if ($native -in @('x64', 'arm64')) { return $native }
    } catch {
        # Older .NET installations can use the native Windows architecture environment variable.
    }
    $machine = $env:PROCESSOR_ARCHITEW6432
    if (-not $machine) { $machine = $env:PROCESSOR_ARCHITECTURE }
    switch ($machine) {
        'AMD64' { return 'x64' }
        'ARM64' { return 'arm64' }
        default { throw 'This project requires 64-bit Windows 10/11 on x64 or ARM64. Node.js 24 has no 32-bit Windows build.' }
    }
}

function Get-PortableNode([string]$architecture) {
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
    $cached = Get-ChildItem -LiteralPath $runtimeRoot -Directory -Filter "node-v24.*-win-$architecture*" |
        Sort-Object LastWriteTimeUtc -Descending
    foreach ($directory in $cached) {
        $runtime = Get-CompatibleNode (Join-Path $directory.FullName 'node.exe')
        if ($runtime) { return $runtime }
    }

    Write-Host "[Setup] Downloading official Node.js 24 for Windows $architecture ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    $checksums = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 45 -Uri "$downloadSite/latest-v24.x/SHASUMS256.txt").Content
    $pattern = '(?m)^(?<sum>[0-9a-fA-F]{64})[ \t]+\*?(?<name>node-(?<version>v24\.\d+\.\d+)-win-' + $architecture + ')\.zip[ \t]*\r?$'
    $entry = [regex]::Match($checksums, $pattern)
    if (-not $entry.Success) { throw 'The official Node.js checksum list did not include the required Windows ZIP. Retry on a network that can reach nodejs.org.' }

    $name = $entry.Groups['name'].Value
    $version = $entry.Groups['version'].Value
    $work = Join-Path $runtimeRoot ('d-' + [guid]::NewGuid().ToString('N').Substring(0, 10))
    $zip = Join-Path $work "$name.zip"
    $oldProgress = $ProgressPreference
    try {
        New-Item -ItemType Directory -Path $work | Out-Null
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 240 -Uri "$downloadSite/$version/$name.zip" -OutFile $zip
        if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ine $entry.Groups['sum'].Value) {
            throw 'Node.js download failed the SHA-256 check. The downloaded files were discarded. Run the launcher again.'
        }
        $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
        if (Test-Path -LiteralPath $tar -PathType Leaf) {
            & $tar -xf $zip -C $work
            if ($LASTEXITCODE -ne 0) { throw 'Could not extract the official Node.js ZIP. Check disk space and folder permissions.' }
        } else {
            Expand-Archive -LiteralPath $zip -DestinationPath $work
        }
        $target = Join-Path $runtimeRoot $name
        if (Test-Path -LiteralPath $target) {
            $runtime = Get-CompatibleNode (Join-Path $target 'node.exe')
            if ($runtime) { return $runtime }
            $target = Join-Path $runtimeRoot ($name + '-' + [guid]::NewGuid().ToString('N'))
        }
        Move-Item -LiteralPath (Join-Path $work $name) -Destination $target
        $runtime = Get-CompatibleNode (Join-Path $target 'node.exe')
        if (-not $runtime) { throw 'The portable Node.js installation could not start. Check your Windows version and application restrictions.' }
        return $runtime
    } finally {
        $ProgressPreference = $oldProgress
        if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

function Test-Dependencies($runtime) {
    if (-not (Test-Path -LiteralPath 'node_modules\.bin\vite.cmd' -PathType Leaf)) { return $false }
    $probe = "import 'vite'; import '@tailwindcss/oxide'; import { transformSync } from 'esbuild'; transformSync('const ready = true');"
    try {
        & $runtime.Node --input-type=module -e $probe 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-FreePort([int]$port) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    try {
        $listener.ExclusiveAddressUse = $true
        $listener.Start()
        return ([Net.IPEndPoint]$listener.LocalEndpoint).Port
    } catch [Net.Sockets.SocketException] {
        if ($port -eq 0) { throw }
        return $null
    } finally {
        $listener.Stop()
    }
}

$digest = [Security.Cryptography.SHA256]::Create()
try {
    $projectBytes = [Text.Encoding]::UTF8.GetBytes($project.ToUpperInvariant())
    $projectKey = ([BitConverter]::ToString($digest.ComputeHash($projectBytes))).Replace('-', '')
} finally {
    $digest.Dispose()
}
$lock = [Threading.Mutex]::new($false, "Local\JicuiJasmine-$projectKey")
$ownsLock = $false
$browserJob = $null
try {
    try { $ownsLock = $lock.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $ownsLock = $true }
    if (-not $ownsLock) { throw 'A launcher is already starting or running this project. Check the other console window.' }

    Write-Host '=== Jicui Jasmine Project Launcher ==='
    $systemNode = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $runtime = Get-CompatibleNode $systemNode.Source
    if (-not $runtime) {
        try { $runtime = Get-PortableNode (Get-WindowsArchitecture) }
        catch { throw "Node.js setup failed: $($_.Exception.Message) Check HTTPS access to nodejs.org or install Node.js 24 from https://nodejs.org/ and retry." }
    }
    $env:Path = $runtime.Directory + ';' + $env:Path
    Write-Host "[Check] Node.js $($runtime.Version) ($($runtime.Architecture)) and npm are ready."

    $envPath = Join-Path $project '.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        [IO.File]::Copy((Join-Path $project '.env.example'), $envPath, $false)
        Write-Host '[Setup] Created .env from the project template. Add your own DeepSeek key to use live AI.'
    }

    $stamp = Join-Path $project 'node_modules\.jicui-windows-lock'
    $fingerprint = (Get-FileHash -LiteralPath 'package-lock.json' -Algorithm SHA256).Hash + ':' + $runtime.Version + ':' + $runtime.Architecture
    $saved = if (Test-Path -LiteralPath $stamp -PathType Leaf) { (Get-Content -LiteralPath $stamp -Raw).Trim() }
    if ($saved -ne $fingerprint -or -not (Test-Dependencies $runtime)) {
        Write-Host '[Setup] Installing the locked project dependencies. The first run needs internet access.'
        & $runtime.Node $runtime.Npm ci --include=dev --include=optional --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check npm registry access, free disk space, and the errors above, then retry.' }
        if (-not (Test-Dependencies $runtime)) { throw 'The installed build tools could not start. See the output above or check Windows application restrictions.' }
        [IO.File]::WriteAllText($stamp, $fingerprint)
    } else {
        Write-Host '[Check] Locked project dependencies are ready.'
    }

    Write-Host '[Build] Building the current project ...'
    & $runtime.Node $runtime.Npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. See the TypeScript or Vite output above.' }

    $readPort = "const fs=require('node:fs');const dotenv=require('dotenv');const file=dotenv.parse(fs.readFileSync('.env'));process.stdout.write(process.env.PORT||file.PORT||'3001');"
    $portSetting = & $runtime.Node -e $readPort
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the project port from .env.' }
    $preferred = 0
    if (-not [int]::TryParse("$portSetting", [ref]$preferred) -or $preferred -lt 0 -or $preferred -gt 65535) {
        throw 'PORT must be a number from 0 to 65535. Check .env and the current shell configuration.'
    }
    $port = Get-FreePort $preferred
    if ($null -eq $port) {
        $port = Get-FreePort 0
        Write-Host "[Check] Port $preferred is in use. Using free local port $port for this run."
    }
    $env:HOST = '127.0.0.1'
    $env:PORT = "$port"
    $url = "http://127.0.0.1:$port"
    Write-Host "[Start] $url"
    Write-Host 'Keep this window open. Press Ctrl+C to stop the project.'
    if (-not $env:JICUI_LAUNCHER_CI) {
        try {
            $browserJob = Start-Job -ArgumentList $url -ScriptBlock {
                param([string]$address)
                for ($attempt = 0; $attempt -lt 35; $attempt++) {
                    try {
                        $health = Invoke-RestMethod -Uri "$address/api/health" -TimeoutSec 1 -ErrorAction Stop
                        if ($health.status -eq 'ok' -and $health.provider -eq 'DeepSeek') {
                            Start-Process $address
                            break
                        }
                    } catch { }
                    Start-Sleep -Milliseconds 300
                }
            }
        } catch {
            Write-Host "[Start] Open $url manually in your browser."
        }
    }
    & $runtime.Node (Join-Path $project 'dist\server\index.js')
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1073741510 -and $LASTEXITCODE -ne 130) {
        throw 'The application stopped with an error. See the server output above.'
    }
} finally {
    if ($browserJob) {
        Stop-Job $browserJob -ErrorAction SilentlyContinue
        Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
    }
    if ($ownsLock) { $lock.ReleaseMutex() }
    $lock.Dispose()
}
