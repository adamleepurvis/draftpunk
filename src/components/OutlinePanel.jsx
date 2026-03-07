import { useState, useRef } from 'react'

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
  const dragItemRef = useRef(null)

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

  // ── Drag and drop ─────────────────────────────────────────────

  function handleDragStart(e, type, id, chapterId = null) {
    dragItemRef.current = { type, id, chapterId }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function handleDragOver(e, id) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }

  function handleDragLeave() {
    setDragOverId(null)
  }

  function handleDrop(e, targetId, targetChapterId = null) {
    e.preventDefault()
    setDragOverId(null)
    const drag = dragItemRef.current
    if (!drag || drag.id === targetId) return

    if (drag.type === 'chapter') {
      const sorted = [...chapters].sort((a, b) => a.position - b.position)
      const fromIdx = sorted.findIndex((c) => c.id === drag.id)
      const toIdx = sorted.findIndex((c) => c.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return
      const newOrder = [...sorted]
      const [moved] = newOrder.splice(fromIdx, 1)
      newOrder.splice(toIdx, 0, moved)
      onReorderChaptersByIds(newOrder.map((c) => c.id))
    } else if (drag.type === 'scene' && drag.chapterId === targetChapterId) {
      const siblings = scenes
        .filter((s) => s.chapter_id === drag.chapterId)
        .sort((a, b) => a.position - b.position)
      const fromIdx = siblings.findIndex((s) => s.id === drag.id)
      const toIdx = siblings.findIndex((s) => s.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return
      const newOrder = [...siblings]
      const [moved] = newOrder.splice(fromIdx, 1)
      newOrder.splice(toIdx, 0, moved)
      onReorderScenesByIds(drag.chapterId, newOrder.map((s) => s.id))
    }

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

        return (
          <div
            key={chapter.id}
            className={`chapter-block${isDragOver ? ' drag-over' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, 'chapter', chapter.id)}
            onDragOver={(e) => handleDragOver(e, chapter.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, chapter.id)}
            onDragEnd={handleDragEnd}
          >
            {/* Chapter header */}
            <div className="chapter-header">
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <button
                className="expand-btn"
                onClick={() => toggleChapter(chapter.id)}
                aria-label={open ? 'Collapse' : 'Expand'}
              >
                {open ? '▾' : '▸'}
              </button>

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
                  title="Double-click to rename"
                >
                  {chapter.title}
                </span>
              )}

              <div className="item-actions">
                <button onClick={(e) => { e.stopPropagation(); onReorderChapter(chapter.id, 'up') }} disabled={ci === 0} title="Move up">↑</button>
                <button onClick={(e) => { e.stopPropagation(); onReorderChapter(chapter.id, 'down') }} disabled={ci === sortedChapters.length - 1} title="Move down">↓</button>
                <button onClick={(e) => startEdit(chapter.id, chapter.title, e)} title="Rename">✎</button>
                <button onClick={(e) => { e.stopPropagation(); confirmDeleteChapter(chapter.id, chapter.title) }} className="danger" title="Delete">✕</button>
              </div>
            </div>

            {/* Scenes */}
            {open && (
              <div className="scenes-list">
                {chapterScenes.map((scene, si) => {
                  const isSceneDragOver = dragOverId === scene.id
                  return (
                    <div
                      key={scene.id}
                      className={`scene-row${selectedSceneId === scene.id ? ' active' : ''}${isSceneDragOver ? ' drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'scene', scene.id, chapter.id)}
                      onDragOver={(e) => handleDragOver(e, scene.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, scene.id, chapter.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <span className="drag-handle" title="Drag to reorder">⠿</span>

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
                          title="Click to open · Double-click to rename"
                        >
                          {scene.title}
                        </span>
                      )}

                      <div className="item-actions">
                        <button onClick={(e) => { e.stopPropagation(); onReorderScene(scene.id, 'up') }} disabled={si === 0} title="Move up">↑</button>
                        <button onClick={(e) => { e.stopPropagation(); onReorderScene(scene.id, 'down') }} disabled={si === chapterScenes.length - 1} title="Move down">↓</button>
                        <button onClick={(e) => startEdit(scene.id, scene.title, e)} title="Rename">✎</button>
                        <button onClick={(e) => { e.stopPropagation(); confirmDeleteScene(scene.id, scene.title) }} className="danger" title="Delete">✕</button>
                      </div>
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
