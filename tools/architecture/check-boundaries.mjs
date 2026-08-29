import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const importPattern =
  /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)["']([^"']+)["']/g;

function readSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readSourceFiles(entryPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : [];
  });
}

function workspacePackages(rootDirectory) {
  const packagesDirectory = path.join(rootDirectory, "packages");
  if (!fs.existsSync(packagesDirectory)) return [];
  return fs
    .readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = path.join(packagesDirectory, entry.name);
      const manifestPath = path.join(directory, "package.json");
      const manifest = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
        : { name: `@physica/${entry.name}` };
      return { directory, manifest, shortName: entry.name };
    });
}

function dependencyCycleViolations(packages) {
  const packageNames = new Set(packages.map(({ manifest }) => manifest.name));
  const graph = new Map(
    packages.map(({ manifest }) => [
      manifest.name,
      Object.keys({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      }).filter((dependency) => packageNames.has(dependency)),
    ]),
  );
  const visiting = new Set();
  const visited = new Set();
  const violations = [];

  function visit(packageName, chain) {
    if (visiting.has(packageName)) {
      violations.push(
        `Package dependency cycle: ${[...chain, packageName].join(" -> ")}`,
      );
      return;
    }
    if (visited.has(packageName)) return;
    visiting.add(packageName);
    for (const dependency of graph.get(packageName) ?? []) {
      visit(dependency, [...chain, packageName]);
    }
    visiting.delete(packageName);
    visited.add(packageName);
  }

  for (const packageName of graph.keys()) visit(packageName, []);
  return violations;
}

export function checkBoundaries(rootDirectory) {
  const packages = workspacePackages(path.resolve(rootDirectory));
  const violations = dependencyCycleViolations(packages);

  for (const workspacePackage of packages) {
    for (const sourceFile of readSourceFiles(
      path.join(workspacePackage.directory, "src"),
    )) {
      const source = fs.readFileSync(sourceFile, "utf8");
      for (const match of source.matchAll(importPattern)) {
        const dependency = match[1];
        if (!dependency) continue;
        const location = path
          .relative(rootDirectory, sourceFile)
          .replaceAll("\\", "/");

        if (
          dependency.startsWith("@physica/apps/") ||
          dependency.startsWith("@physica/desktop")
        ) {
          violations.push(
            `${location}: packages must not import application internals (${dependency})`,
          );
        }
        if (/^@physica\/[^/]+\/.+/.test(dependency)) {
          violations.push(
            `${location}: cross-package imports must use the public package entry (${dependency})`,
          );
        }
        if (
          (workspacePackage.shortName === "physics-core" ||
            workspacePackage.shortName.startsWith("physics-")) &&
          (dependency === "react" ||
            dependency.startsWith("react/") ||
            dependency.startsWith("@physica/desktop"))
        ) {
          violations.push(
            `${location}: physics packages must not depend on React/editor internals (${dependency})`,
          );
        }
        if (
          workspacePackage.shortName.startsWith("renderer-") &&
          dependency.startsWith("@physica/physics-")
        ) {
          violations.push(
            `${location}: renderers must not import domain physics (${dependency})`,
          );
        }
      }
    }
  }
  return violations;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const violations = checkBoundaries(path.resolve(process.argv[2] ?? "."));
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exitCode = 1;
  } else {
    console.log("Architecture boundaries passed.");
  }
}
