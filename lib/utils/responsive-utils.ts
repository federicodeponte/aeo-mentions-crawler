/**
 * Enhanced Responsive Utility Classes
 * Provides consistent breakpoint utilities across the application
 * Now includes mobile-first patterns and context-aware helpers
 */

import { type ResponsiveState } from '@/contexts/ResponsiveContext'

/**
 * Container padding utilities for all breakpoints
 */
export const containerPadding = {
  xs: 'px-3',
  sm: 'px-4 sm:px-5',
  md: 'px-4 sm:px-6 md:px-7',
  lg: 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12',
  xl: 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16',
}

/**
 * Text size utilities for all breakpoints
 */
export const textSizes = {
  xs: 'text-xs sm:text-sm md:text-base',
  sm: 'text-sm sm:text-base md:text-lg',
  base: 'text-base sm:text-lg md:text-xl',
  lg: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
  xl: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl',
  '2xl': 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
}

/**
 * Heading utilities
 */
export const headings = {
  h1: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold',
  h2: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold',
  h3: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold',
  h4: 'text-base sm:text-lg md:text-xl lg:text-2xl font-medium',
}

/**
 * Spacing utilities
 */
export const spacing = {
  xs: 'space-y-2 sm:space-y-3 md:space-y-4',
  sm: 'space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6',
  md: 'space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 xl:space-y-10',
  lg: 'space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 xl:space-y-16',
}

/**
 * Grid column utilities
 */
export const gridCols = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  '5': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  '6': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
}

/**
 * Card padding utilities
 */
export const cardPadding = {
  xs: 'p-2 sm:p-3 md:p-4',
  sm: 'p-3 sm:p-4 md:p-5 lg:p-6',
  md: 'p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8',
  lg: 'p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 2xl:p-12',
}

/**
 * Gap utilities
 */
export const gaps = {
  xs: 'gap-1 sm:gap-2 md:gap-3',
  sm: 'gap-2 sm:gap-3 md:gap-4 lg:gap-5',
  md: 'gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8',
  lg: 'gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12',
}

/**
 * Visibility utilities
 */
export const visibility = {
  hideXS: 'hidden xs:block',
  hideSM: 'hidden sm:block',
  hideMD: 'hidden md:block',
  hideLG: 'hidden lg:block',
  hideXL: 'hidden xl:block',
  showOnlyXS: 'block xs:hidden',
  showOnlySM: 'block sm:hidden md:block',
  showOnlyMD: 'block md:hidden lg:block',
  showOnlyLG: 'block lg:hidden xl:block',
}

/**
 * Max width utilities
 */
export const maxWidth = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
  screen: 'max-w-screen-xs xs:max-w-screen-sm sm:max-w-screen-md md:max-w-screen-lg lg:max-w-screen-xl xl:max-w-screen-2xl',
}

/**
 * Context-aware responsive utilities
 * These functions work with ResponsiveContext to provide dynamic classes
 */

/**
 * Get responsive classes based on viewport state
 */
export function getResponsiveClasses<T extends Record<string, unknown>>(
  utilities: T,
  state: ResponsiveState
): Record<keyof T, string> {
  const result = {} as Record<keyof T, string>
  
  for (const [key, variants] of Object.entries(utilities)) {
    if (variants && typeof variants === 'object') {
      if (state.isMobile) {
        result[key as keyof T] = variants.mobile || variants.tablet || variants.desktop
      } else if (state.isTablet) {
        result[key as keyof T] = variants.tablet || variants.desktop || variants.mobile
      } else {
        result[key as keyof T] = variants.desktop || variants.tablet || variants.mobile
      }
    }
  }
  
  return result
}

/**
 * Mobile-first spacing utilities
 */
export const mobileSpacing = {
  /** Container padding optimized for mobile */
  containerPadding: {
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4', 
    desktop: 'px-8 py-6',
  },
  /** Section spacing */
  sectionSpacing: {
    mobile: 'space-y-4',
    tablet: 'space-y-6',
    desktop: 'space-y-8',
  },
  /** Grid gaps */
  gridGap: {
    mobile: 'gap-3',
    tablet: 'gap-4',
    desktop: 'gap-6',
  },
  /** Stack spacing */
  stackSpacing: {
    mobile: 'space-y-2',
    tablet: 'space-y-3',
    desktop: 'space-y-4',
  },
} as const

/**
 * Mobile-first typography utilities  
 */
export const mobileTypography = {
  heading: {
    h1: {
      mobile: 'text-2xl font-bold',
      tablet: 'text-3xl font-bold',
      desktop: 'text-4xl font-bold',
    },
    h2: {
      mobile: 'text-xl font-semibold',
      tablet: 'text-2xl font-semibold', 
      desktop: 'text-3xl font-semibold',
    },
    h3: {
      mobile: 'text-lg font-medium',
      tablet: 'text-xl font-medium',
      desktop: 'text-2xl font-medium',
    },
  },
  body: {
    large: {
      mobile: 'text-base',
      tablet: 'text-lg',
      desktop: 'text-lg',
    },
    default: {
      mobile: 'text-sm',
      tablet: 'text-base',
      desktop: 'text-base',
    },
    small: {
      mobile: 'text-xs',
      tablet: 'text-sm',
      desktop: 'text-sm',
    },
  },
} as const

/**
 * Mobile-first layout utilities
 */
export const mobileLayout = {
  /** Grid columns */
  grid: {
    auto: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-2',
      desktop: 'grid-cols-3',
    },
    cards: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-2', 
      desktop: 'grid-cols-4',
    },
    stats: {
      mobile: 'grid-cols-2',
      tablet: 'grid-cols-3',
      desktop: 'grid-cols-4',
    },
  },
  /** Flexbox layouts */
  flex: {
    stack: {
      mobile: 'flex-col',
      tablet: 'flex-col',
      desktop: 'flex-row',
    },
    center: {
      mobile: 'flex-col items-center',
      tablet: 'flex-row items-center justify-center',
      desktop: 'flex-row items-center justify-center',
    },
  },
} as const

/**
 * Get mobile-optimized spacing classes
 */
export function getMobileSpacing(state: ResponsiveState) {
  return getResponsiveClasses(mobileSpacing, state)
}

/**
 * Get mobile-optimized typography classes
 */
export function getMobileTypography(state: ResponsiveState) {
  return getResponsiveClasses(mobileTypography, state)
}

/**
 * Get mobile-optimized layout classes
 */
export function getMobileLayout(state: ResponsiveState) {
  return getResponsiveClasses(mobileLayout, state)
}

/**
 * Touch-optimized utilities
 */
export const touchOptimizations = {
  /** WCAG AA compliant touch targets */
  button: 'min-h-[44px] min-w-[44px]',
  input: 'min-h-[44px]',
  icon: 'h-6 w-6',
  /** Touch-friendly spacing */
  spacing: 'gap-3 p-3',
  /** Larger tap areas */
  tapArea: 'p-4',
} as const

/**
 * Get container width based on responsive state
 */
export function getContainerWidth(state: ResponsiveState): string {
  if (state.isMobile) return 'max-w-sm'
  if (state.isTablet) return 'max-w-2xl' 
  return 'max-w-6xl'
}

/**
 * Animation preferences based on device
 */
export function getAnimationPreference(state: ResponsiveState) {
  return {
    // Reduce motion on mobile for battery life
    reduceMotion: state.isMobile,
    // Shorter durations on mobile
    duration: state.isMobile ? 'duration-150' : 'duration-300',
    // Simpler easing on mobile
    easing: state.isMobile ? 'ease-out' : 'ease-in-out',
  }
}


