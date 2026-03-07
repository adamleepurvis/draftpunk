export default function SearchResults({ query, results, onSelectScene }) {
  if (!results) return null

  const total = results.scenes.length + results.inbox.length

  if (total === 0) {
    return (
      <div className="search-results">
        <p className="search-empty">No results for "{query}"</p>
      </div>
    )
  }

  return (
    <div className="search-results">
      {results.scenes.length > 0 && (
        <div className="search-section">
          <div className="search-section-label">
            Scenes <span className="search-count">{results.scenes.length}</span>
          </div>
          {results.scenes.map((scene) => (
            <button
              key={scene.id}
              className="search-result-item"
              onClick={() => onSelectScene(scene.id)}
            >
              <span className="search-result-title">{highlight(scene.title, query)}</span>
              {scene.chapterTitle && (
                <span className="search-result-meta">{scene.chapterTitle}</span>
              )}
              {scene.snippet && (
                <span className="search-result-snippet">{scene.snippet}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {results.inbox.length > 0 && (
        <div className="search-section">
          <div className="search-section-label">
            Inbox <span className="search-count">{results.inbox.length}</span>
          </div>
          {results.inbox.map((item) => (
            <div key={item.id} className="search-result-item no-click">
              <span className="search-result-snippet">
                {item.content.slice(0, 100)}{item.content.length > 100 ? '…' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function highlight(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
