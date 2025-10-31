export interface IndicatorColor {
  r: number
  g: number
  b: number
  a: number
}

export function getIndicatorColor(pH: number, indicatorType: 'phenolphthalein' | 'methylOrange' | 'bromothymolBlue' = 'phenolphthalein'): IndicatorColor {
  switch (indicatorType) {
    case 'phenolphthalein':
      return getPhenolphthaleinColor(pH)
    case 'methylOrange':
      return getMethylOrangeColor(pH)
    case 'bromothymolBlue':
      return getBromothymolBlueColor(pH)
    default:
      return getPhenolphthaleinColor(pH)
  }
}

function getPhenolphthaleinColor(pH: number): IndicatorColor {
  // Phenolphthalein: colorless < 8.2, pink > 10
  if (pH < 8.2) {
    return { r: 1, g: 1, b: 1, a: 0.2 } // colorless/transparent
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
    a: 0.2 + 0.6 * t
  }
}

function getMethylOrangeColor(pH: number): IndicatorColor {
  // Methyl orange: red < 3.1, yellow > 4.4
  if (pH < 3.1) {
    return { r: 1, g: 0.2, b: 0.2, a: 0.8 } // red
  }
  if (pH > 4.4) {
    return { r: 1, g: 1, b: 0.2, a: 0.8 } // yellow
  }
  
  // Transition between 3.1 and 4.4
  const t = (pH - 3.1) / (4.4 - 3.1)
  return {
    r: 1,
    g: 0.2 + 0.8 * t,
    b: 0.2,
    a: 0.8
  }
}

function getBromothymolBlueColor(pH: number): IndicatorColor {
  // Bromothymol blue: yellow < 6.0, blue > 7.6
  if (pH < 6.0) {
    return { r: 1, g: 1, b: 0.2, a: 0.8 } // yellow
  }
  if (pH > 7.6) {
    return { r: 0.2, g: 0.4, b: 1, a: 0.8 } // blue
  }
  
  // Transition between 6.0 and 7.6
  const t = (pH - 6.0) / (7.6 - 6.0)
  return {
    r: 1 - 0.8 * t,
    g: 1 - 0.6 * t,
    b: 0.2 + 0.8 * t,
    a: 0.8
  }
}

export function getIndicatorName(indicatorType: string): string {
  switch (indicatorType) {
    case 'phenolphthalein':
      return 'Phenolphthalein'
    case 'methylOrange':
      return 'Methyl Orange'
    case 'bromothymolBlue':
      return 'Bromothymol Blue'
    default:
      return 'Phenolphthalein'
  }
}

export function getIndicatorRange(indicatorType: string): { min: number; max: number; color: string } {
  switch (indicatorType) {
    case 'phenolphthalein':
      return { min: 8.2, max: 10, color: 'Colorless to Pink' }
    case 'methylOrange':
      return { min: 3.1, max: 4.4, color: 'Red to Yellow' }
    case 'bromothymolBlue':
      return { min: 6.0, max: 7.6, color: 'Yellow to Blue' }
    default:
      return { min: 8.2, max: 10, color: 'Colorless to Pink' }
  }
}
