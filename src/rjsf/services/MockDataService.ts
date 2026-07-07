import type { IDropdownOption } from '@fluentui/react/lib/Dropdown'
import type { EntitySearchConfig, IRecord } from './IDataService'
import { getCurrentMockStore } from '../mockStore'

export class MockDataService {
  async getRecord(config: EntitySearchConfig, id: string): Promise<IRecord> {
    const records = getCurrentMockStore().entities[config.endPoint] ?? []
    return records.find(r => r.key === id) ?? { key: id, name: `(${id})` }
  }

  async suggestEntity(config: EntitySearchConfig): Promise<IRecord[]> {
    return getCurrentMockStore().entities[config.endPoint] ?? []
  }

  async searchEntityConfig(config: EntitySearchConfig, filter: string): Promise<IRecord[]> {
    const records = getCurrentMockStore().entities[config.endPoint] ?? []
    if (!filter) return records
    const lc = filter.toLowerCase()
    return records.filter(r => r.name.toLowerCase().includes(lc))
  }

  async getOptionSetValues(_global: boolean, optionSetName: string): Promise<IDropdownOption[]> {
    return (getCurrentMockStore().optionSets[optionSetName] ?? []).map(o => ({
      key: o.key,
      text: o.text,
    }))
  }
}
