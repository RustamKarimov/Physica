$ErrorActionPreference = 'Stop'
$requiredMajor = 10
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
    throw 'Install the .NET 10 SDK from https://dotnet.microsoft.com/download/dotnet/10.0'
}
$version = & dotnet --version
if ([int]($version.Split('.')[0]) -lt $requiredMajor) {
    throw "Physica Studio requires .NET 10 SDK or newer. Found $version."
}
& dotnet restore "$PSScriptRoot\..\PhysicaStudio.slnx" --locked-mode
Write-Host "Physica Studio dependencies are ready (SDK $version)."

