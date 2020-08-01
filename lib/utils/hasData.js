const fs = require('fs');
const path = require('path');

module.exports = async (id, type) => {
  const fileName = path.resolve(__dirname, '../data/', type, id);
  return fs.existsSync(fileName);
};
