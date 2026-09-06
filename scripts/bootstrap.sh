#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v dotnet >/dev/null 2>&1; then
  echo "Install the .NET 10 SDK from https://dotnet.microsoft.com/download/dotnet/10.0" >&2
  exit 1
fi
sdk_version="$(dotnet --version)"
if [[ "${sdk_version%%.*}" -lt 10 ]]; then
  echo "Physica Studio requires .NET 10 SDK or newer. Found $sdk_version." >&2
  exit 1
fi
dotnet restore "$repo_dir/PhysicaStudio.slnx" --locked-mode
echo "Physica Studio dependencies are ready (SDK $sdk_version)."

