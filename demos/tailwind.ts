import dbin from "../mod.ts";

const binfile = await dbin({
  pattern:
    "https://github.com/tailwindlabs/tailwindcss/releases/download/v{version}/tailwindcss-{target}",
  version: "3.1.8",
  targets: [
    { name: "linux-x64", os: "linux", arch: "x86_64" },
    { name: "linux-arm64", os: "linux", arch: "aarch64" },
    { name: "macos-x64", os: "darwin", arch: "x86_64" },
    { name: "macos-arm64", os: "darwin", arch: "aarch64" },
    { name: "windows-x64", os: "windows", arch: "x86_64" },
  ],
  dir: "./_bin",
  name: "tailwind",
  overwrite: true,
  addNameOs: true,
  addNameVers: true,
});

const process = Deno.run({ cmd: [binfile, "-h"] });
await process.status();
process.close();
