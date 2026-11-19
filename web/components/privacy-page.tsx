import { TranslateText } from '../translations.tsx';
import './privacy-page.css';

interface PrivacyPageProps {
  controller?: string;
  contact?: string;
}

const sections = ['controller', 'data', 'purposes', 'retention', 'recipients', 'cookies', 'rights', 'complaint'];

export const PrivacyPage = ({ controller = '', contact = '' }: PrivacyPageProps) => (
  <div className="privacy-page">
    <h3><TranslateText alias="privacy-page.header" /></h3>
    <p><TranslateText alias="privacy-page.intro" /></p>
    {sections.map(section => <section key={section}><TranslateText alias={`privacy-page.${section}`} /></section>)}
    <section>
      <TranslateText alias="privacy-page.contact" />
      <div className="controller">{controller}</div>
      <div><a className="contact" href={contact ? `mailto:${encodeURI(contact)}` : undefined}>{contact}</a></div>
    </section>
  </div>
);
