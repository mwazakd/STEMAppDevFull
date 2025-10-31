export type Species = 'HCl' | 'NaOH' | 'Acetic' | 'NH3'

export interface SolutionState {
  volumeL: number
  moles: Record<string, number>
  temperature: number // in Kelvin
}

export interface TitrationPoint {
  volumeAdded: number
  pH: number
  timestamp: number
}

export class ChemistryEngine {
  private state: SolutionState
  private titrationPoints: TitrationPoint[]
  private dropletVolume: number = 0.0001 // 0.1 mL in liters

  constructor(initialVolume: number = 0.1) {
    this.state = {
      volumeL: initialVolume,
      moles: {},
      temperature: 298.15 // 25°C
    }
    this.titrationPoints = []
  }

  addDroplet(species: Species, concentrationM: number): void {
    const moles = concentrationM * this.dropletVolume
    this.state.moles[species] = (this.state.moles[species] || 0) + moles
    this.state.volumeL += this.dropletVolume

    const pH = this.computePH()
    this.titrationPoints.push({
      volumeAdded: this.state.volumeL - 0.1, // subtract initial volume
      pH,
      timestamp: Date.now()
    })
  }

  computePH(): number {
    const { moles, volumeL } = this.state
    
    // Strong acid/base calculations
    const molesH = (moles['HCl'] || 0)
    const molesOH = (moles['NaOH'] || 0)
    
    if (molesH + molesOH === 0) {
      return 7.0 // neutral
    }

    if (molesH >= molesOH) {
      // Acidic solution
      const excessH = molesH - molesOH
      const concH = excessH / volumeL
      return -Math.log10(Math.max(concH, 1e-14))
    } else {
      // Basic solution
      const excessOH = molesOH - molesH
      const concOH = excessOH / volumeL
      const concH = 1e-14 / concOH
      return -Math.log10(Math.max(concH, 1e-14))
    }
  }

  getIndicatorColor(pH: number): { r: number; g: number; b: number; a: number } {
    // Phenolphthalein: colorless < 8.2, pink > 10
    if (pH < 8.2) {
      return { r: 1, g: 1, b: 1, a: 0.3 } // transparent/colorless
    }
    if (pH > 10) {
      return { r: 1, g: 0.2, b: 0.6, a: 0.8 } // pink
    }
    
    // Transition between 8.2 and 10
    const t = (pH - 8.2) / (10 - 8.2)
    return {
      r: 1,
      g: 1 - 0.8 * t,
      b: 1 - 0.4 * t,
      a: 0.3 + 0.5 * t
    }
  }

  getCurrentState(): SolutionState {
    return { ...this.state }
  }

  getTitrationPoints(): TitrationPoint[] {
    return [...this.titrationPoints]
  }

  getCurrentPH(): number {
    return this.computePH()
  }

  reset(): void {
    this.state = {
      volumeL: 0.1,
      moles: {},
      temperature: 298.15
    }
    this.titrationPoints = []
  }

  setDropletVolume(volume: number): void {
    this.dropletVolume = volume
  }

  getVolumeHeight(beakerRadius: number): number {
    // Calculate height based on volume and beaker geometry
    const height = this.state.volumeL / (Math.PI * beakerRadius * beakerRadius)
    return Math.max(0, height)
  }
}
