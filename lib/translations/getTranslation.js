const fs = require('fs');
const path = require('path');

const parsePath = (alias, language) => path.resolve(__dirname, language, `${alias}.json`);

module.exports = async (alias, language = 'en-GB') => {
  let currentFile = parsePath(alias, language);

  if (fs.existsSync(currentFile)) {
    return Promise.resolve(JSON.parse(fs.readFileSync(currentFile, 'utf8')));
  }

  currentFile = parsePath(alias, 'en-GB');
  if (language !== 'en-GB' && fs.existsSync(currentFile)) {
    return Promise.resolve(JSON.parse(fs.readFileSync(currentFile, 'utf8')));
  }

  return {};
};
