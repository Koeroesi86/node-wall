const fs = require('fs');
const path = require('path');

module.exports = (id, type) => {
  const fileName = path.resolve(__dirname, '../data/', type, id);
  return Promise.resolve(fs.existsSync(fileName));
};
