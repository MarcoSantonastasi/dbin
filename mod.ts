import { dirname, join } from "https://deno.land/std@0.156.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.156.0/fs/ensure_dir.ts";

type OS = "linux" | "darwin" | "windows";
type Arch = "x86_64" | "aarch64";

export interface Options {
  /** URL pattern to build the final download URL. It can contain a {target} placeholder and a {version} placeholder or be a fully qualified URL to download a specific target. */
  pattern: string;

  /** Checksum pattern URL used to optionally verify the checksum of the file.*/
  checksumPattern?: string;

  /** Version of the GitHub release to download. If given it will be used to replace the {version} placeholder in the pattern. */
  version?: string;

  /** List of different possible build targets in the GitHub release. */
  targets?: Target[];

  /** Directory path to save the binary file to. Must NOT include the file name. */
  dir: string;

  /** Saved file name. In Windows environments, the extension ".exe" is appended automatically. */
  name: string;

  /** Wether to add the arch string to the saved file name. */
  addNameOs?: boolean;

  /** Wether to add the version string to the saved file name. */
  addNameVers?: boolean;

  /** Set true to override the binary file, if it already exists */
  overwrite?: boolean;

  /**
   * The permissions applied to the binary file (ignored by Windows). Defaults to chmod 0o764.
   * @see https://doc.deno.land/deno/stable/~/Deno.chmod
   */
  chmod?: number;

  /** To force a specific OS, instead of getting it from Deno.build.os */
  os?: OS;

  /** To force a specific arch, instead of getting it from Deno.build.arch */
  arch?: Arch;
}

export interface Target {
  name: string;
  os: OS;
  arch?: Arch;
}

export default async function main(options: Options): Promise<string> {
  const os = options.os ?? Deno.build.os;
  const arch = options.arch ?? Deno.build.arch;

  const target = options.targets?.find(
    (target) => target.os === os && (!target.arch || target.arch === arch),
  );

  const dlPattern = options.pattern;
  const dlPatternHasTarget = dlPattern.includes("{target}");
  const dlPatternHasVersion = dlPattern.includes("{version}");

  if (dlPatternHasTarget && options.targets?.length != 0) {
    if (!target) {
      throw new Error(`No target found for your platform (${os} ${arch})`);
    }
    dlPattern.replaceAll("{target}", target.name);
  } else {
    throw new Error(
      "When using {target} in the URL pattern you must also speicfy a non empty targets array and vice versa.",
    );
  }

  if (dlPatternHasVersion && options.version) {
    dlPattern.replaceAll("{version}", options.version);
  } else {
    throw new Error(
      "When using {version} in the URL pattern you must also speicfy a non empty version string and vice versa.",
    );
  }

  const dlUrl = new URL(dlPattern);

  const checksumPattern = options.checksumPattern;
  const checksumPatternHasTarget = checksumPattern?.includes("{target}");
  const checksumPatternHasVersion = checksumPattern?.includes("{version}");

  if (
    checksumPattern &&
    checksumPatternHasTarget &&
    options.targets &&
    options.targets.length != 0
  ) {
    if (!target) {
      throw new Error(`No target found for your platform (${os} ${arch})`);
    }
    checksumPattern.replaceAll("{target}", target.name);
  } else {
    throw new Error(
      "When using {target} in the checksum URL pattern you must also speicfy a non empty targets array and vice versa.",
    );
  }

  if (
    checksumPattern &&
    checksumPatternHasVersion &&
    options.version &&
    options.version.length != 0
  ) {
    checksumPattern.replaceAll("{version}", options.version);
  } else {
    throw new Error(
      "When using {version} in the checksum URL pattern you must also speicfy a non empty version string and vice versa.",
    );
  }

  //  const checksumUrl = new URL(checksumPattern);

  const nameSegments = [options.name];

  if (options.addNameOs && options.targets && options.targets.length != 0) {
    if (!target) {
      throw new Error(`No target found for your platform (${os} ${arch})`);
    }
    nameSegments.push(target.os);
  } else {
    throw new Error(
      "When adding a target architecture to the saved file name you must also speicfy a non empty targets array.",
    );
  }

  if (options.addNameVers && options.version && options.version.length != 0) {
    nameSegments.push(options.version);
  } else {
    throw new Error(
      "When adding a version to the saved file name you must also speicfy a non empty version string.",
    );
  }

  const saveName = nameSegments.join("-");
  if (os === "windows" && !saveName.endsWith(".exe")) saveName.concat(".exe");
  const saveFullPath: string = join(options.dir, saveName);

  let file: Deno.FsFile;

  try {
    const fileResponse = await fetch(dlUrl);
    if (fileResponse.body) {
      await ensureDir(dirname(saveFullPath));
      try {
        file = await Deno.open(saveFullPath, {
          create: true,
          write: true,
          mode: 0o755,
          createNew: !options.overwrite,
        });
      } catch (e) {
        throw e;
      }

      const pipesMap = {
        tar: new TransformStream(),
        gz: new TransformStream(),
        zip: new TransformStream(),
      };

      const saveExtensions = saveFullPath
        .split(".")
        .filter((seg) => seg in pipesMap);

      const pipes = saveExtensions.map(
        (ext) => pipesMap[ext as never] as TransformStream,
      );

      await pipes
        .reduce((out, pipe) => out.pipeThrough(pipe), fileResponse.body)
        .pipeTo(file.writable);
    }
  } catch (e) {
    throw e;
  }

  // Change file permissions
  try {
    await Deno.chmod(saveFullPath, options.chmod || 0o764);
  } catch {
    // Not supported on Windows
  }
  return saveFullPath;
}
