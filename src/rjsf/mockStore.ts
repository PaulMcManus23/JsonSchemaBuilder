export interface MockStore {
  entities: Record<string, Array<{ key: string; name: string }>>
  optionSets: Record<string, Array<{ key: string; text: string }>>
}

const STORAGE_KEY = 'jsb_mocks'

function fromStorage(): MockStore {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) {
      const p = JSON.parse(v) as Partial<MockStore>
      return { entities: p.entities ?? {}, optionSets: p.optionSets ?? {} }
    }
  } catch {}
  return { entities: {}, optionSets: {} }
}

let _store: MockStore = fromStorage()

export function getCurrentMockStore(): MockStore {
  return _store
}

export function updateMockStore(store: MockStore): void {
  _store = { entities: store.entities ?? {}, optionSets: store.optionSets ?? {} }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_store))
  } catch {}
}
