const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * @param {string} id
   * @param {string} type
   * @returns {Promise<boolean>}
   */
  has: async (id, type) => {
    const fileName = path.resolve(__dirname, '../../data/', type, id);
    return fs.existsSync(fileName);
  },
  /**
   * @param {string} id
   * @param {string} type
   * @returns {Promise<string>}
   */
  read: async (id, type) => {
    const fileName = path.resolve(__dirname, '../../data/', type, id);

    if (!fs.existsSync(fileName)) {
      throw new Error('file not exists');
    }

    return fs.promises.readFile(fileName, 'utf8');
  },
  /**
   * @param {string} id
   * @param {string} type
   * @param {string} [data]
   * @param {string} [encoding]
   * @returns {Promise<void>}
   */
  write: async (id, type, data = '', encoding = 'utf8') => {
    const fileName = path.resolve(__dirname, '../../data/', type, id);
    await fs.promises.writeFile(fileName, data, encoding);
  }
}
