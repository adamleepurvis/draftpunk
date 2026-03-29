export default function SettingsModal({ settings, onUpdate, onClose }) {
  const fontSize = settings.fontSize || 'medium'
  const fontFamily = settings.fontFamily || 'serif'
  const goal = settings.wordCountGoal || ''
  const theme = settings.theme || 'dark'
  const typewriterMode = settings.typewriterMode || false
  const writingBg = settings.writingBg || 'default'
  const goalFrequency = settings.goalFrequency || 'daily'
  const goalDaysPerWeek = settings.goalDaysPerWeek || 2

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
            <label className="setting-label">Writing goal</label>
            <div className="setting-options">
              {[{ key: 'daily', label: 'Daily' }, { key: 'weekly', label: 'Weekly' }].map(({ key, label }) => (
                <button
                  key={key}
                  className={`option-btn${goalFrequency === key ? ' active' : ''}`}
                  onClick={() => onUpdate('goalFrequency', key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {goalFrequency === 'weekly' ? (
              <>
                <div className="setting-options" style={{ marginTop: '8px' }}>
                  {[1,2,3,4,5,6,7].map((n) => (
                    <button
                      key={n}
                      className={`option-btn${goalDaysPerWeek === n ? ' active' : ''}`}
                      onClick={() => onUpdate('goalDaysPerWeek', n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="setting-hint">{goalDaysPerWeek} day{goalDaysPerWeek !== 1 ? 's' : ''} per week</span>
              </>
            ) : (
              <>
                <input
                  className="setting-input"
                  type="number"
                  min="0"
                  value={goal}
                  onChange={(e) => onUpdate('wordCountGoal', parseInt(e.target.value) || 0)}
                  placeholder="e.g. 1000"
                  style={{ marginTop: '8px' }}
                />
                <span className="setting-hint">Words per day — set to 0 to hide</span>
              </>
            )}
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
                { key: 'serif', label: 'Georgia' },
                { key: 'merriweather', label: 'Merriweather' },
                { key: 'garamond', label: 'Garamond' },
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

          <div className="setting-row">
            <label className="setting-label">Typewriter mode</label>
            <div className="setting-options">
              {[{ key: false, label: 'Off' }, { key: true, label: 'On' }].map(({ key, label }) => (
                <button
                  key={String(key)}
                  className={`option-btn${typewriterMode === key ? ' active' : ''}`}
                  onClick={() => onUpdate('typewriterMode', key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="setting-hint">Keeps the cursor centered while you type</span>
          </div>

          <div className="setting-row">
            <label className="setting-label">Writing background</label>
            <div className="setting-options">
              {[
                { key: 'default', label: 'Default' },
                { key: 'cream', label: 'Cream' },
                { key: 'sepia', label: 'Sepia' },
                { key: 'dark', label: 'Dark' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`option-btn${writingBg === key ? ' active' : ''}`}
                  onClick={() => onUpdate('writingBg', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <span className="setting-hint">Settings are saved automatically and stored locally.</span>
        </div>
      </div>
    </div>
  )
}
