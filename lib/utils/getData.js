const fs = require('fs');
const path = require('path');

/**
 * @param {string} id
 * @param {string} type
 * @returns {Promise<string>}
 */
module.exports = async (id, type) => {
  const fileName = path.resolve(__dirname, '../data/', type, id);

  if (!fs.existsSync(fileName)) {
    throw new Error('file not exists');
  }

  return fs.promises.readFile(fileName, 'utf8');
};
