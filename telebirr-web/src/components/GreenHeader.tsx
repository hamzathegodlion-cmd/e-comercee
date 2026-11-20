import { useState } from 'react';
import { DEMO_USER } from '../data';
import type { Lang } from '../types';
import { useWallet } from '../lib/WalletContext';
import { IconBell, IconEye, IconEyeOff, IconGlobe, IconSearch, IconUser } from './icons';

const COPY = {
  greeting: { en: 'Selam', am: 'ሰላም' },
  balance: { en: 'Balance (ETB)', am: 'ቀሪ ሂሳብ (ብር)' },
  endekise: { en: 'Endekise (ETB)', am: 'አንደኪሴ (ብር)' },
  reward: { en: 'Reward (ETB)', am: 'ሽልማት (ብር)' },
  marquee: { en: 'ONE APP FOR ALL YOUR NEEDS!', am: 'አንድ መተግበሪያ ለሁሉም ፍላጎቶችህ!' },
} as const;

export default function GreenHeader({
  lang,
  onChangeLang,
  unread,
  onOpenNotifications,
  onOpenSearch,
}: {
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  unread: number;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
}) {
  const { balance, endekise, reward, formatEtb } = useWallet();
  const [showBalance, setShowBalance] = useState(false);
  const [showEndekise, setShowEndekise] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const eye = (shown: boolean, onClick: () => void) => (
    <button className="eye-btn" onClick={onClick} aria-label={shown ? 'Hide amount' : 'Show amount'}>
      {shown ? <IconEye width={13} height={13} /> : <IconEyeOff width={13} height={13} />}
    </button>
  );

  return (
    <section className="green-head">
      <div className="gh-row">
        <div className="user-intro">
          <span className="avatar">
            <IconUser width={26} height={26} />
          </span>
          <span className="hello">
            {COPY.greeting[lang]}, <span className="name">{DEMO_USER.name}</span>
          </span>
        </div>

        <div className="head-actions">
          <button className="icon-btn" onClick={onOpenSearch} aria-label="Search services">
            <IconSearch width={21} height={21} />
          </button>
          <button className="icon-btn" onClick={onOpenNotifications} aria-label="Notifications">
            <IconBell width={21} height={21} />
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="lang-btn" onClick={() => setLangOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={langOpen}>
              <IconGlobe width={16} height={16} />
              {lang === 'en' ? 'Eng' : 'አማ'}
              <span aria-hidden="true">▾</span>
            </button>
            {langOpen && (
              <div className="lang-menu" role="listbox">
                <button
                  role="option"
                  aria-selected={lang === 'en'}
                  className={lang === 'en' ? 'active' : ''}
                  onClick={() => {
                    onChangeLang('en');
                    setLangOpen(false);
                  }}
                >
                  English (Eng)
                </button>
                <button
                  role="option"
                  aria-selected={lang === 'am'}
                  className={lang === 'am' ? 'active' : ''}
                  onClick={() => {
                    onChangeLang('am');
                    setLangOpen(false);
                  }}
                >
                  አማርኛ (Amh)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="balance-main">
        <div className="label">
          {COPY.balance[lang]} {eye(showBalance, () => setShowBalance((v) => !v))}
        </div>
        <div className="value">{showBalance ? formatEtb(balance) : '******'}</div>
      </div>

      <div className="balance-sub">
        <div className="cell">
          <div className="label">
            {COPY.endekise[lang]} {eye(showEndekise, () => setShowEndekise((v) => !v))}
          </div>
          <div className="value">{showEndekise ? formatEtb(endekise) : '******'}</div>
        </div>
        <div className="cell" style={{ textAlign: 'right' }}>
          <div className="label">
            {COPY.reward[lang]} {eye(showReward, () => setShowReward((v) => !v))}
          </div>
          <div className="value">{showReward ? formatEtb(reward) : '******'}</div>
        </div>
      </div>

      <div className="marquee-strip" aria-hidden="true">
        <div className="marquee-inner">{COPY.marquee[lang]}</div>
      </div>
    </section>
  );
}
