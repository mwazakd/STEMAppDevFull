import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface ExperimentData {
  id: string
  name: string
  timestamp: number
  titrationPoints: Array<{
    volumeAdded: number
    pH: number
    timestamp: number
  }>
  finalState: {
    volumeL: number
    moles: Record<string, number>
    temperature: number
  }
  settings: {
    initialVolume: number
    dropletVolume: number
    species: string
    concentration: number
  }
}

interface TitrationDBSchema extends DBSchema {
  experiments: {
    key: string
    value: ExperimentData
  }
  settings: {
    key: string
    value: any
  }
}

export class TitrationDB {
  private dbPromise: Promise<IDBPDatabase<TitrationDBSchema>>

  constructor() {
    this.dbPromise = openDB<TitrationDBSchema>('titration-db', 1, {
      upgrade(db) {
        db.createObjectStore('experiments', { keyPath: 'id' })
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    })
  }

  async saveExperiment(experiment: ExperimentData): Promise<void> {
    const db = await this.dbPromise
    await db.put('experiments', experiment)
  }

  async getExperiment(id: string): Promise<ExperimentData | undefined> {
    const db = await this.dbPromise
    return await db.get('experiments', id)
  }

  async getAllExperiments(): Promise<ExperimentData[]> {
    const db = await this.dbPromise
    return await db.getAll('experiments')
  }

  async deleteExperiment(id: string): Promise<void> {
    const db = await this.dbPromise
    await db.delete('experiments', id)
  }

  async saveSettings(key: string, value: any): Promise<void> {
    const db = await this.dbPromise
    await db.put('settings', { key, value })
  }

  async getSettings(key: string): Promise<any> {
    const db = await this.dbPromise
    const result = await db.get('settings', key)
    return result?.value
  }

  async exportExperiment(id: string): Promise<string> {
    const experiment = await this.getExperiment(id)
    if (!experiment) {
      throw new Error('Experiment not found')
    }
    return JSON.stringify(experiment, null, 2)
  }

  async importExperiment(jsonData: string): Promise<string> {
    const experiment = JSON.parse(jsonData) as ExperimentData
    experiment.id = this.generateId()
    experiment.timestamp = Date.now()
    await this.saveExperiment(experiment)
    return experiment.id
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  async clearAllData(): Promise<void> {
    const db = await this.dbPromise
    await db.clear('experiments')
    await db.clear('settings')
  }

  async getStorageSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return estimate.usage || 0
    }
    return 0
  }
}
