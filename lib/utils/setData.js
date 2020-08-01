const fs = require('fs');
const path = require('path');

module.exports = async (id, type, data = '') => {
  const fileName = path.resolve(__dirname, '../data/', type, id);
  await fs.promises.writeFile(fileName, data, 'utf8');
};
