import { useState, useRef } from 'react'

const PREDEFINED_TAGS = ['#character', '#setting', '#dialogue']

const speechSupported =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

export default function InboxPanel({
  inboxItems,
  chapters,
  isOnline,
  onAddInboxItem,
  onUpdateInboxItem,
  onDeleteInboxItem,
  onPromoteInboxItem,
}) {
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [promotingId, setPromotingId] = useState(null)
  const [promoteChapterId, setPromoteChapterId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

  // ── Tag management ────────────────────────────────────────────

  function toggleTag(tag) {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addCustomTag() {
    const raw = customTag.trim()
    if (!raw) return
    const tag = raw.startsWith('#') ? raw : `#${raw}`
    if (!newTags.includes(tag)) setNewTags((prev) => [...prev, tag])
    setCustomTag('')
  }

  // ── Photo ─────────────────────────────────────────────────────

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  // ── Add item ──────────────────────────────────────────────────

  async function handleAdd() {
    if (!newContent.trim() || isAdding) return
    setIsAdding(true)
    try {
      await onAddInboxItem(newContent.trim(), newTags, photoFile)
      setNewContent('')
      setNewTags([])
      clearPhoto()
    } finally {
      setIsAdding(false)
    }
  }

  function handleCaptureKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
  }

  // ── Voice capture ─────────────────────────────────────────────

  function startVoice() {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onAddInboxItem(transcript.trim(), [], null)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  // ── Promote ───────────────────────────────────────────────────

  function startPromote(item) {
    setPromotingId(item.id)
    setPromoteChapterId(chapters[0]?.id ?? '')
  }

  async function confirmPromote(item) {
    if (!promoteChapterId) return
    await onPromoteInboxItem(item, promoteChapterId)
    setPromotingId(null)
    setPromoteChapterId('')
  }

  // ── Render ────────────────────────────────────────────────────

  const activeItems = inboxItems.filter((i) => !i.promoted)
  const promotedItems = inboxItems.filter((i) => i.promoted)

  return (
    <div className="inbox-panel">
      {/* ── Quick capture ── */}
      <div className="quick-capture">
        <textarea
          className="capture-input"
          placeholder={isOnline ? 'Capture an idea… (⌘↵ to add)' : 'Offline — note will sync when reconnected'}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleCaptureKeyDown}
          rows={3}
        />

        <div className="tag-selector">
          {PREDEFINED_TAGS.map((tag) => (
            <button
              key={tag}
              className={`tag-btn${newTags.includes(tag) ? ' active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
          <input
            className="custom-tag-input"
            placeholder="+ tag"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustomTag() }}
          />
        </div>

        {photoPreview && (
          <div className="photo-preview">
            <img src={photoPreview} alt="attachment preview" />
            <button className="photo-remove" onClick={clearPhoto} title="Remove photo">✕</button>
          </div>
        )}

        <div className="capture-actions">
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title={isOnline ? 'Attach photo' : 'Photos unavailable offline'}
            disabled={!isOnline}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />

          {speechSupported && (
            <button
              className={`icon-btn${isListening ? ' listening' : ''}`}
              onClick={startVoice}
              title={isListening ? 'Stop recording' : 'Voice to text'}
            >
              {isListening ? '⏹' : '🎤'}
            </button>
          )}

          <button
            className="add-item-btn"
            onClick={handleAdd}
            disabled={!newContent.trim() || isAdding}
          >
            {isAdding ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {/* ── Items list ── */}
      <div className="inbox-list">
        {activeItems.length === 0 && (
          <p className="inbox-empty">No ideas yet. Start capturing!</p>
        )}

        {activeItems.map((item) => (
          <InboxItem
            key={item.id}
            item={item}
            chapters={chapters}
            isPromoting={promotingId === item.id}
            promoteChapterId={promoteChapterId}
            onSetPromoteChapterId={setPromoteChapterId}
            onStartPromote={() => startPromote(item)}
            onConfirmPromote={() => confirmPromote(item)}
            onCancelPromote={() => setPromotingId(null)}
            onDelete={() => onDeleteInboxItem(item.id)}
          />
        ))}

        {promotedItems.length > 0 && (
          <details className="promoted-section">
            <summary>{promotedItems.length} promoted to scene{promotedItems.length !== 1 ? 's' : ''}</summary>
            {promotedItems.map((item) => (
              <div key={item.id} className="inbox-item promoted">
                <p className="inbox-content">{item.content}</p>
                <div className="inbox-item-footer">
                  <span className="promoted-badge">Promoted to scene</span>
                  <button
                    className="inbox-action-btn danger"
                    onClick={() => onDeleteInboxItem(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </details>
        )}
      </div>
    </div>
  )
}

function InboxItem({
  item,
  chapters,
  isPromoting,
  promoteChapterId,
  onSetPromoteChapterId,
  onStartPromote,
  onConfirmPromote,
  onCancelPromote,
  onDelete,
}) {
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="inbox-item">
      <p className="inbox-content">{item.content}</p>

      {item.tags?.length > 0 && (
        <div className="tag-pills">
          {item.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      )}

      {item.photo_url && (
        <img className="inbox-photo" src={item.photo_url} alt="attached visual" />
      )}

      <div className="inbox-item-footer">
        <span className="inbox-date">{date}</span>

        {isPromoting ? (
          <div className="promote-form">
            <select
              value={promoteChapterId}
              onChange={(e) => onSetPromoteChapterId(e.target.value)}
            >
              <option value="">Select chapter…</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button
              className="inbox-action-btn confirm"
              onClick={onConfirmPromote}
              disabled={!promoteChapterId}
            >
              Create Scene
            </button>
            <button className="inbox-action-btn" onClick={onCancelPromote}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="inbox-item-actions">
            <button
              className="inbox-action-btn"
              onClick={onStartPromote}
              disabled={chapters.length === 0}
              title={chapters.length === 0 ? 'Add a chapter first' : 'Promote to scene'}
            >
              Promote
            </button>
            <button className="inbox-action-btn danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
