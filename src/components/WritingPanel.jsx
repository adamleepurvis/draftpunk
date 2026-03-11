import { useState, useEffect, useRef } from 'react'

const FONT_SIZE_MAP = { small: '15px', medium: '18px', large: '22px' }
const FONT_FAMILY_MAP = {
  serif: 'Georgia, "Palatino Linotype", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"SF Mono", "Fira Code", "Fira Mono", monospace',
}

// Render **bold** markdown in review feedback
function renderReviewLine(line) {
  if (!line.includes('**')) return line || '\u00A0'
  const parts = line.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

function wordCount(text) {
  if (!text?.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function WritingPanel({
  scene, isSaving, settings, wordTarget, onSetWordTarget,
  fullscreen, onToggleFullscreen,
  onBack, onContentChange, onSynopsisChange, onTitleChange, onStatusChange,
  onExportScene, onExportAll,
}) {
  const [localTitle, setLocalTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [reviewState, setReviewState] = useState('idle') // idle | loading | streaming | done | error
  const [feedback, setFeedback] = useState('')
  const textareaRef = useRef(null)
  const prevSceneIdRef = useRef(null)
  const exportMenuRef = useRef(null)
  const feedbackRef = useRef(null)

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

  // Reset review when scene changes
  useEffect(() => {
    setReviewState('idle')
    setFeedback('')
  }, [scene?.id])

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

  async function handleReview() {
    if (!scene?.content?.trim()) return
    setReviewState('loading')
    setFeedback('')

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: scene.title, content: scene.content }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error?.message || `Error ${res.status}`)
      }

      setReviewState('streaming')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              setFeedback((prev) => prev + json.delta.text)
            }
          } catch {
            // ignore unparseable SSE lines
          }
        }
      }

      setReviewState('done')
      // Scroll feedback into view
      setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (err) {
      setReviewState('error')
      setFeedback(err.message || 'Something went wrong. Try again.')
    }
  }

  function handleBack() {
    if (isSaving && !window.confirm('Changes are still saving. Go back anyway?')) return
    onBack()
  }

  const count = wordCount(scene?.content)
  const fontSize = FONT_SIZE_MAP[settings?.fontSize || 'medium']
  const fontFamily = FONT_FAMILY_MAP[settings?.fontFamily || 'serif']
  const targetProgress = wordTarget > 0 ? Math.min(100, Math.round((count / wordTarget) * 100)) : 0

  function handleTargetClick() {
    setTargetInput(wordTarget > 0 ? String(wordTarget) : '')
    setEditingTarget(true)
  }

  function commitTarget() {
    const val = parseInt(targetInput, 10)
    onSetWordTarget(isNaN(val) || val <= 0 ? 0 : val)
    setEditingTarget(false)
  }

  function handleTargetKeyDown(e) {
    if (e.key === 'Enter') commitTarget()
    if (e.key === 'Escape') setEditingTarget(false)
  }

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
          {editingTarget ? (
            <input
              className="target-input"
              type="number"
              min="0"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onBlur={commitTarget}
              onKeyDown={handleTargetKeyDown}
              placeholder="Target words…"
              autoFocus
            />
          ) : (
            <button
              className={`scene-word-count${wordTarget > 0 ? ' has-target' : ''}`}
              onClick={handleTargetClick}
              title={wordTarget > 0 ? `${targetProgress}% of ${wordTarget.toLocaleString()} word target — click to change` : 'Click to set a word target'}
            >
              {wordTarget > 0
                ? `${count.toLocaleString()} / ${wordTarget.toLocaleString()}`
                : `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'}`}
            </button>
          )}
          <span className={`save-status${isSaving ? ' saving' : ''}`}>
            {isSaving ? 'Saving…' : 'Saved'}
          </span>

          {/* Fullscreen */}
          <button
            className="fullscreen-btn"
            onClick={onToggleFullscreen}
            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
          >
            {fullscreen ? '⊠' : '⤢'}
          </button>

          {/* Review button */}
          <button
            className={`review-btn${reviewState === 'loading' || reviewState === 'streaming' ? ' reviewing' : ''}`}
            onClick={handleReview}
            disabled={reviewState === 'loading' || reviewState === 'streaming' || !scene?.content?.trim()}
            title="Get editorial feedback on this scene"
          >
            {reviewState === 'loading' || reviewState === 'streaming' ? 'Reviewing…' : 'Review'}
          </button>

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

      {wordTarget > 0 && (
        <div className="scene-progress-track">
          <div className="scene-progress-fill" style={{ width: `${targetProgress}%` }} />
        </div>
      )}

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

        {/* Editorial feedback */}
        {(reviewState === 'streaming' || reviewState === 'done' || reviewState === 'error') && (
          <div
            ref={feedbackRef}
            className={`review-panel${reviewState === 'error' ? ' review-error' : ''}`}
          >
            <div className="review-panel-header">
              <span className="review-panel-title">Editorial Notes</span>
              <button
                className="review-panel-close"
                onClick={() => { setReviewState('idle'); setFeedback('') }}
                aria-label="Dismiss feedback"
              >
                ✕
              </button>
            </div>
            <div className="review-panel-body">
              {feedback.split('\n').map((line, i) => (
                <p key={i}>{renderReviewLine(line)}</p>
              ))}
              {reviewState === 'streaming' && <span className="review-cursor">▌</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
