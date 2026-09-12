<#>
.SYNOPSIS
    X-Copilot Windows Installer - Production Ready

.DESCRIPTION
    Automatically installs X-Copilot with all dependencies:
    - Python 3.11+ (via winget)
    - Node.js 20+ (via winget)
    - Rust (via rustup)
    - X-Copilot Python package
    - WebApp (Next.js)
    - Desktop App (Tauri)
    - Creates Start Menu shortcuts
    - Sets up global xcopilot command

.EXAMPLE
    PowerShell -ExecutionPolicy Bypass -File install.ps1

.NOTES
    Requires Administrator privileges for system-wide installation.
    For user-only installation, run without admin rights.
#>

param(
    [switch]$UserOnly,
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$SkipRust,
    [switch]$NoShortcuts,
    [string]$InstallPath = "$env:LOCALAPPDATA\X-Copilot",
    [string]$Branch = "dev"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor Yellow
}

function Check-Admin {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-WingetPackage {
    param([string]$PackageId, [string]$Name)
    Write-Log "Installing $Name..."
    try {
        winget install --id $PackageId --accept-source-agreements --accept-package-agreements --silent
        Write-Success "$Name installed"
    } catch {
        Write-Error "Failed to install $Name: $_"
        throw
    }
}

function Install-Python {
    if ($SkipPython) { return }
    Write-Log "Checking Python..."
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $version = python --version 2>&1
        Write-Success "Python already installed: $version"
        return
    }
    Install-WingetPackage "Python.Python.3.11" "Python 3.11"
    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
}

function Install-Node {
    if ($SkipNode) { return }
    Write-Log "Checking Node.js..."
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $version = node --version
        Write-Success "Node.js already installed: $version"
        return
    }
    Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS"
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
}

function Install-Rust {
    if ($SkipRust) { return }
    Write-Log "Checking Rust..."
    if (Get-Command cargo -ErrorAction SilentlyContinue) {
        $version = cargo --version
        Write-Success "Rust already installed: $version"
        return
    }
    Write-Log "Installing Rust via rustup..."
    try {
        $rustupUrl = "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe"
        $rustupPath = "$env:TEMP\rustup-init.exe"
        Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupPath
        & $rustupPath -y --default-toolchain stable --profile minimal
        $env:PATH += ";$env:USERPROFILE\.cargo\bin"
        Write-Success "Rust installed"
    } catch {
        Write-Error "Failed to install Rust: $_"
        throw
    }
}

function Clone-Repository {
    Write-Log "Cloning X-Copilot repository..."
    $repoUrl = "https://github.com/tnvmac-web/X-Copilot.git"
    $targetDir = Join-Path $InstallPath "X-Copilot-main"
    
    if (Test-Path $targetDir) {
        Write-Log "Repository exists, updating..."
        Set-Location $targetDir
        git fetch origin
        git checkout $Branch
        git pull origin $Branch
    } else {
        git clone -b $Branch $repoUrl $targetDir
    }
    Write-Success "Repository ready at $targetDir"
    return $targetDir
}

function Install-PythonPackage {
    param([string]$ProjectDir)
    Write-Log "Installing X-Copilot Python package..."
    Set-Location $ProjectDir
    try {
        python -m pip install --upgrade pip
        python -m pip install -e ".[dev]"
        Write-Success "Python package installed"
    } catch {
        Write-Error "Failed to install Python package: $_"
        throw
    }
}

function Install-WebApp {
    param([string]$ProjectDir)
    Write-Log "Setting up WebApp..."
    $webappDir = Join-Path $ProjectDir "webapp"
    if (-not (Test-Path $webappDir)) {
        Write-Warning "WebApp directory not found, skipping"
        return
    }
    Set-Location $webappDir
    try {
        npm ci
        npm run build
        Write-Success "WebApp built successfully"
    } catch {
        Write-Error "Failed to build WebApp: $_"
        throw
    }
}

function Install-DesktopApp {
    param([string]$ProjectDir)
    Write-Log "Setting up Desktop App..."
    $desktopDir = Join-Path $ProjectDir "desktop"
    if (-not (Test-Path $desktopDir)) {
        Write-Warning "Desktop directory not found, skipping"
        return
    }
    Set-Location $desktopDir
    try {
        npm ci
        # Build Tauri app (requires Rust)
        if (Get-Command cargo -ErrorAction SilentlyContinue) {
            npm run tauri build
            Write-Success "Desktop App built successfully"
        } else {
            Write-Warning "Rust not available, skipping Tauri build"
        }
    } catch {
        Write-Error "Failed to build Desktop App: $_"
        throw
    }
}

function Create-Shortcuts {
    param([string]$ProjectDir)
    if ($NoShortcuts) { return }
    if ($UserOnly) {
        $startMenu = [Environment]::GetFolderPath("StartMenu")
        $programs = Join-Path $startMenu "Programs\X-Copilot"
    } else {
        $programs = Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\X-Copilot"
    }
    
    if (-not (Test-Path $programs)) {
        New-Item -ItemType Directory -Path $programs -Force | Out-Null
    }
    
    # CLI shortcut
    $cliShortcut = Join-Path $programs "X-Copilot CLI.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($cliShortcut)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoExit -Command \"cd '$ProjectDir'; python -m xcopilot.cli.main start --test-mode\""
    $shortcut.WorkingDirectory = $ProjectDir
    $shortcut.IconLocation = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $shortcut.Save()
    
    # WebApp shortcut
    $webShortcut = Join-Path $programs "X-Copilot WebApp.lnk"
    $shortcut = $shell.CreateShortcut($webShortcut)
    $shortcut.TargetPath = "cmd.exe"
    $shortcut.Arguments = "/k cd /d '$ProjectDir\webapp' && npm run dev"
    $shortcut.WorkingDirectory = Join-Path $ProjectDir "webapp"
    $shortcut.Save()
    
    # Desktop App shortcut (if built)
    $tauriExe = Join-Path $ProjectDir "desktop\src-tauri\target\release\bundle\msi\*.exe"
    if (Test-Path (Join-Path $ProjectDir "desktop\src-tauri\target\release\bundle\msi")) {
        $exeFiles = Get-ChildItem (Join-Path $ProjectDir "desktop\src-tauri\target\release\bundle\msi") -Filter "*.exe"
        if ($exeFiles.Count -gt 0) {
            $desktopShortcut = Join-Path $programs "X-Copilot Desktop.lnk"
            $shortcut = $shell.CreateShortcut($desktopShortcut)
            $shortcut.TargetPath = $exeFiles[0].FullName
            $shortcut.WorkingDirectory = (Split-Path $exeFiles[0].FullName)
            $shortcut.Save()
        }
    }
    
    Write-Success "Start Menu shortcuts created at $programs"
}

function Setup-ShellIntegration {
    param([string]$ProjectDir)
    Write-Log "Setting up shell integration..."
    
    # Add to PATH (user scope)
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $xcopilotBin = Join-Path $ProjectDir ".venv\Scripts"
    
    if ($userPath -notlike "*$xcopilotBin*") {
        $newPath = $userPath + ";$xcopilotBin"
        [System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
        Write-Success "Added X-Copilot to user PATH"
    }
    
    # Create xcopilot.bat for global command
    $batPath = Join-Path $xcopilotBin "xcopilot.bat"
    $batContent = "@echo off`ncd /d `"$ProjectDir`"`npython -m xcopilot.cli.main %*"
    Set-Content -Path $batPath -Value $batContent
    Write-Success "Global xcopilot command created"
}

function Verify-Installation {
    param([string]$ProjectDir)
    Write-Log "Verifying installation..."
    Set-Location $ProjectDir
    
    try {
        $result = python -m xcopilot.cli.main doctor 2>&1
        Write-Success "Doctor check passed"
        Write-Host $result
    } catch {
        Write-Warning "Doctor check had issues: $_"
    }
}

# Main installation flow
Write-Host "╔═══════════════════════════════════════════════════════════╗"
Write-Host "║           X-Copilot Windows Installer v0.1.0             ║"
Write-Host "║        Self-growing AI Agent for Windows                 ║"
Write-Host "╚═══════════════════════════════════════════════════════════╝"
Write-Host ""

$isAdmin = Check-Admin
if (-not $isAdmin -and -not $UserOnly) {
    Write-Warning "Not running as Administrator. Using user-only installation."
    $UserOnly = $true
}

try {
    Install-Python
    Install-Node
    Install-Rust
    
    $projectDir = Clone-Repository
    Install-PythonPackage $projectDir
    Install-WebApp $projectDir
    Install-DesktopApp $projectDir
    Create-Shortcuts $projectDir
    Setup-ShellIntegration $projectDir
    Verify-Installation $projectDir
    
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗"
    Write-Host "║              Installation Complete! ✓                    ║"
    Write-Host "╚═══════════════════════════════════════════════════════════╝"
    Write-Host ""
    Write-Host "X-Copilot installed to: $projectDir"
    Write-Host ""
    Write-Host "Available commands:"
    Write-Host "  xcopilot start --test-mode    # Start CLI REPL"
    Write-Host "  xcopilot run webapp           # Run WebApp (Next.js)"
    Write-Host "  xcopilot run desktop          # Run Desktop App (Tauri)"
    Write-Host "  xcopilot run all              # Run both apps"
    Write-Host "  xcopilot doctor               # Run diagnostics"
    Write-Host ""
    Write-Host "Start Menu shortcuts created in: X-Copilot"
    Write-Host ""
    Write-Host "Note: Restart your terminal/PowerShell for PATH changes to take effect."
    
} catch {
    Write-Error "Installation failed: $_"
    exit 1
}