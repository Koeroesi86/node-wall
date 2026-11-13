const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_TAG_FILTER_IDS = 20;

/** Splits a comma separated tag id list, keeping at most `MAX_TAG_FILTER_IDS` well-formed UUIDs. */
const parseTagIds = (value: string | undefined): string[] => (value ?? '')
  .split(',')
  .filter(id => UUID_PATTERN.test(id))
  .slice(0, MAX_TAG_FILTER_IDS);

export default parseTagIds;
