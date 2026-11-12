/** True only for one plain address: no list separators, whitespace, quotes, angle brackets or control characters. */
export default (value: unknown): value is string => typeof value === 'string'
  && value.length <= 254
  && /^[^\s@,;<>()[\]\\":\u0000-\u001f]+@[^\s@,;<>()[\]\\":\u0000-\u001f]+\.[^\s@,;<>()[\]\\":\u0000-\u001f]+$/.test(value);
