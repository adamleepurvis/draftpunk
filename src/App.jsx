import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { getOfflineQueue, addToOfflineQueue, clearOfflineQueue } from './lib/offlineQueue'
import Sidebar from './components/Sidebar'
import WritingPanel from './components/WritingPanel'
import SettingsModal from './components/SettingsModal'
import LoginScreen from './components/LoginScreen'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined=loading, null=logged out
  const [chapters, setChapters] = useState([])
  const [scenes, setScenes] = useState([])
  const [inboxItems, setInboxItems] = useState([])
  const [selectedSceneId, setSelectedSceneId] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('outline')
  const [mobileView, setMobileView] = useState('sidebar')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('draftpunk_settings') || '{}') }
    catch { return {} }
  })
  const [wordTargets, setWordTargets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('draftpunk_word_targets') || '{}') }
    catch { return {} }
  })
  const [fullscreen, setFullscreen] = useState(false)

  // Refs
  const selectedSceneIdRef = useRef(null)
  const isDirtyRef = useRef(false)
  const saveTimeoutRef = useRef(null)
  const synopsisTimeoutRef = useRef(null)
  const notesTimeoutRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => { selectedSceneIdRef.current = selectedSceneId }, [selectedSceneId])

  // ── Auth ──────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Theme ─────────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [settings.theme])

  // Derived
  const selectedScene = scenes.find((s) => s.id === selectedSceneId) ?? null
  const totalWordCount = scenes.reduce((sum, scene) => {
    if (!scene.content?.trim()) return sum
    return sum + scene.content.trim().split(/\s+/).filter(Boolean).length
  }, 0)

  const searchResults = searchQuery.trim()
    ? {
        scenes: scenes
          .filter(
            (s) =>
              s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((s) => {
            const chapter = chapters.find((c) => c.id === s.chapter_id)
            const idx = s.content.toLowerCase().indexOf(searchQuery.toLowerCase())
            const snippet =
              idx !== -1
                ? '…' + s.content.slice(Math.max(0, idx - 30), idx + 60).trim() + '…'
                : null
            return { ...s, chapterTitle: chapter?.title, snippet }
          }),
        inbox: inboxItems.filter((i) =>
          i.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }
    : null

  // ── Settings ──────────────────────────────────────────────────

  function updateSetting(key, value) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem('draftpunk_settings', JSON.stringify(next))
  }

  function setWordTarget(sceneId, target) {
    const next = { ...wordTargets, [sceneId]: target }
    setWordTargets(next)
    localStorage.setItem('draftpunk_word_targets', JSON.stringify(next))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // ── Online / offline ──────────────────────────────────────────

  useEffect(() => {
    const handleOnline = async () => { setIsOnline(true); await flushOfflineQueue() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'f') { e.preventDefault(); searchInputRef.current?.focus() }
      if (mod && e.shiftKey && e.key === 'N') { e.preventDefault(); addChapter() }
      if (mod && e.key === 'e') { e.preventDefault(); exportAll() }
      if (e.key === 'Escape') {
        if (fullscreen) { setFullscreen(false) }
        else if (searchQuery) { setSearchQuery(''); searchInputRef.current?.blur() }
        else if (mobileView === 'writing') setMobileView('sidebar')
        else if (showSettings) setShowSettings(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, mobileView, showSettings, fullscreen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial load + realtime ───────────────────────────────────

  useEffect(() => {
    if (!session) return
    loadAll()
    const cleanup = setupRealtime()
    return cleanup
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    const [c, s, i] = await Promise.all([
      supabase.from('chapters').select('*').order('position'),
      supabase.from('scenes').select('*').order('position'),
      supabase.from('inbox').select('*').order('created_at', { ascending: false }),
    ])
    if (c.data) setChapters(c.data)
    if (s.data) setScenes(s.data)
    if (i.data) setInboxItems(i.data)
  }

  function setupRealtime() {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, (payload) => {
        setChapters((prev) => applyChange(prev, payload, 'position'))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scenes' }, (payload) => {
        setScenes((prev) => {
          if (
            payload.eventType === 'UPDATE' &&
            payload.new.id === selectedSceneIdRef.current &&
            isDirtyRef.current
          ) {
            return prev.map((s) =>
              s.id === payload.new.id ? { ...payload.new, content: s.content } : s
            )
          }
          return applyChange(prev, payload, 'position')
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox' }, (payload) => {
        setInboxItems((prev) => {
          const updated = applyChange(prev, payload, null)
          return [...updated].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  function applyChange(list, payload, sortField) {
    let updated
    if (payload.eventType === 'INSERT') {
      if (list.find((item) => item.id === payload.new.id)) return list
      updated = [...list, payload.new]
    } else if (payload.eventType === 'UPDATE') {
      updated = list.map((item) => (item.id === payload.new.id ? payload.new : item))
    } else if (payload.eventType === 'DELETE') {
      updated = list.filter((item) => item.id !== payload.old.id)
    } else {
      return list
    }
    if (sortField) updated = [...updated].sort((a, b) => a[sortField] - b[sortField])
    return updated
  }

  // ── Offline queue ─────────────────────────────────────────────

  async function flushOfflineQueue() {
    const queue = getOfflineQueue()
    if (queue.length === 0) return
    for (const item of queue) await supabase.from('inbox').insert(item)
    clearOfflineQueue()
    const { data } = await supabase.from('inbox').select('*').order('created_at', { ascending: false })
    if (data) setInboxItems(data)
  }

  // ── Export ────────────────────────────────────────────────────

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCurrentScene() {
    if (!selectedScene) return
    const chapter = chapters.find((c) => c.id === selectedScene.chapter_id)
    const text = `${chapter?.title || ''}\n${selectedScene.title}\n${'─'.repeat(40)}\n\n${selectedScene.content || ''}`
    downloadText(text, `${selectedScene.title.replace(/[^a-z0-9]/gi, '_')}.txt`)
  }

  function exportAll() {
    const sorted = [...chapters].sort((a, b) => a.position - b.position)
    const parts = sorted.flatMap((ch) => {
      const chScenes = scenes
        .filter((s) => s.chapter_id === ch.id)
        .sort((a, b) => a.position - b.position)
      return [`# ${ch.title}\n`, ...chScenes.map((s) => `## ${s.title}\n\n${s.content || ''}\n`)]
    })
    downloadText(parts.join('\n'), 'draft.md')
  }

  // ── Chapters ──────────────────────────────────────────────────

  async function addChapter() {
    const position = chapters.length
    const { data } = await supabase
      .from('chapters').insert({ title: 'New Chapter', position }).select().single()
    if (data) setChapters((prev) => [...prev, data])
  }

  async function updateChapter(id, updates) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    await supabase.from('chapters').update(updates).eq('id', id)
  }

  async function deleteChapter(id) {
    const deletedSceneIds = scenes.filter((s) => s.chapter_id === id).map((s) => s.id)
    await supabase.from('chapters').delete().eq('id', id)
    setChapters((prev) => prev.filter((c) => c.id !== id))
    setScenes((prev) => prev.filter((s) => s.chapter_id !== id))
    if (deletedSceneIds.includes(selectedSceneId)) { setSelectedSceneId(null); setMobileView('sidebar') }
  }

  async function reorderChapter(id, direction) {
    const sorted = [...chapters].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((c) => c.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const next = [...sorted]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    const updated = next.map((c, i) => ({ ...c, position: i }))
    setChapters(updated)
    await Promise.all(updated.map((c) => supabase.from('chapters').update({ position: c.position }).eq('id', c.id)))
  }

  async function reorderChaptersByIds(orderedIds) {
    const updated = chapters.map((c) => ({ ...c, position: orderedIds.indexOf(c.id) }))
    setChapters([...updated].sort((a, b) => a.position - b.position))
    await Promise.all(updated.map((c) => supabase.from('chapters').update({ position: c.position }).eq('id', c.id)))
  }

  // ── Scenes ────────────────────────────────────────────────────

  async function addScene(chapterId) {
    const position = scenes.filter((s) => s.chapter_id === chapterId).length
    const { data } = await supabase
      .from('scenes').insert({ chapter_id: chapterId, title: 'New Scene', content: '', position }).select().single()
    if (data) setScenes((prev) => [...prev, data])
  }

  async function updateScene(id, updates) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    await supabase.from('scenes').update(updates).eq('id', id)
  }

  async function deleteScene(id) {
    await supabase.from('scenes').delete().eq('id', id)
    setScenes((prev) => prev.filter((s) => s.id !== id))
    if (selectedSceneId === id) { setSelectedSceneId(null); setMobileView('sidebar') }
  }

  async function reorderScene(id, direction) {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) return
    const siblings = scenes.filter((s) => s.chapter_id === scene.chapter_id).sort((a, b) => a.position - b.position)
    const idx = siblings.findIndex((s) => s.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const next = [...siblings]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    const updatedSiblings = next.map((s, i) => ({ ...s, position: i }))
    setScenes((prev) => prev.map((s) => updatedSiblings.find((u) => u.id === s.id) ?? s))
    await Promise.all(updatedSiblings.map((s) => supabase.from('scenes').update({ position: s.position }).eq('id', s.id)))
  }

  async function reorderScenesByIds(chapterId, orderedIds) {
    setScenes((prev) =>
      prev.map((s) => s.chapter_id !== chapterId ? s : { ...s, position: orderedIds.indexOf(s.id) })
    )
    const toUpdate = scenes.filter((s) => s.chapter_id === chapterId)
    await Promise.all(
      toUpdate.map((s) => supabase.from('scenes').update({ position: orderedIds.indexOf(s.id) }).eq('id', s.id))
    )
  }

  function handleSceneContentChange(id, content) {
    isDirtyRef.current = true
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)))
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setIsSaving(true)
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from('scenes').update({ content }).eq('id', id)
      setIsSaving(false)
      isDirtyRef.current = false
    }, 1200)
  }

  function handleSynopsisChange(id, synopsis) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, synopsis } : s)))
    if (synopsisTimeoutRef.current) clearTimeout(synopsisTimeoutRef.current)
    synopsisTimeoutRef.current = setTimeout(async () => {
      await supabase.from('scenes').update({ synopsis }).eq('id', id)
    }, 1200)
  }

  function handleNotesChange(id, notes) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, notes } : s)))
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    notesTimeoutRef.current = setTimeout(async () => {
      await supabase.from('scenes').update({ notes }).eq('id', id)
    }, 1200)
  }

  // ── Inbox ─────────────────────────────────────────────────────

  async function addInboxItem(content, tags = [], photoFile = null) {
    let photoUrl = null
    if (photoFile && isOnline) {
      try { photoUrl = await uploadPhoto(photoFile) }
      catch (err) { console.error('Photo upload failed:', err) }
    }
    const item = { content, tags, photo_url: photoUrl, created_at: new Date().toISOString(), promoted: false }
    if (!isOnline) {
      addToOfflineQueue(item)
      setInboxItems((prev) => [{ ...item, id: `offline-${Date.now()}` }, ...prev])
      return
    }
    const { data } = await supabase.from('inbox').insert(item).select().single()
    if (data) setInboxItems((prev) => [data, ...prev])
  }

  async function updateInboxItem(id, updates) {
    setInboxItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)))
    if (!String(id).startsWith('offline-')) await supabase.from('inbox').update(updates).eq('id', id)
  }

  async function deleteInboxItem(id) {
    setInboxItems((prev) => prev.filter((i) => i.id !== id))
    if (!String(id).startsWith('offline-')) await supabase.from('inbox').delete().eq('id', id)
  }

  async function promoteInboxItem(inboxItem, chapterId) {
    const position = scenes.filter((s) => s.chapter_id === chapterId).length
    const title = inboxItem.content.replace(/\n/g, ' ').slice(0, 60).trim()
    const { data } = await supabase
      .from('scenes').insert({ chapter_id: chapterId, title, content: inboxItem.content, position }).select().single()
    if (data) setScenes((prev) => [...prev, data])
    await updateInboxItem(inboxItem.id, { promoted: true })
  }

  async function uploadPhoto(file) {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('inbox-photos').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('inbox-photos').getPublicUrl(path)
    return data.publicUrl
  }

  // ── Navigation ────────────────────────────────────────────────

  function selectScene(sceneId) {
    setSelectedSceneId(sceneId)
    setMobileView('writing')
    setSearchQuery('')
  }

  // ── Render ────────────────────────────────────────────────────

  if (session === undefined) return <div className="app-loading"><span>Loading…</span></div>
  if (!session) return <LoginScreen />

  return (
    <div className={`app${mobileView === 'writing' ? ' mobile-writing' : ''}${fullscreen ? ' fullscreen' : ''}`}>
      <Sidebar
        chapters={chapters}
        scenes={scenes}
        inboxItems={inboxItems}
        selectedSceneId={selectedSceneId}
        sidebarTab={sidebarTab}
        isOnline={isOnline}
        totalWordCount={totalWordCount}
        settings={settings}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchInputRef={searchInputRef}
        onSidebarTabChange={setSidebarTab}
        onSelectScene={selectScene}
        onSearchChange={setSearchQuery}
        onShowSettings={() => setShowSettings(true)}
        onSignOut={signOut}
        onAddChapter={addChapter}
        onUpdateChapter={updateChapter}
        onDeleteChapter={deleteChapter}
        onReorderChapter={reorderChapter}
        onReorderChaptersByIds={reorderChaptersByIds}
        onAddScene={addScene}
        onUpdateScene={updateScene}
        onDeleteScene={deleteScene}
        onReorderScene={reorderScene}
        onReorderScenesByIds={reorderScenesByIds}
        onAddInboxItem={addInboxItem}
        onUpdateInboxItem={updateInboxItem}
        onDeleteInboxItem={deleteInboxItem}
        onPromoteInboxItem={promoteInboxItem}
      />
      <WritingPanel
        scene={selectedScene}
        isSaving={isSaving}
        settings={settings}
        wordTarget={selectedSceneId ? (wordTargets[selectedSceneId] ?? 0) : 0}
        onSetWordTarget={(target) => selectedSceneId && setWordTarget(selectedSceneId, target)}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
        onBack={() => setMobileView('sidebar')}
        onContentChange={handleSceneContentChange}
        onSynopsisChange={handleSynopsisChange}
        onNotesChange={handleNotesChange}
        onTitleChange={(id, title) => updateScene(id, { title })}
        onStatusChange={(id, status) => updateScene(id, { status })}
        onExportScene={exportCurrentScene}
        onExportAll={exportAll}
      />
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdate={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
