const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const tarGzFile = path.join(distDir, 'mhz-tools-2.0.0.tar.gz');

if (!fs.existsSync(tarGzFile)) {
    console.error("mhz-tools-2.0.0.tar.gz not found in dist/. Please run 'npm run package:linux' first.");
    process.exit(1);
}

const tarGzBuffer = fs.readFileSync(tarGzFile);
const tarGzBase64 = tarGzBuffer.toString('base64');

// 1. Self-Extracting Linux Setup Script (.sh and .run)
const setupScriptHeader = `#!/usr/bin/env bash
# ==============================================================================
# MHZ Tools 2.0 — Linux Self-Extracting Setup Installer
# Developer: Mohammad Hussain Alzaghameem
# Website: https://mohammadzag.github.io/Portofolio/
# ==============================================================================

set -e

GREEN="\\033[1;32m"
BLUE="\\033[1;34m"
YELLOW="\\033[1;33m"
CYAN="\\033[1;36m"
BOLD="\\033[1m"
RESET="\\033[0m"

echo -e "\${GREEN}"
echo "======================================================================"
echo "          MHZ TOOLS 2.0 — LINUX SETUP INSTALLER WIZARD"
echo "======================================================================"
echo -e "\${RESET}"
echo -e "Welcome to the \${BOLD}MHZ Tools 2.0\${RESET} Setup Wizard."
echo "This installer will deploy MHZTools on your Linux operating system."
echo ""

# Determine install location (System-wide if root, user-local if standard user)
if [ "$EUID" -eq 0 ]; then
    INSTALL_DIR="/opt/MHZTools"
    BIN_DIR="/usr/local/bin"
    APP_DIR="/usr/share/applications"
    ICON_DIR="/usr/share/icons/hicolor/512x512/apps"
else
    INSTALL_DIR="$HOME/.local/share/MHZTools"
    BIN_DIR="$HOME/.local/bin"
    APP_DIR="$HOME/.local/share/applications"
    ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
fi

echo -e "Installation Directory: \${CYAN}\$INSTALL_DIR\${RESET}"
echo -e "Binary Symlink:         \${CYAN}\$BIN_DIR/mhztools\${RESET}"
echo -e "Desktop Entry:          \${CYAN}\$APP_DIR/mhztools.desktop\${RESET}"
echo ""

read -p "Do you want to proceed with the installation? (Y/n): " choice
case "$choice" in 
  n|N ) echo "Installation cancelled."; exit 0;;
  * ) echo -e "\${BLUE}[1/5] Preparing installation directory...\${RESET}";;
esac

mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$APP_DIR"
mkdir -p "$ICON_DIR"

echo -e "\${BLUE}[2/5] Extracting application payload...\${RESET}"
TEMP_TAR=$(mktemp /tmp/mhztools_payload.XXXXXX.tar.gz)

# Extract embedded base64 archive
sed -n '/^__PAYLOAD_BELOW__/,$p' "$0" | tail -n +2 | base64 -d > "$TEMP_TAR"

tar -xzf "$TEMP_TAR" -C "$INSTALL_DIR" --strip-components=1
rm -f "$TEMP_TAR"

echo -e "\${BLUE}[3/5] Setting executable permissions...\${RESET}"
chmod -R 755 "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/mhztools"
chmod 4755 "$INSTALL_DIR/chrome-sandbox" 2>/dev/null || true

echo -e "\${BLUE}[4/5] Creating application shortcuts & menu launcher...\${RESET}"
ln -sf "$INSTALL_DIR/mhztools" "$BIN_DIR/mhztools"

# Create application icon if profile_avatar or icon exists
if [ -f "$INSTALL_DIR/resources/app.asar.unpacked/profile_avatar.jpg" ]; then
    cp "$INSTALL_DIR/resources/app.asar.unpacked/profile_avatar.jpg" "$ICON_DIR/mhztools.jpg" 2>/dev/null || true
fi

# Create FreeDesktop .desktop shortcut
cat << 'EOF_DESKTOP' > "$APP_DIR/mhztools.desktop"
[Desktop Entry]
Name=MHZ Tools 2.0
GenericName=Security & Digital Forensics Suite
Comment=Comprehensive client-side security, cryptography, malware analysis, and digital forensics suite
Exec=mhztools %U
Terminal=false
Type=Application
Categories=Utility;Security;Development;
StartupWMClass=mhztools
Keywords=Security;Cryptography;Malware;Forensics;Analysis;
EOF_DESKTOP

chmod 644 "$APP_DIR/mhztools.desktop"

# Also place shortcut on User's Desktop if directory exists
if [ -d "$HOME/Desktop" ]; then
    cp "$APP_DIR/mhztools.desktop" "$HOME/Desktop/MHZTools.desktop" 2>/dev/null || true
    chmod +x "$HOME/Desktop/MHZTools.desktop" 2>/dev/null || true
fi

# Create Uninstaller script
cat << 'EOF_UNINSTALL' > "$INSTALL_DIR/uninstall.sh"
#!/usr/bin/env bash
echo "Uninstalling MHZ Tools 2.0..."
rm -f "$HOME/.local/bin/mhztools" 2>/dev/null || true
rm -f "/usr/local/bin/mhztools" 2>/dev/null || true
rm -f "$HOME/.local/share/applications/mhztools.desktop" 2>/dev/null || true
rm -f "/usr/share/applications/mhztools.desktop" 2>/dev/null || true
rm -f "$HOME/Desktop/MHZTools.desktop" 2>/dev/null || true
rm -rf "$HOME/.local/share/MHZTools" 2>/dev/null || true
rm -rf "/opt/MHZTools" 2>/dev/null || true
echo "MHZ Tools 2.0 has been successfully uninstalled from your system."
EOF_UNINSTALL
chmod +x "$INSTALL_DIR/uninstall.sh"

echo -e "\${GREEN}"
echo "======================================================================"
echo "          MHZ TOOLS 2.0 INSTALLATION COMPLETED SUCCESSFULLY!"
echo "======================================================================"
echo -e "\${RESET}"
echo "You can now launch MHZ Tools 2.0 by:"
echo -e "  1. Typing \${CYAN}mhztools\${RESET} in your terminal."
echo "  2. Selecting 'MHZ Tools 2.0' from your desktop application menu / launcher."
echo ""

read -p "Would you like to launch MHZ Tools 2.0 now? (Y/n): " launch_choice
case "$launch_choice" in 
  n|N ) exit 0;;
  * ) "$INSTALL_DIR/mhztools" & disown;;
esac

exit 0

__PAYLOAD_BELOW__
`;

const setupShContent = setupScriptHeader + tarGzBase64;

// Write both .sh and .run setup installer files
const setupShPath = path.join(distDir, 'MHZTools-2.0-Setup-Linux.sh');
const setupRunPath = path.join(distDir, 'MHZTools-2.0-Setup-Linux.run');

fs.writeFileSync(setupShPath, setupShContent, 'utf8');
fs.writeFileSync(setupRunPath, setupShContent, 'utf8');

console.log(`✓ Generated Linux Setup Installer: ${setupShPath}`);
console.log(`✓ Generated Linux Setup Installer: ${setupRunPath}`);
