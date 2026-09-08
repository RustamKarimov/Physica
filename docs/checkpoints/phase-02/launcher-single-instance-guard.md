# Development Launcher Single-Instance Guard

## Defect

Starting `Launch Physica.bat` while Physica Studio was already open allowed a second `dotnet run` build to begin. The running application held the desktop executable, so the second build failed with a file-in-use error.

## Correction

- `Launch Physica.bat` detects an existing `PhysicaStudio.Desktop.exe` process before invoking `dotnet run`.
- `Launch Physica.command` applies the equivalent process check on macOS.
- A repeated launch reports that Physica Studio is already running and returns success without compiling or starting another instance.

## Acceptance scenario

1. Start Physica Studio through the platform launcher.
2. Keep the application open.
3. Invoke the same launcher again.
4. Confirm the second launcher reports `Physica Studio is already running.`
5. Confirm the Physica process count remains one and no file-lock/build error appears.

Windows evidence is recorded by the verification command output in the implementing session. macOS execution remains Not run until a macOS host is available.
