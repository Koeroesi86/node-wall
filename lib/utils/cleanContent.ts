import stripHtml from './stripHtml';

/** Normalizes user text and rejects it when nothing is left once markup is stripped. */
export default (body: string) => {
  const content = stripHtml(body.trim().replace(/\n{3,}/gi, '\n\n').replace(/&nbsp;/gi, ' ')).trim();

  if (!content) throw new Error('empty content');

  return content;
};
