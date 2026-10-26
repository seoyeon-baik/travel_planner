const fs = require('node:fs');
const path = require('node:path');
function loadEnv() {
  const filename = path.resolve(__dirname, '../.env');
  if (fs.existsSync(filename)) process.loadEnvFile(filename);
}
module.exports = { loadEnv };
