import { TranslateText } from '../translations.tsx';
import './welcome-page.css';

export const WelcomePage = () => (
  <div className="welcome-page">
    <div>
      <h3><TranslateText alias="welcome-page.header" /></h3>
      <div>
        <TranslateText alias="welcome-page.note" />
      </div>
    </div>
  </div>
);
