using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

namespace BlackHoleRecycleBinPortable
{
    internal static class PortableLauncher
    {
        private const string AppVersion = "1.0.0";
        private const string AppExecutable = "Black Hole Recycle Bin.exe";
        private const string ArchiveResource = "BlackHoleRecycleBinPortable.Archive";

        [STAThread]
        private static int Main()
        {
            try
            {
                var appDirectory = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "BlackHoleRecycleBin",
                    AppVersion);
                var executablePath = Path.Combine(appDirectory, AppExecutable);
                var readyPath = Path.Combine(appDirectory, ".portable-ready");

                if (!File.Exists(readyPath) || !File.Exists(executablePath))
                {
                    ExtractApplication(appDirectory, readyPath);
                }

                Process.Start(new ProcessStartInfo
                {
                    FileName = executablePath,
                    WorkingDirectory = appDirectory,
                    UseShellExecute = true
                });
                return 0;
            }
            catch (Exception error)
            {
                MessageBox.Show(
                    "Unable to start Black Hole Recycle Bin.\r\n\r\n" + error.Message,
                    "Black Hole Recycle Bin",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 1;
            }
        }

        private static void ExtractApplication(string appDirectory, string readyPath)
        {
            Directory.CreateDirectory(appDirectory);
            var appDirectoryWithSeparator = Path.GetFullPath(appDirectory)
                .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                + Path.DirectorySeparatorChar;

            using (var archiveStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ArchiveResource))
            {
                if (archiveStream == null)
                {
                    throw new InvalidOperationException("The embedded application archive is missing.");
                }

                using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Read))
                {
                    foreach (var entry in archive.Entries)
                    {
                        var destinationPath = Path.GetFullPath(Path.Combine(appDirectory, entry.FullName));
                        if (!destinationPath.StartsWith(appDirectoryWithSeparator, StringComparison.OrdinalIgnoreCase))
                        {
                            throw new InvalidOperationException("The embedded archive contains an invalid path.");
                        }

                        if (entry.FullName.EndsWith("/", StringComparison.Ordinal))
                        {
                            Directory.CreateDirectory(destinationPath);
                            continue;
                        }

                        var destinationDirectory = Path.GetDirectoryName(destinationPath);
                        if (!String.IsNullOrEmpty(destinationDirectory))
                        {
                            Directory.CreateDirectory(destinationDirectory);
                        }
                        entry.ExtractToFile(destinationPath, true);
                    }
                }
            }

            File.WriteAllText(readyPath, "ready");
        }
    }
}
