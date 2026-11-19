import { useState, type FormEvent } from 'react';
import { TranslateText, useTranslation } from '../translations.tsx';
import './login-page.css';

interface LoginPageProps {
  /** The pending session named in the url; present when the code from the email is to be entered. */
  session?: string;
}

const codePattern = /^[A-Z0-9]+$/;

const post = (url: string, body: unknown, onDone: (request: XMLHttpRequest) => void) => {
  const request = new XMLHttpRequest();
  request.onreadystatechange = () => {
    if (request.readyState === 4) onDone(request);
  };
  request.open('POST', url, true);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify(body));
};

export const LoginPage = ({ session }: LoginPageProps) => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const codePlaceholder = useTranslation('login-page.activate-session.input.placeholder');
  const emailPlaceholder = useTranslation('login-page.create-session.input.placeholder');

  const activate = (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (code.length !== 6 || !codePattern.test(code)) return;

    post('/login/email', ApiSchemas.ActivateSessionRequestSchema.parse({ session, code }), (request) => {
      location.href = request.status === 200 ? '/' : `/login?session=${encodeURIComponent(session ?? '')}`;
    });
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (email.length === 0) return;

    post('/api/user', ApiSchemas.LoginRequestSchema.parse({ type: 'email', value: email }), (request) => {
      if (request.status !== 200) return;

      location.href = `/login?session=${ApiSchemas.LoginResponseSchema.parse(JSON.parse(request.responseText)).sessionId}`;
    });
  };

  return (
    <div className="login-page">
      <div className={session ? 'activateSession' : 'activateSession hidden'}>
        <h3>
          <TranslateText alias="login-page.activate-session.header" />
        </h3>
        <div className="note">
          <TranslateText alias="login-page.activate-session.note" />
        </div>
        <form className="inline" onSubmit={activate}>
          <input type="text" maxLength={6} className="input" placeholder={codePlaceholder} value={code} onChange={event => setCode(event.target.value)} />
          <button type="submit" className="button">
            <TranslateText alias="login-page.activate-session.button" />
          </button>
        </form>
      </div>
      <div className={session ? 'createSession hidden' : 'createSession'}>
        <h3>
          <TranslateText alias="login-page.create-session.header" />
        </h3>
        <div className="note">
          <TranslateText alias="login-page.create-session.header" />
        </div>
        <div className="note">
          <TranslateText alias="login-page.privacy-note" />
        </div>
        <form className="inline" onSubmit={create}>
          <input type="email" className="input" name="email" placeholder={emailPlaceholder} value={email} onChange={event => setEmail(event.target.value)} />
          <button type="submit" className="button">
            <TranslateText alias="login-page.create-session.button" />
          </button>
        </form>
      </div>
    </div>
  );
};
