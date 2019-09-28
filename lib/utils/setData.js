const fs = require('fs');
const path = require('path');

module.exports = (id, type, data = '') => {
  const fileName = path.resolve(__dirname, '../data/', type, id);
  fs.writeFileSync(fileName, data, 'utf8');
  return Promise.resolve();
};
