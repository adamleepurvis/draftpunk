import { useState } from 'react'

export default function OutlinePanel({
  chapters,
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddChapter,
  onUpdateChapter,
  onDeleteChapter,
  onReorderChapter,
  onAddScene,
  onUpdateScene,
  onDeleteScene,
  onReorderScene,
}) {
  const [expanded, setExpanded] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')

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

  function toggleChapter(id) {
    setExpanded((prev) => ({ ...prev, [id]: !isExpanded(id) }))
  }

  function isExpanded(id) {
    return expanded[id] !== false // default: expanded
  }

  function confirmDeleteChapter(id, title) {
    if (window.confirm(`Delete "${title}" and all its scenes? This cannot be undone.`)) {
      onDeleteChapter(id)
    }
  }

  function confirmDeleteScene(id, title) {
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      onDeleteScene(id)
    }
  }

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
        <button className="add-chapter-btn" onClick={onAddChapter}>
          + Chapter
        </button>
      </div>

      {sortedChapters.map((chapter, ci) => {
        const chapterScenes = scenes
          .filter((s) => s.chapter_id === chapter.id)
          .sort((a, b) => a.position - b.position)
        const open = isExpanded(chapter.id)

        return (
          <div key={chapter.id} className="chapter-block">
            {/* Chapter header row */}
            <div className="chapter-header group">
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
                <button
                  onClick={(e) => { e.stopPropagation(); onReorderChapter(chapter.id, 'up') }}
                  disabled={ci === 0}
                  title="Move up"
                  aria-label="Move chapter up"
                >
                  ↑
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReorderChapter(chapter.id, 'down') }}
                  disabled={ci === sortedChapters.length - 1}
                  title="Move down"
                  aria-label="Move chapter down"
                >
                  ↓
                </button>
                <button
                  onClick={(e) => startEdit(chapter.id, chapter.title, e)}
                  title="Rename"
                  aria-label="Rename chapter"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); confirmDeleteChapter(chapter.id, chapter.title) }}
                  className="danger"
                  title="Delete chapter"
                  aria-label="Delete chapter"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scenes list */}
            {open && (
              <div className="scenes-list">
                {chapterScenes.map((scene, si) => (
                  <div
                    key={scene.id}
                    className={`scene-row group${selectedSceneId === scene.id ? ' active' : ''}`}
                  >
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
                      <button
                        onClick={(e) => { e.stopPropagation(); onReorderScene(scene.id, 'up') }}
                        disabled={si === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onReorderScene(scene.id, 'down') }}
                        disabled={si === chapterScenes.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => startEdit(scene.id, scene.title, e)}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); confirmDeleteScene(scene.id, scene.title) }}
                        className="danger"
                        title="Delete scene"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  className="add-scene-btn"
                  onClick={() => onAddScene(chapter.id)}
                >
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
