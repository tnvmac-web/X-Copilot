#!/bin/bash
# X-Copilot Linux/macOS Installer

set -euo pipefail

INSTALL_PATH="${INSTALL_PATH:-$HOME/.local/share/xcopilot}"
BRANCH="${BRANCH:-dev}"
REPO_URL="https://github.com/tnvmac-web/X-Copilot.git"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_cmd() { command -v "$1" >/dev/null 2>&1; }

install_python() {
    if check_cmd python3; then
        log "Python already installed: $(python3 --version)"
        return
    fi
    log "Installing Python 3.11..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y python3.11 python3.11-venv python3.11-dev
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install python@3.11
    fi
}

install_node() {
    if check_cmd node; then
        log "Node.js already installed: $(node --version)"
        return
    fi
    log "Installing Node.js LTS..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install node@20
    fi
}

install_rust() {
    if check_cmd cargo; then
        log "Rust already installed: $(cargo --version)"
        return
    fi
    log "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
    source "$HOME/.cargo/env"
}

clone_repo() {
    log "Cloning X-Copilot repository..."
    if [[ -d "$INSTALL_PATH" ]]; then
        log "Repository exists, updating..."
        cd "$INSTALL_PATH"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_PATH"
    fi
}

install_python_pkg() {
    log "Installing X-Copilot Python package..."
    cd "$INSTALL_PATH"
    python3 -m pip install --upgrade pip
    python3 -m pip install -e ".[dev]"
}

install_webapp() {
    log "Setting up WebApp..."
    cd "$INSTALL_PATH/webapp"
    npm ci
    npm run build
}

install_desktop() {
    log "Setting up Desktop App..."
    cd "$INSTALL_PATH/desktop"
    npm ci
    if check_cmd cargo; then
        npm run tauri build
    else
        warn "Rust not available, skipping Tauri build"
    fi
}

create_desktop_entries() {
    log "Creating desktop entries..."
    local apps_dir="$HOME/.local/share/applications"
    mkdir -p "$apps_dir"
    
    cat > "$apps_dir/xcopilot-cli.desktop" <<EOF
[Desktop Entry]
Name=X-Copilot CLI
Comment=Self-growing AI agent terminal
Exec=bash -c "cd '$INSTALL_PATH' && python -m xcopilot.cli.main start --test-mode"
Terminal=true
Type=Application
Categories=Development;
EOF

    cat > "$apps_dir/xcopilot-webapp.desktop" <<EOF
[Desktop Entry]
Name=X-Copilot WebApp
Comment=X-Copilot Web Interface
Exec=bash -c "cd '$INSTALL_PATH/webapp' && npm run dev"
Terminal=true
Type=Application
Categories=Development;Network;
EOF
}

verify_install() {
    log "Verifying installation..."
    cd "$INSTALL_PATH"
    python -m xcopilot.cli.main doctor
}

main() {
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           X-Copilot Linux/macOS Installer                ║"
    echo "║        Self-growing AI Agent                             ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    install_python
    install_node
    install_rust
    clone_repo
    install_python_pkg
    install_webapp
    install_desktop
    create_desktop_entries
    verify_install
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║              Installation Complete! ✓                    ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "X-Copilot installed to: $INSTALL_PATH"
    echo ""
    echo "Available commands:"
    echo "  xcopilot start --test-mode    # Start CLI REPL"
    echo "  xcopilot run webapp           # Run WebApp (Next.js)"
    echo "  xcopilot run desktop          # Run Desktop App (Tauri)"
    echo "  xcopilot run all              # Run both apps"
    echo "  xcopilot doctor               # Run diagnostics"
    echo ""
    echo "Note: Restart your terminal for PATH changes to take effect."
}

main "$@"