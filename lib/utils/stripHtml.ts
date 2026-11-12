/**
 * Removes HTML tags until none are left, so nested input like `<<b>script>` cannot rebuild one,
 * then escapes any remaining `<` so it cannot open an element when the text is rendered as HTML.
 */
function stripHtml(value: string): string {
  const stripped = value.replace(/<[^>]*>/g, '');

  return stripped === value ? value.replace(/</g, '&lt;') : stripHtml(stripped);
}

export default stripHtml;
