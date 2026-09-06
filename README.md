# Physica Studio

Physica Studio is a cross-platform, physics-first presentation authoring system for teachers. It combines professional slide design, a multi-track animation timeline, deterministic physical models, scientific representations, and a clean learner-facing presentation mode.

The repository is being rebuilt from first principles. Phase 1 intentionally delivers the complete professional studio shell before activating authoring or physics behavior. Planned controls remain visible with honest readiness badges and explanatory tooltips.

## Run on Windows

Double-click `Launch Physica.bat`, or run:

```powershell
./scripts/bootstrap.ps1
dotnet run --project src/PhysicaStudio.Desktop/PhysicaStudio.Desktop.csproj
```

## Run on macOS

```bash
chmod +x "Launch Physica.command" scripts/bootstrap.sh
./Launch\ Physica.command
```

See `docs/CURRENT_STATE.md` before continuing development.

