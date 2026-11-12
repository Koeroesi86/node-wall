/**
 * Removes HTML tags until none are left, so nested input like `<<b>script>` cannot rebuild one,
 * then escapes any remaining `<` so it cannot open an element when the text is rendered as HTML.
 */
function stripHtml(value: string): string {
  let result = value;
  let previous: string;

  do {
    previous = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== previous);

  return result.replace(/</g, '&lt;');
}

export default stripHtml;
