import { SetUserRoleRequestSchema, UserListResponseSchema } from '../../lib/api-schemas';
import { useEffect, useState } from 'react';
import { request } from '../api.ts';
import { TranslateText } from '../translations.tsx';
import './user-roles.css';

interface User {
  id: string;
  name?: string | null;
  role: string | null;
}

export const UserRoles = () => {
  const [users, setUsers] = useState<User[]>([]);

  const load = () => request('GET', '/api/users')
    .then(list => setUsers(UserListResponseSchema.parse(list)))
    .catch(console.error);

  const toggle = (user: User) => request('PUT', `/api/users/${encodeURIComponent(user.id)}`, SetUserRoleRequestSchema.parse({ role: user.role === 'admin' ? 'user' : 'admin' }))
    .then(load)
    .catch(console.error);

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="user-roles">
      <div className="heading">
        <TranslateText alias="user-roles.header" />
      </div>
      <div className="list">
        {users.map(user => (
          <div className="user" key={user.id}>
            <span className="name">{user.name || user.id}</span>
            <span className="role">{user.role}</span>
            <button type="button" className="button toggle" onClick={() => toggle(user)}>
              <TranslateText alias={`user-roles.${user.role === 'admin' ? 'demote' : 'promote'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
