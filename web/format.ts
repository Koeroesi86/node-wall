/** The local date and time of a timestamp the server sends as milliseconds (a number or numeric text). */
export const formatDate = (value: string | number | null | undefined) => new Date(typeof value === 'string' ? parseInt(value, 10) : value ?? 0).toLocaleString();
