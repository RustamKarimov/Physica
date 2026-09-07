using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using PhysicaStudio.Desktop.Views;

namespace PhysicaStudio.Desktop;

public sealed partial class App : Application
{
    public override void Initialize() => AvaloniaXamlLoader.Load(this);

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var preview = Environment.GetEnvironmentVariable("PHYSICA_PREVIEW_MODE")?.Trim().ToLowerInvariant();
            desktop.MainWindow = preview switch
            {
                "presenter-dark" => new PresenterPreviewWindow(PresenterPreviewMode.Dark),
                "presenter-interactive" => new PresenterPreviewWindow(PresenterPreviewMode.Interactive),
                _ => new MainWindow(preview)
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}
