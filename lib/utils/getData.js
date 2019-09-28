const fs = require('fs');
const path = require('path');

module.exports = (id, type) => {
  const fileName = path.resolve(__dirname, '../data/', type, id);
  if (!fs.existsSync(fileName)) return Promise.reject(new Error('file not exists'));
  return Promise.resolve(fs.readFileSync(fileName, 'utf8'));
};
