#!/bin/zsh
set -eu
SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"
if ! command -v dotnet >/dev/null 2>&1; then
  echo "Physica Studio requires the .NET 10 SDK."
  echo "Run ./scripts/bootstrap.sh, then try again."
  read -r "?Press Return to close..."
  exit 1
fi
if pgrep -f "[P]hysicaStudio.Desktop" >/dev/null 2>&1; then
  echo "Physica Studio is already running."
  echo "Use the existing window, or exit it before starting a new development instance."
  exit 0
fi

echo "Starting Physica Studio in development mode..."
dotnet run --project src/PhysicaStudio.Desktop/PhysicaStudio.Desktop.csproj

