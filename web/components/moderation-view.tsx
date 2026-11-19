import { AuditLog } from './audit-log.tsx';
import { ModerationPage } from './moderation-page.tsx';
import { UserRoles } from './user-roles.tsx';

export const ModerationView = () => (
  <>
    <ModerationPage />
    <UserRoles />
    <AuditLog />
  </>
);
