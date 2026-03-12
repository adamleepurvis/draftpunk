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

// Get the pixel offset of the caret within a textarea using a mirror div
function getCaretPixelTop(textarea) {
  const div = document.createElement('div')
  const style = getComputedStyle(textarea)
  ;['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'width',
  ].forEach((p) => { div.style[p] = style[p] })
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.top = '-9999px'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordBreak = 'break-word'
  div.appendChild(document.createTextNode(textarea.value.substring(0, textarea.selectionStart)))
  const span = document.createElement('span')
  span.textContent = '\u200b'
  div.appendChild(span)
  document.body.appendChild(div)
  const top = span.offsetTop
  document.body.removeChild(div)
  return top
}

export default function WritingPanel({
  scene, isSaving, settings, wordTarget, onSetWordTarget,
  fullscreen, onToggleFullscreen,
  onBack, onContentChange, onSynopsisChange, onNotesChange, onTitleChange, onStatusChange,
  onExportScene, onExportAll,
}) {
  const [localTitle, setLocalTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [reviewState, setReviewState] = useState('idle')
  const [feedback, setFeedback] = useState('')
  const textareaRef = useRef(null)
  const writingBodyRef = useRef(null)
  const prevSceneIdRef = useRef(null)
  const exportMenuRef = useRef(null)
  const feedbackRef = useRef(null)

  useEffect(() => {
    if (scene) setLocalTitle(scene.title)
  }, [scene?.id, scene?.title])

  useEffect(() => {
    if (scene?.id !== prevSceneIdRef.current) {
      prevSceneIdRef.current = scene?.id ?? null
      autoResize()
    }
  })

  useEffect(() => {
    setReviewState('idle')
    setFeedback('')
  }, [scene?.id])

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

  function doTypewriterScroll() {
    if (!settings?.typewriterMode) return
    const textarea = textareaRef.current
    const body = writingBodyRef.current
    if (!textarea || !body) return
    const caretTop = getCaretPixelTop(textarea)
    const absoluteTop = textarea.offsetTop + caretTop
    body.scrollTo({ top: Math.max(0, absoluteTop - body.clientHeight * 0.42), behavior: 'smooth' })
  }

  function handleContentChange(e) {
    onContentChange(scene.id, e.target.value)
    autoResize()
    requestAnimationFrame(doTypewriterScroll)
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
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              setFeedback((prev) => prev + json.delta.text)
            }
          } catch { /* ignore */ }
        }
      }
      setReviewState('done')
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
  const writingBg = settings?.writingBg || 'default'

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
          <button className="empty-export-btn" onClick={onExportAll}>Export all scenes</button>
        </div>
      </main>
    )
  }

  return (
    <main className="writing-panel">
      <div className="writing-header">
        <button className="back-btn" onClick={handleBack} aria-label="Back to outline">← Back</button>

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
              title={wordTarget > 0 ? `${targetProgress}% — click to change target` : 'Click to set a word target'}
            >
              {wordTarget > 0
                ? `${count.toLocaleString()} / ${wordTarget.toLocaleString()}`
                : `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'}`}
            </button>
          )}
          <span className={`save-status${isSaving ? ' saving' : ''}`}>
            {isSaving ? 'Saving…' : 'Saved'}
          </span>

          <button className="fullscreen-btn" onClick={onToggleFullscreen} title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
            {fullscreen ? '⊠' : '⤢'}
          </button>

          <button
            className={`review-btn${reviewState === 'loading' || reviewState === 'streaming' ? ' reviewing' : ''}`}
            onClick={handleReview}
            disabled={reviewState === 'loading' || reviewState === 'streaming' || !scene?.content?.trim()}
          >
            {reviewState === 'loading' || reviewState === 'streaming' ? 'Reviewing…' : 'Review'}
          </button>

          <div className="export-menu" ref={exportMenuRef}>
            <button className="export-toggle" onClick={() => setShowExport((v) => !v)}>Export ▾</button>
            {showExport && (
              <div className="export-dropdown">
                <button onClick={() => { onExportScene(); setShowExport(false) }}>This scene (.txt)</button>
                <button onClick={() => { onExportAll(); setShowExport(false) }}>All scenes (.md)</button>
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
        ref={writingBodyRef}
        className={`writing-body${writingBg !== 'default' ? ` writing-bg-${writingBg}` : ''}`}
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
          <h1 className="scene-title-display" onClick={() => setEditingTitle(true)}>
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

        {/* Notes */}
        <details className="synopsis-details">
          <summary className="synopsis-summary">Notes</summary>
          <textarea
            className="synopsis-textarea notes-textarea"
            value={scene.notes || ''}
            onChange={(e) => onNotesChange(scene.id, e.target.value)}
            placeholder="Research, continuity reminders, things to fix…"
            rows={4}
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
          <div ref={feedbackRef} className={`review-panel${reviewState === 'error' ? ' review-error' : ''}`}>
            <div className="review-panel-header">
              <span className="review-panel-title">Editorial Notes</span>
              <button className="review-panel-close" onClick={() => { setReviewState('idle'); setFeedback('') }}>✕</button>
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
