# typed: false
# frozen_string_literal: true

class Xcopilot < Formula
  desc "Self-growing AI agent for Windows and macOS"
  homepage "https://github.com/tnvmac-web/X-Copilot"
  url "https://github.com/tnvmac-web/X-Copilot/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"

  depends_on "python@3.11"
  depends_on "node@20"
  depends_on "rust" => :build

  def install
    # Install Python backend
    system "pip3", "install", "--prefix", prefix, "-e", "."

    # Install WebApp
    cd "webapp" do
      system "npm", "install"
      system "npm", "run", "build"
    end
    prefix.install "webapp" => "webapp"

    # Install Desktop App (Tauri)
    cd "desktop" do
      system "npm", "install"
      system "npm", "run", "tauri", "build" if which("cargo")
    end
    prefix.install "desktop" => "desktop"

    # Install CLI command
    bin.install_symlink "#{prefix}/bin/xcopilot"
  end

  def caveats
    <<~EOS
      X-Copilot installed!

      To start the CLI:
        xcopilot start

      To start the API server:
        xcopilot serve

      To run the WebApp:
        open #{prefix}/webapp

      To run the Desktop App:
        open #{prefix}/desktop

      Run `xcopilot doctor` to diagnose any issues.
    EOS
  end
end
