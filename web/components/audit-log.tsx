import { AuditListResponseSchema } from '../../lib/api-schemas';
import { useEffect, useState } from 'react';
import { request } from '../api.ts';
import { TranslateText } from '../translations.tsx';
import './audit-log.css';

interface Entry {
  user_id: string | null;
  user_name: string | null;
  action: string;
  target_id: string | null;
  created_at: number;
}

export const AuditLog = () => {
  const [entries, setEntries] = useState<Entry[]>();

  useEffect(() => {
    request('GET', '/api/users/audit')
      .then(list => setEntries(AuditListResponseSchema.parse(list)))
      .catch(console.error);
  }, []);

  return (
    <div className="audit-log">
      <div className="heading">
        <TranslateText alias="audit-log.header" />
      </div>
      <div className="list">
        {entries?.length === 0 && <TranslateText alias="audit-log.empty" />}
        {entries?.map((entry, index) => (
          <div className="entry" key={index}>
            <span className="time">{new Date(entry.created_at).toLocaleString()}</span>
            <span className="action"><TranslateText alias={`audit-log.action.${entry.action}`} /></span>
            <span className="actor" title={entry.target_id || ''}>{entry.user_name || entry.user_id || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
