const QUEUE_KEY = 'draftpunk_offline_queue'

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue()
  queue.push(item)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY)
}
