// Command-line arguments: positionals, --flag, --key value. Numbers are parsed when they look like numbers.

export function parseArgs(argv) {
  const positionals = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = /^-?\d+(\.\d+)?$/.test(next) ? Number(next) : next;
      i += 1;
    }
  }
  return { positionals, options };
}
