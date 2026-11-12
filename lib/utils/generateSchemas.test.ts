import { describe, expect, it } from 'vitest';
import { isApplicationTable, mapColumn, mapType, renderIndex, renderSchema, schemaFileName } from './generateSchemas';

describe('mapType', () => {
  it.each([
    ['INTEGER', 'z.number().int()'],
    ['bigint', 'z.number().int()'],
    ['varchar(255)', 'z.string()'],
    ['text', 'z.string()'],
    ['BLOB', 'z.instanceof(Buffer)'],
    ['REAL', 'z.number()'],
    ['float', 'z.number()'],
    ['datetime', 'z.number()'],
    ['', 'z.unknown()'],
  ])('maps %s to %s', (type, expected) => {
    expect(mapType(type)).toBe(expected);
  });
});

describe('mapColumn', () => {
  it('makes columns without notnull nullable', () => {
    expect(mapColumn({ name: 'a', type: 'text', notnull: 0 })).toBe('z.string().nullable()');
    expect(mapColumn({ name: 'a', type: 'text', notnull: 1 })).toBe('z.string()');
  });
});

describe('isApplicationTable', () => {
  it.each(['knex_migrations', 'knex_migrations_lock', 'sqlite_sequence'])('skips %s', (name) => {
    expect(isApplicationTable(name)).toBe(false);
  });

  it('keeps application tables', () => {
    expect(isApplicationTable('users_session')).toBe(true);
  });
});

describe('rendering', () => {
  it('kebab-cases file names', () => {
    expect(schemaFileName('users_session')).toBe('users-session.ts');
  });

  it('renders a schema with its inferred type', () => {
    const output = renderSchema('users_session', [
      { name: 'id', type: 'varchar(255)', notnull: 1 },
      { name: 'attempts', type: 'integer', notnull: 0 },
    ]);
    expect(output).toContain('Do not edit');
    expect(output).toContain('export const UsersSessionSchema = z.object({');
    expect(output).toContain('"id": z.string(),');
    expect(output).toContain('"attempts": z.number().int().nullable(),');
    expect(output).toContain('export type UsersSession = z.infer<typeof UsersSessionSchema>;');
  });

  it('renders an index re-exporting every table', () => {
    expect(renderIndex(['posts', 'users_session'])).toContain("export * from './users-session';");
  });
});
