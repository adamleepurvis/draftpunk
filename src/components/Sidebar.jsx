import OutlinePanel from './OutlinePanel'
import InboxPanel from './InboxPanel'
import SearchResults from './SearchResults'

export default function Sidebar({
  sidebarTab, isOnline, totalWordCount, settings,
  searchQuery, searchResults, searchInputRef,
  onSidebarTabChange, onSelectScene, onSearchChange, onShowSettings, onSignOut,
  chapters, scenes, inboxItems, selectedSceneId,
  onAddChapter, onUpdateChapter, onDeleteChapter, onReorderChapter, onReorderChaptersByIds,
  onAddScene, onUpdateScene, onDeleteScene, onReorderScene, onReorderScenesByIds,
  onAddInboxItem, onUpdateInboxItem, onDeleteInboxItem, onPromoteInboxItem,
}) {
  const goal = settings?.wordCountGoal || 0
  const progress = goal > 0 ? Math.min(100, Math.round((totalWordCount / goal) * 100)) : 0

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span className="logo">Draft Punk</span>
        <div className="sidebar-header-right">
          <span
            className={`status-dot ${isOnline ? 'online' : 'offline'}`}
            title={isOnline ? 'Online — syncing' : 'Offline — notes will sync when reconnected'}
          />
          <button className="settings-btn" onClick={onShowSettings} title="Settings">⚙</button>
          <button className="signout-btn" onClick={onSignOut} title="Sign out">→</button>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          ref={searchInputRef}
          className="search-input"
          placeholder="Search… (⌘F)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => onSearchChange('')} title="Clear">✕</button>
        )}
      </div>

      {/* Tabs — hidden during search */}
      {!searchQuery && (
        <div className="sidebar-tabs">
          <button
            className={`tab-btn${sidebarTab === 'outline' ? ' active' : ''}`}
            onClick={() => onSidebarTabChange('outline')}
          >
            Outline
          </button>
          <button
            className={`tab-btn${sidebarTab === 'inbox' ? ' active' : ''}`}
            onClick={() => onSidebarTabChange('inbox')}
          >
            Inbox
          </button>
        </div>
      )}

      {/* Content */}
      <div className="sidebar-content">
        {searchQuery ? (
          <SearchResults query={searchQuery} results={searchResults} onSelectScene={onSelectScene} />
        ) : sidebarTab === 'outline' ? (
          <OutlinePanel
            chapters={chapters}
            scenes={scenes}
            selectedSceneId={selectedSceneId}
            onSelectScene={onSelectScene}
            onAddChapter={onAddChapter}
            onUpdateChapter={onUpdateChapter}
            onDeleteChapter={onDeleteChapter}
            onReorderChapter={onReorderChapter}
            onReorderChaptersByIds={onReorderChaptersByIds}
            onAddScene={onAddScene}
            onUpdateScene={onUpdateScene}
            onDeleteScene={onDeleteScene}
            onReorderScene={onReorderScene}
            onReorderScenesByIds={onReorderScenesByIds}
          />
        ) : (
          <InboxPanel
            inboxItems={inboxItems}
            chapters={chapters}
            isOnline={isOnline}
            onAddInboxItem={onAddInboxItem}
            onUpdateInboxItem={onUpdateInboxItem}
            onDeleteInboxItem={onDeleteInboxItem}
            onPromoteInboxItem={onPromoteInboxItem}
          />
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {goal > 0 ? (
          <div className="goal-section">
            <div className="goal-bar-track">
              <div className="goal-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="goal-label">
              {totalWordCount.toLocaleString()} / {goal.toLocaleString()} words ({progress}%)
            </span>
          </div>
        ) : (
          <span className="word-count-total">{totalWordCount.toLocaleString()} words total</span>
        )}
      </div>
    </aside>
  )
}
