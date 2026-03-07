import { useState, useEffect, useRef } from 'react'

const FONT_SIZE_MAP = { small: '15px', medium: '18px', large: '22px' }
const FONT_FAMILY_MAP = {
  serif: 'Georgia, "Palatino Linotype", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"SF Mono", "Fira Code", "Fira Mono", monospace',
}

function wordCount(text) {
  if (!text?.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function WritingPanel({
  scene, isSaving, settings,
  onBack, onContentChange, onSynopsisChange, onTitleChange,
  onExportScene, onExportAll,
}) {
  const [localTitle, setLocalTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const textareaRef = useRef(null)
  const prevSceneIdRef = useRef(null)
  const exportMenuRef = useRef(null)

  useEffect(() => {
    if (scene) setLocalTitle(scene.title)
  }, [scene?.id, scene?.title])

  // Auto-resize on scene switch
  useEffect(() => {
    if (scene?.id !== prevSceneIdRef.current) {
      prevSceneIdRef.current = scene?.id ?? null
      autoResize()
    }
  })

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return
    function handleClick(e) {
      if (!exportMenuRef.current?.contains(e.target)) setShowExport(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExport])

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
    if (trimmed && trimmed !== scene.title) onTitleChange(scene.id, trimmed)
    else setLocalTitle(scene.title)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleTitleBlur() }
    if (e.key === 'Escape') { setLocalTitle(scene.title); setEditingTitle(false) }
  }

  function handleBack() {
    if (isSaving && !window.confirm('Changes are still saving. Go back anyway?')) return
    onBack()
  }

  const count = wordCount(scene?.content)
  const fontSize = FONT_SIZE_MAP[settings?.fontSize || 'medium']
  const fontFamily = FONT_FAMILY_MAP[settings?.fontFamily || 'serif']

  if (!scene) {
    return (
      <main className="writing-panel empty">
        <div className="empty-state">
          <div className="empty-logo">Draft Punk</div>
          <p>Select a scene from the outline to start writing.</p>
          <button className="empty-export-btn" onClick={onExportAll} title="Export all scenes as Markdown">
            Export all scenes
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="writing-panel">
      <div className="writing-header">
        <button className="back-btn" onClick={handleBack} aria-label="Back to outline">
          ← Back
        </button>

        <div className="writing-meta">
          <span className="scene-word-count">
            {count.toLocaleString()} {count === 1 ? 'word' : 'words'}
          </span>
          <span className={`save-status${isSaving ? ' saving' : ''}`}>
            {isSaving ? 'Saving…' : 'Saved'}
          </span>

          {/* Export menu */}
          <div className="export-menu" ref={exportMenuRef}>
            <button
              className="export-toggle"
              onClick={() => setShowExport((v) => !v)}
              title="Export"
            >
              Export ▾
            </button>
            {showExport && (
              <div className="export-dropdown">
                <button onClick={() => { onExportScene(); setShowExport(false) }}>
                  This scene (.txt)
                </button>
                <button onClick={() => { onExportAll(); setShowExport(false) }}>
                  All scenes (.md)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="writing-body"
        style={{ '--wf-size': fontSize, '--wf-family': fontFamily }}
      >
        {/* Title */}
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

        {/* Synopsis */}
        <details className="synopsis-details">
          <summary className="synopsis-summary">Synopsis</summary>
          <textarea
            className="synopsis-textarea"
            value={scene.synopsis || ''}
            onChange={(e) => onSynopsisChange(scene.id, e.target.value)}
            placeholder="Brief summary of this scene…"
            rows={3}
          />
        </details>

        {/* Main content */}
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
