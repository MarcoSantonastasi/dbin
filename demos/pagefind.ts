import dbin from "../mod.ts";

const binfile = await dbin({
  pattern:
    "https://github.com/CloudCannon/pagefind/releases/download/v{version}/pagefind-v{version}-{target}.tar.gz",
  checksumPattern:
    "https://github.com/CloudCannon/pagefind/releases/download/v{version}/pagefind-v{version}-{target}.tar.gz.sha256",
  version: "0.8.1",
  targets: [
    { name: "x86_64-unknown-linux-musl", os: "linux", arch: "x86_64" },
    { name: "x86_64-apple-darwin", os: "darwin" },
    { name: "x86_64-pc-windows-msvc", os: "windows", arch: "x86_64" },
  ],
  dir: "./_bin",
  name: "pagefind",
  overwrite: true,
});

const process = Deno.run({ cmd: [binfile, "-h"] });
await process.status();
process.close();
