export default function SettingsModal({ settings, onUpdate, onClose }) {
  const fontSize = settings.fontSize || 'medium'
  const fontFamily = settings.fontFamily || 'serif'
  const goal = settings.wordCountGoal || ''
  const theme = settings.theme || 'dark'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="setting-row">
            <label className="setting-label">Theme</label>
            <div className="setting-options">
              {[{ key: 'dark', label: 'Dark' }, { key: 'light', label: 'Light' }].map(({ key, label }) => (
                <button
                  key={key}
                  className={`option-btn${theme === key ? ' active' : ''}`}
                  onClick={() => onUpdate('theme', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">Daily word count goal</label>
            <input
              className="setting-input"
              type="number"
              min="0"
              value={goal}
              onChange={(e) => onUpdate('wordCountGoal', parseInt(e.target.value) || 0)}
              placeholder="e.g. 1000"
            />
            <span className="setting-hint">Set to 0 to hide the progress bar</span>
          </div>

          <div className="setting-row">
            <label className="setting-label">Font size</label>
            <div className="setting-options">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  className={`option-btn${fontSize === size ? ' active' : ''}`}
                  onClick={() => onUpdate('fontSize', size)}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">Writing font</label>
            <div className="setting-options">
              {[
                { key: 'serif', label: 'Serif' },
                { key: 'sans', label: 'Sans-serif' },
                { key: 'mono', label: 'Monospace' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`option-btn${fontFamily === key ? ' active' : ''}`}
                  onClick={() => onUpdate('fontFamily', key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="setting-hint setting-font-preview" data-font={fontFamily}>
              The quick brown fox jumps over the lazy dog
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <span className="setting-hint">Settings are saved automatically and stored locally.</span>
        </div>
      </div>
    </div>
  )
}
