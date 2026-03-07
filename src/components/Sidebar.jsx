import OutlinePanel from './OutlinePanel'
import InboxPanel from './InboxPanel'

export default function Sidebar({
  sidebarTab,
  isOnline,
  totalWordCount,
  onSidebarTabChange,
  chapters,
  scenes,
  inboxItems,
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
  onAddInboxItem,
  onUpdateInboxItem,
  onDeleteInboxItem,
  onPromoteInboxItem,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="logo">Draft Punk</span>
        <span
          className={`status-dot ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'Online — syncing' : 'Offline — notes will sync when reconnected'}
        />
      </div>

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

      <div className="sidebar-content">
        {sidebarTab === 'outline' ? (
          <OutlinePanel
            chapters={chapters}
            scenes={scenes}
            selectedSceneId={selectedSceneId}
            onSelectScene={onSelectScene}
            onAddChapter={onAddChapter}
            onUpdateChapter={onUpdateChapter}
            onDeleteChapter={onDeleteChapter}
            onReorderChapter={onReorderChapter}
            onAddScene={onAddScene}
            onUpdateScene={onUpdateScene}
            onDeleteScene={onDeleteScene}
            onReorderScene={onReorderScene}
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

      <div className="sidebar-footer">
        <span className="word-count-total">
          {totalWordCount.toLocaleString()} words total
        </span>
      </div>
    </aside>
  )
}
