const storage = require("lib/services/storage");
const getComment = require("./queries/getComment");

module.exports = {
  /**
   * @param id
   * @returns {Promise<*>}
   */
  get: async (id) => {
    const comment = await getComment(id);

    if (comment) {
      return {
        ...comment,
        body: await storage.read(id, 'comment'),
      }
    }

    throw new Error(`no comment with id ${id}`);
  },
};
