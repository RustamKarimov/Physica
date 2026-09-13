# Dependency Ledger

| Dependency | Version policy | Purpose | License | Replacement strategy | Review state |
| --- | --- | --- | --- | --- | --- |
| .NET SDK/runtime | 10.0.400 / .NET 10 LTS | Runtime, tooling, standard libraries | MIT | Upgrade to next supported .NET LTS | Approved |
| Avalonia | 12.1.1 pinned | Cross-platform desktop UI, input, accessibility, XAML | MIT | Maintain adapters; evaluate supported Avalonia upgrade | Approved for shell |
| Avalonia.Desktop | 12.1.1 pinned | Windows/macOS desktop lifetime | MIT | Same as Avalonia | Approved for shell |
| Avalonia.Themes.Fluent | 12.1.1 pinned | Accessible native control theme | MIT | Internal theme controls | Approved for shell |
| Avalonia.Fonts.Inter | 12.1.1 pinned | Cross-platform readable editor typography | SIL OFL 1.1 | Bundle another OFL font | Approved for shell |
| Avalonia.Controls.ColorPicker | 12.1.1 pinned | Compact palette, spectrum, RGB/HSV, and exact colour selection | MIT | Replace with Physica-owned controls built on Avalonia colour primitives | Approved for Phase 2; official matching package, NuGet vulnerability audit clear on 2026-09-13 |
| Microsoft.NET.Test.Sdk | 18.0.1 pinned | Test discovery and execution | MIT | Supported test SDK successor | Approved |
| xUnit | 2.9.3 pinned | Foundation tests | Apache-2.0 | NUnit or MSTest | Approved |

Future dependencies named in the product plan are not approved merely by being listed. Add them only in the phase that uses them, after license and security review.
