async function detectLanguage(headers) {
  if (headers['accept-language']) {
    return headers['accept-language'].substr(0, 5);
  }

  return 'en-GB';
}

module.exports = detectLanguage;
