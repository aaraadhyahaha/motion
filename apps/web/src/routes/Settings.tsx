// #ui #auth Settings: completion sound (per device), shortcuts sheet, log out (plain form POST — 0 JS). Lazy chunk.
import { useState } from 'react';
import { setSound, soundOn } from '../celebrate/sound';
import { PageHeader } from '../components/PageHeader';
import { showHelp } from '../keys/listen';
import '../styles/views.css';

export default function Settings() {
  const [sound, set] = useState(soundOn);
  return (
    <>
      <PageHeader title="Settings" />
      <section className="task-section">
        <h2 className="task-section-title t-headline">Celebrations</h2>
        <ul className="inset-group">
          <li>
            <label className="inset-item t-body">
              <span className="inset-label">Completion sound</span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={sound}
                onChange={(e) => {
                  setSound(e.target.checked);
                  set(e.target.checked);
                }}
              />
            </label>
          </li>
        </ul>
        <p className="settings-note t-footnote">Off by default. Saved on this device only.</p>
      </section>
      <section className="task-section">
        <h2 className="task-section-title t-headline">Keyboard</h2>
        <ul className="inset-group">
          <li>
            <button type="button" className="inset-item t-body" onClick={showHelp}>
              <span className="inset-label">Keyboard shortcuts</span>
              <kbd className="mono t-footnote">?</kbd>
            </button>
          </li>
        </ul>
      </section>
      <section className="task-section">
        <form method="post" action="/oauth/logout" className="inset-group">
          <button type="submit" className="inset-item t-body settings-logout">
            Log out
          </button>
        </form>
      </section>
    </>
  );
}
