import { useState, useEffect, useRef } from 'react'

function wordCount(text) {
  if (!text?.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function WritingPanel({ scene, isSaving, onBack, onContentChange, onTitleChange }) {
  const [localTitle, setLocalTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const textareaRef = useRef(null)
  const prevSceneIdRef = useRef(null)

  // Sync title when scene changes
  useEffect(() => {
    if (scene) setLocalTitle(scene.title)
  }, [scene?.id, scene?.title])

  // Auto-resize textarea when scene switches or content loads
  useEffect(() => {
    if (scene?.id !== prevSceneIdRef.current) {
      prevSceneIdRef.current = scene?.id ?? null
      autoResize()
    }
  })

  function autoResize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }

  function handleContentChange(e) {
    onContentChange(scene.id, e.target.value)
    autoResize()
  }

  function handleTitleBlur() {
    setEditingTitle(false)
    const trimmed = localTitle.trim()
    if (trimmed && trimmed !== scene.title) {
      onTitleChange(scene.id, trimmed)
    } else {
      setLocalTitle(scene.title)
    }
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleTitleBlur() }
    if (e.key === 'Escape') { setLocalTitle(scene.title); setEditingTitle(false) }
  }

  const count = wordCount(scene?.content)

  if (!scene) {
    return (
      <main className="writing-panel empty">
        <div className="empty-state">
          <div className="empty-logo">Draft Punk</div>
          <p>Select a scene from the outline to start writing.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="writing-panel">
      <div className="writing-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to outline">
          ← Back
        </button>
        <div className="writing-meta">
          <span className="scene-word-count">
            {count.toLocaleString()} {count === 1 ? 'word' : 'words'}
          </span>
          <span className={`save-status${isSaving ? ' saving' : ''}`}>
            {isSaving ? 'Saving…' : 'Saved'}
          </span>
        </div>
      </div>

      <div className="writing-body">
        {editingTitle ? (
          <input
            className="scene-title-input"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h1
            className="scene-title-display"
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
          >
            {scene.title}
          </h1>
        )}

        <textarea
          ref={textareaRef}
          className="scene-textarea"
          value={scene.content ?? ''}
          onChange={handleContentChange}
          placeholder="Start writing…"
          spellCheck
        />
      </div>
    </main>
  )
}
