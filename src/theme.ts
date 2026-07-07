import type { Theme } from '@fluentui/react-components'
import { createDarkTheme, createLightTheme, type BrandVariants } from '@fluentui/react-components'

const brand: BrandVariants = {
  10:  '#020108',
  20:  '#0a0619',
  30:  '#150c2e',
  40:  '#1d1243',
  50:  '#251758',
  60:  '#2d1d6e',
  70:  '#352385',
  80:  '#3d2a9c',
  90:  '#4933b4',
  100: '#5940ce',
  110: '#6c63ff',
  120: '#7d76ff',
  130: '#8e89ff',
  140: '#9f9cff',
  150: '#b0b0ff',
  160: '#c1c3ff',
}

export const appDarkTheme: Theme = {
  ...createDarkTheme(brand),
  colorNeutralBackground1: '#1a1d27',
  colorNeutralBackground2: '#13151f',
  colorNeutralBackground3: '#22263a',
  colorNeutralBackground4: '#0f1117',
  colorNeutralBackground5: '#0c0e16',
  colorNeutralBackground6: '#22263a',
  colorNeutralStroke1:     '#2e3250',
  colorNeutralStroke2:     '#3a3f5c',
  colorNeutralStroke3:     '#454a6a',
}

export const appLightTheme: Theme = {
  ...createLightTheme(brand),
}

// Convenience: surface color used to sync body background
export const themeBg = {
  dark:  appDarkTheme.colorNeutralBackground4  as string,
  light: appLightTheme.colorNeutralBackground4 as string,
}
