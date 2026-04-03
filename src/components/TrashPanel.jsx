export default function TrashPanel({ trashedChapters, trashedScenes, onRestore, onEmptyTrash }) {
  const isEmpty = trashedChapters.length === 0 && trashedScenes.length === 0

  // Scenes deleted alongside a chapter (within 2s) are grouped with it
  const items = [
    ...trashedChapters.map((c) => {
      const associated = trashedScenes.filter(
        (s) => s.chapter_id === c.id && Math.abs(new Date(s.deleted_at) - new Date(c.deleted_at)) < 2000
      )
      return { type: 'chapter', item: c, associated }
    }),
    ...trashedScenes
      .filter((s) => !trashedChapters.some(
        (c) => c.id === s.chapter_id && Math.abs(new Date(s.deleted_at) - new Date(c.deleted_at)) < 2000
      ))
      .map((s) => ({ type: 'scene', item: s, associated: [] })),
  ].sort((a, b) => new Date(b.item.deleted_at) - new Date(a.item.deleted_at))

  return (
    <div className="trash-panel">
      {!isEmpty && (
        <div className="trash-panel-actions">
          <button className="empty-trash-btn" onClick={onEmptyTrash}>Empty Trash</button>
        </div>
      )}
      {isEmpty ? (
        <div className="trash-empty">Trash is empty</div>
      ) : (
        <div className="trash-list">
          {items.map(({ type, item, associated }) => (
            <div key={item.id} className="trash-item">
              <div className="trash-item-info">
                <span className="trash-item-type">{type === 'chapter' ? 'Chapter' : 'Scene'}</span>
                <span className="trash-item-title">{item.title}</span>
                {associated.length > 0 && (
                  <span className="trash-item-sub">
                    +{associated.length} scene{associated.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button className="trash-restore-btn" onClick={() => onRestore(type, item.id)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
