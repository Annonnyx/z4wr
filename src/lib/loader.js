import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function loadCommands(client) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const commandsDir = path.resolve(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  const stats = { total: 0, categories: {} };

  for (const cat of categories) {
    const catDir = path.join(commandsDir, cat.name);
    const files = fs.readdirSync(catDir).filter((f) => f.endsWith('.js'));

    stats.categories[cat.name] = 0;
    for (const file of files) {
      const full = path.join(catDir, file);
      const mod = await import(full);
      const cmd = mod.default;
      if (!cmd?.name || !cmd?.execute) continue;
      // attach category for help grouping
      if (!cmd.category) cmd.category = cat.name;
      client.commands.set(cmd.name, cmd);
      stats.total += 1;
      stats.categories[cat.name] += 1;
    }
  }

  console.log('Commands loaded:', stats.total);
  for (const [cat, count] of Object.entries(stats.categories)) {
    console.log(` - ${cat}: ${count}`);
  }

  return stats;
}
