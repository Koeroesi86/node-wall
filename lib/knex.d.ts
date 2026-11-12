import 'knex';
import type { Contents, Links, Posts, PostsComments, PostsTags, RateLimits, Tags, Users, UsersLogin, UsersSession, UsersTags } from './data-schemas';

/** Column defaults (CURRENT_TIMESTAMP) are stored as text, while the app writes epoch milliseconds. */
type WithTimestamp<Row extends { created_at: unknown }> = Omit<Row, 'created_at'> & { created_at: string | number | null };

declare module 'knex/types/tables' {
  // Row types per table, from the generated schemas.
  interface Tables {
    contents: Contents;
    links: WithTimestamp<Links>;
    posts: WithTimestamp<Posts>;
    posts_comments: WithTimestamp<PostsComments>;
    posts_tags: PostsTags;
    rate_limits: RateLimits;
    tags: Tags;
    users: WithTimestamp<Users>;
    users_login: UsersLogin;
    users_session: WithTimestamp<UsersSession>;
    users_tags: UsersTags;
  }
}

// Implemented by knex but missing from its type definitions.
declare module 'knex' {
  namespace Knex {
    interface QueryInterface<TRecord extends {} = any, TResult = any> {
      havingExists(callback: (this: Knex.QueryBuilder) => void): Knex.QueryBuilder<TRecord, TResult>;
      havingNotExists(callback: (this: Knex.QueryBuilder) => void): Knex.QueryBuilder<TRecord, TResult>;
    }
  }
}
