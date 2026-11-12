/** Email addresses are matched case-insensitively; other login types keep their provider id untouched. */
export default (type: string, value: string) => type === 'email'
  ? value.normalize('NFKC').trim().toLowerCase()
  : value;
