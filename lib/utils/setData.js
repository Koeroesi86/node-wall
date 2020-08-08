const fs = require('fs');
const path = require('path');

/**
 * @param {string} id
 * @param {string} type
 * @param {string} data
 * @returns {Promise<void>}
 */
module.exports = async (id, type, data = '') => {
  const fileName = path.resolve(__dirname, '../data/', type, id);
  await fs.promises.writeFile(fileName, data, 'utf8');
};
