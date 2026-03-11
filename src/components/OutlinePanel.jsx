import { useState, useRef, useEffect } from 'react'

const LABEL_COLORS = [
  { key: 'red',    hex: '#cc0000' },
  { key: 'orange', hex: '#d46b00' },
  { key: 'yellow', hex: '#b8930a' },
  { key: 'green',  hex: '#2d7a3a' },
  { key: 'teal',   hex: '#0e7a7a' },
  { key: 'blue',   hex: '#1a5fb4' },
  { key: 'purple', hex: '#7040b0' },
]

const STATUS_CYCLE = [null, 'draft', 'revised', 'final']
const STATUS_META = {
  draft:   { label: 'Draft',   color: '#8e8e98' },
  revised: { label: 'Revised', color: '#d46b00' },
  final:   { label: 'Final',   color: '#2d7a3a' },
}

function cycleStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current ?? null)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

// Stop mousedown from reaching a draggable parent (prevents drag-on-click)
function blockDrag(e) { e.stopPropagation() }

export default function OutlinePanel({
  chapters, scenes, selectedSceneId,
  onSelectScene, onAddChapter,
  onUpdateChapter, onDeleteChapter, onReorderChapter, onReorderChaptersByIds,
  onAddScene, onUpdateScene, onDeleteScene, onReorderScene, onReorderScenesByIds,
}) {
  const [expanded, setExpanded] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [dragOverId, setDragOverId] = useState(null)
  const [colorPickerFor, setColorPickerFor] = useState(null)
  const dragItemRef = useRef(null)
  const colorPickerRef = useRef(null)

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerFor) return
    function handleClick(e) {
      if (!colorPickerRef.current?.contains(e.target)) setColorPickerFor(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [colorPickerFor])

  // ── Editing ───────────────────────────────────────────────────

  function startEdit(id, currentTitle, e) {
    e?.stopPropagation()
    setEditingId(id)
    setEditingValue(currentTitle)
  }

  function commitEdit(type, id) {
    const trimmed = editingValue.trim()
    if (trimmed) {
      if (type === 'chapter') onUpdateChapter(id, { title: trimmed })
      else onUpdateScene(id, { title: trimmed })
    }
    setEditingId(null)
  }

  function handleEditKeyDown(e, type, id) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(type, id) }
    if (e.key === 'Escape') setEditingId(null)
  }

  // ── Expand/collapse ───────────────────────────────────────────

  function toggleChapter(id) {
    setExpanded((prev) => ({ ...prev, [id]: !isExpanded(id) }))
  }
  function isExpanded(id) { return expanded[id] !== false }

  // ── Delete confirmations ──────────────────────────────────────

  function confirmDeleteChapter(id, title) {
    if (window.confirm(`Delete "${title}" and all its scenes? This cannot be undone.`)) onDeleteChapter(id)
  }
  function confirmDeleteScene(id, title) {
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) onDeleteScene(id)
  }

  // ── Color picker ─────────────────────────────────────────────

  function handleColorClick(e, id, type) {
    e.stopPropagation()
    setColorPickerFor((prev) => (prev?.id === id ? null : { id, type }))
  }

  function setColor(id, type, colorKey) {
    if (type === 'chapter') onUpdateChapter(id, { color: colorKey })
    else onUpdateScene(id, { color: colorKey })
    setColorPickerFor(null)
  }

  // ── Status ────────────────────────────────────────────────────

  function handleStatusClick(e, scene) {
    e.stopPropagation()
    onUpdateScene(scene.id, { status: cycleStatus(scene.status) })
  }

  // ── Drag and drop ─────────────────────────────────────────────

  function handleChapterDragStart(e, id) {
    dragItemRef.current = { type: 'chapter', id, chapterId: null }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function handleSceneDragStart(e, id, chapterId) {
    e.stopPropagation() // prevent bubbling to chapter-block's dragStart
    dragItemRef.current = { type: 'scene', id, chapterId }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function handleChapterDragOver(e, id) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragItemRef.current?.type === 'chapter') setDragOverId(id)
  }

  function handleSceneDragOver(e, id) {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragItemRef.current?.type === 'scene') setDragOverId(id)
  }

  function handleDragLeave(e) {
    // Only clear if leaving to outside this element (not into a child)
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null)
  }

  function handleChapterDrop(e, targetId) {
    e.preventDefault()
    setDragOverId(null)
    const drag = dragItemRef.current
    if (!drag || drag.type !== 'chapter' || drag.id === targetId) return
    const sorted = [...chapters].sort((a, b) => a.position - b.position)
    const fromIdx = sorted.findIndex((c) => c.id === drag.id)
    const toIdx = sorted.findIndex((c) => c.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...sorted]
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    onReorderChaptersByIds(newOrder.map((c) => c.id))
    dragItemRef.current = null
  }

  function handleSceneDrop(e, targetId, chapterId) {
    e.stopPropagation()
    e.preventDefault()
    setDragOverId(null)
    const drag = dragItemRef.current
    if (!drag || drag.type !== 'scene' || drag.id === targetId || drag.chapterId !== chapterId) return
    const siblings = scenes
      .filter((s) => s.chapter_id === chapterId)
      .sort((a, b) => a.position - b.position)
    const fromIdx = siblings.findIndex((s) => s.id === drag.id)
    const toIdx = siblings.findIndex((s) => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...siblings]
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    onReorderScenesByIds(chapterId, newOrder.map((s) => s.id))
    dragItemRef.current = null
  }

  function handleDragEnd() {
    dragItemRef.current = null
    setDragOverId(null)
  }

  // ── Render ────────────────────────────────────────────────────

  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position)

  if (sortedChapters.length === 0) {
    return (
      <div className="outline-panel">
        <div className="outline-empty">
          <p>No chapters yet.</p>
          <button className="add-chapter-btn" onClick={onAddChapter}>
            + Add your first chapter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="outline-panel">
      <div className="outline-top">
        <button className="add-chapter-btn" onClick={onAddChapter}>+ Chapter</button>
      </div>

      {sortedChapters.map((chapter, ci) => {
        const chapterScenes = scenes
          .filter((s) => s.chapter_id === chapter.id)
          .sort((a, b) => a.position - b.position)
        const open = isExpanded(chapter.id)
        const isDragOver = dragOverId === chapter.id
        const chapterColor = chapter.color ? LABEL_COLORS.find((c) => c.key === chapter.color)?.hex : null
        const isPickingChapterColor = colorPickerFor?.id === chapter.id

        return (
          <div
            key={chapter.id}
            className={`chapter-block${isDragOver ? ' drag-over' : ''}`}
            style={chapterColor ? { borderLeft: `3px solid ${chapterColor}` } : {}}
            draggable
            onDragStart={(e) => handleChapterDragStart(e, chapter.id)}
            onDragOver={(e) => handleChapterDragOver(e, chapter.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleChapterDrop(e, chapter.id)}
            onDragEnd={handleDragEnd}
          >
            {/* Chapter header */}
            <div className="chapter-header">
              <span className="drag-handle">⠿</span>
              <button
                className="expand-btn"
                onClick={() => toggleChapter(chapter.id)}
                aria-label={open ? 'Collapse' : 'Expand'}
              >
                {open ? '▾' : '▸'}
              </button>

              {chapterColor && <span className="color-dot" style={{ color: chapterColor }}>⬤</span>}

              {editingId === chapter.id ? (
                <input
                  className="rename-input"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => commitEdit('chapter', chapter.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, 'chapter', chapter.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="chapter-title"
                  onDoubleClick={(e) => startEdit(chapter.id, chapter.title, e)}
                >
                  {chapter.title}
                </span>
              )}

              {/* Action buttons — block mousedown from reaching draggable parent */}
              <div className="item-actions" onMouseDown={blockDrag}>
                <button data-tip="Color" className="color-btn" onClick={(e) => handleColorClick(e, chapter.id, 'chapter')} style={chapterColor ? { color: chapterColor } : {}}>●</button>
                <button data-tip="Move up" onClick={(e) => { e.stopPropagation(); onReorderChapter(chapter.id, 'up') }} disabled={ci === 0}>↑</button>
                <button data-tip="Move down" onClick={(e) => { e.stopPropagation(); onReorderChapter(chapter.id, 'down') }} disabled={ci === sortedChapters.length - 1}>↓</button>
                <button data-tip="Rename" onClick={(e) => startEdit(chapter.id, chapter.title, e)}>✎</button>
                <button data-tip="Delete" onClick={(e) => { e.stopPropagation(); confirmDeleteChapter(chapter.id, chapter.title) }} className="danger">✕</button>
              </div>
            </div>

            {/* Chapter color picker */}
            {isPickingChapterColor && (
              <div className="color-picker" ref={colorPickerRef} onMouseDown={blockDrag}>
                {LABEL_COLORS.map(({ key, hex }) => (
                  <button
                    key={key}
                    className={`color-swatch${chapter.color === key ? ' active' : ''}`}
                    style={{ background: hex }}
                    onClick={(e) => { e.stopPropagation(); setColor(chapter.id, 'chapter', key) }}
                  />
                ))}
                <button
                  className="color-swatch color-none"
                  onClick={(e) => { e.stopPropagation(); setColor(chapter.id, 'chapter', null) }}
                >✕</button>
              </div>
            )}

            {/* Scenes */}
            {open && (
              <div className="scenes-list">
                {chapterScenes.map((scene, si) => {
                  const isSceneDragOver = dragOverId === scene.id
                  const sceneColor = scene.color ? LABEL_COLORS.find((c) => c.key === scene.color)?.hex : null
                  const statusMeta = scene.status ? STATUS_META[scene.status] : null
                  const isPickingSceneColor = colorPickerFor?.id === scene.id

                  return (
                    <div key={scene.id}>
                      <div
                        className={`scene-row${selectedSceneId === scene.id ? ' active' : ''}${isSceneDragOver ? ' drag-over' : ''}`}
                        style={sceneColor ? { borderLeft: `3px solid ${sceneColor}` } : {}}
                        draggable
                        onDragStart={(e) => handleSceneDragStart(e, scene.id, chapter.id)}
                        onDragOver={(e) => handleSceneDragOver(e, scene.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleSceneDrop(e, scene.id, chapter.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <span className="drag-handle">⠿</span>

                        {sceneColor && <span className="color-dot" style={{ color: sceneColor }}>⬤</span>}

                        {editingId === scene.id ? (
                          <input
                            className="rename-input"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => commitEdit('scene', scene.id)}
                            onKeyDown={(e) => handleEditKeyDown(e, 'scene', scene.id)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="scene-title"
                            onClick={() => onSelectScene(scene.id)}
                            onDoubleClick={(e) => startEdit(scene.id, scene.title, e)}
                          >
                            {scene.title}
                          </span>
                        )}

                        {statusMeta && (
                          <button
                            className="status-pill"
                            style={{ color: statusMeta.color, borderColor: statusMeta.color }}
                            onMouseDown={blockDrag}
                            onClick={(e) => handleStatusClick(e, scene)}
                            data-tip="Cycle status"
                          >
                            {statusMeta.label}
                          </button>
                        )}

                        {/* Action buttons — block mousedown from reaching draggable parent */}
                        <div className="item-actions" onMouseDown={blockDrag}>
                          {!statusMeta && (
                            <button data-tip="Set status" className="status-add-btn" onClick={(e) => handleStatusClick(e, scene)}>◎</button>
                          )}
                          <button data-tip="Color" className="color-btn" onClick={(e) => handleColorClick(e, scene.id, 'scene')} style={sceneColor ? { color: sceneColor } : {}}>●</button>
                          <button data-tip="Move up" onClick={(e) => { e.stopPropagation(); onReorderScene(scene.id, 'up') }} disabled={si === 0}>↑</button>
                          <button data-tip="Move down" onClick={(e) => { e.stopPropagation(); onReorderScene(scene.id, 'down') }} disabled={si === chapterScenes.length - 1}>↓</button>
                          <button data-tip="Rename" onClick={(e) => startEdit(scene.id, scene.title, e)}>✎</button>
                          <button data-tip="Delete" onClick={(e) => { e.stopPropagation(); confirmDeleteScene(scene.id, scene.title) }} className="danger">✕</button>
                        </div>
                      </div>

                      {/* Scene color picker */}
                      {isPickingSceneColor && (
                        <div className="color-picker" ref={colorPickerRef} onMouseDown={blockDrag}>
                          {LABEL_COLORS.map(({ key, hex }) => (
                            <button
                              key={key}
                              className={`color-swatch${scene.color === key ? ' active' : ''}`}
                              style={{ background: hex }}
                              onClick={(e) => { e.stopPropagation(); setColor(scene.id, 'scene', key) }}
                            />
                          ))}
                          <button
                            className="color-swatch color-none"
                            onClick={(e) => { e.stopPropagation(); setColor(scene.id, 'scene', null) }}
                          >✕</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                <button className="add-scene-btn" onClick={() => onAddScene(chapter.id)}>
                  + Scene
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
