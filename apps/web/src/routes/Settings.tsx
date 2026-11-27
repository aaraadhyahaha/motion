// #ui #auth Settings: completion sound (per device), shortcuts sheet, log out (form POST; first clears the SW `api` cache so no task data stays on the device). Lazy chunk.
import { useState } from 'react';
import { setSound, soundOn } from '../celebrate/sound';
import { PageHeader } from '../components/PageHeader';
import { showHelp } from '../keys/listen';
import '../styles/views.css';

const logout = (e: React.FormEvent<HTMLFormElement>) => {
  const f = e.currentTarget;
  e.preventDefault();
  // `api` = runtime cache name in vite.config.ts; logout must not wait on (or fail with) the cache
  void (self.caches?.delete('api') ?? Promise.resolve()).finally(() => f.submit());
};

export default function Settings() {
  const [sound, set] = useState(soundOn);
  return (
    <>
      <PageHeader title="Settings" />
      <section className="task-section">
        <h2 className="task-section-title t-title3">On this device</h2>
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
          <li>
            <button type="button" className="inset-item t-body" onClick={showHelp}>
              <span className="inset-label">Keyboard shortcuts</span>
              <kbd className="settings-kbd mono t-footnote">?</kbd>
            </button>
          </li>
        </ul>
        <p className="inset-note t-footnote">
          The completion sound starts off and is saved on this device only.
        </p>
      </section>
      <section className="task-section">
        <form method="post" action="/oauth/logout" className="inset-group" onSubmit={logout}>
          <button type="submit" className="inset-item t-body btn-danger settings-logout">
            Log out
          </button>
        </form>
      </section>
    </>
  );
}
