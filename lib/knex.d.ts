import 'knex';

// Implemented by knex but missing from its type definitions.
declare module 'knex' {
  namespace Knex {
    interface QueryInterface<TRecord extends {} = any, TResult = any> {
      havingExists(callback: (this: Knex.QueryBuilder) => void): Knex.QueryBuilder<TRecord, TResult>;
      havingNotExists(callback: (this: Knex.QueryBuilder) => void): Knex.QueryBuilder<TRecord, TResult>;
    }
  }
}
