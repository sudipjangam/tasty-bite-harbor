const fs = require('fs');
const content = fs.readFileSync('.env', 'utf-8');
content.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^['"]|['"]$/g, '');
    console.log(`[${key}] -> [${val.substring(0, 15)}...]`);
  }
});
