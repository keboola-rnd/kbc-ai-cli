#!/bin/bash
set -euo pipefail

REPO="keboola-rnd/kbc-ai-cli"
INSTALL_DIR="${KBC_APP_INSTALL_DIR:-/usr/local/bin}"
BINARY_NAME="kbc-app"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux*)  OS_NAME="linux" ;;
  Darwin*) OS_NAME="darwin" ;;
  *)       echo "Error: Unsupported OS: $OS"; exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH_NAME="x64" ;;
  aarch64|arm64) ARCH_NAME="arm64" ;;
  *)             echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

ARTIFACT="${BINARY_NAME}-${OS_NAME}-${ARCH_NAME}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ARTIFACT}"

echo "Detected: ${OS_NAME}-${ARCH_NAME}"
echo "Downloading ${ARTIFACT}..."

# Download
if command -v curl &> /dev/null; then
  curl -fsSL "$DOWNLOAD_URL" -o "/tmp/${BINARY_NAME}"
elif command -v wget &> /dev/null; then
  wget -q "$DOWNLOAD_URL" -O "/tmp/${BINARY_NAME}"
else
  echo "Error: curl or wget required"
  exit 1
fi

chmod +x "/tmp/${BINARY_NAME}"

# Install (use sudo if needed)
if [ -w "$INSTALL_DIR" ]; then
  mv "/tmp/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
else
  echo "Installing to ${INSTALL_DIR} (requires sudo)..."
  sudo mv "/tmp/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
fi

echo ""
echo "Installed ${BINARY_NAME} to ${INSTALL_DIR}/${BINARY_NAME}"
echo ""
echo "Get started:"
echo "  ${BINARY_NAME} auth login --stack <STACK_URL> --token <TOKEN>"
echo "  ${BINARY_NAME} app list"
echo "  ${BINARY_NAME} --help"
