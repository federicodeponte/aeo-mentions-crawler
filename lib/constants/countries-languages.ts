/**
 * Shared constants for countries and languages across the application
 * Used by Keywords, Mentions Check, and other internationalized features
 */

// Alphabetically organized languages (most commonly used first, then alphabetical)
export const LANGUAGES = [
  { value: 'af', label: '🇿🇦 Afrikaans', searchTerms: ['afrikaans', 'af', 'south africa'] },
  { value: 'ar', label: '🇸🇦 Arabic', searchTerms: ['arabic', 'ar', 'العربية'] },
  { value: 'eu', label: '🇪🇸 Basque', searchTerms: ['basque', 'eu', 'euskera'] },
  { value: 'bn', label: '🇧🇩 Bengali', searchTerms: ['bengali', 'bn', 'বাংলা', 'bangladesh'] },
  { value: 'bg', label: '🇧🇬 Bulgarian', searchTerms: ['bulgarian', 'bg', 'български'] },
  { value: 'ca', label: '🇪🇸 Catalan', searchTerms: ['catalan', 'ca', 'català'] },
  { value: 'zh', label: '🇨🇳 Chinese', searchTerms: ['chinese', 'mandarin', 'zh', 'china', '中文'] },
  { value: 'hr', label: '🇭🇷 Croatian', searchTerms: ['croatian', 'hr', 'hrvatski'] },
  { value: 'cs', label: '🇨🇿 Czech', searchTerms: ['czech', 'cs', 'čeština'] },
  { value: 'da', label: '🇩🇰 Danish', searchTerms: ['danish', 'da', 'dansk', 'denmark'] },
  { value: 'nl', label: '🇳🇱 Dutch', searchTerms: ['dutch', 'nl', 'nederlands', 'netherlands'] },
  { value: 'en', label: '🇬🇧 English', searchTerms: ['english', 'en', 'eng'] },
  { value: 'et', label: '🇪🇪 Estonian', searchTerms: ['estonian', 'et', 'eesti'] },
  { value: 'tl', label: '🇵🇭 Filipino', searchTerms: ['filipino', 'tl', 'tagalog', 'philippines'] },
  { value: 'fi', label: '🇫🇮 Finnish', searchTerms: ['finnish', 'fi', 'suomi', 'finland'] },
  { value: 'fr', label: '🇫🇷 French', searchTerms: ['french', 'fr', 'français', 'france'] },
  { value: 'de', label: '🇩🇪 German', searchTerms: ['german', 'de', 'deutsch', 'germany'] },
  { value: 'el', label: '🇬🇷 Greek', searchTerms: ['greek', 'el', 'ελληνικά'] },
  { value: 'he', label: '🇮🇱 Hebrew', searchTerms: ['hebrew', 'he', 'עברית', 'israel'] },
  { value: 'hi', label: '🇮🇳 Hindi', searchTerms: ['hindi', 'hi', 'india'] },
  { value: 'hu', label: '🇭🇺 Hungarian', searchTerms: ['hungarian', 'hu', 'magyar'] },
  { value: 'id', label: '🇮🇩 Indonesian', searchTerms: ['indonesian', 'id', 'bahasa'] },
  { value: 'ga', label: '🇮🇪 Irish', searchTerms: ['irish', 'ga', 'gaeilge'] },
  { value: 'it', label: '🇮🇹 Italian', searchTerms: ['italian', 'it', 'italiano'] },
  { value: 'ja', label: '🇯🇵 Japanese', searchTerms: ['japanese', 'ja', '日本語', 'japan'] },
  { value: 'ko', label: '🇰🇷 Korean', searchTerms: ['korean', 'ko', '한국어'] },
  { value: 'lv', label: '🇱🇻 Latvian', searchTerms: ['latvian', 'lv', 'latviešu'] },
  { value: 'lt', label: '🇱🇹 Lithuanian', searchTerms: ['lithuanian', 'lt', 'lietuvių'] },
  { value: 'ms', label: '🇲🇾 Malay', searchTerms: ['malay', 'ms', 'bahasa melayu'] },
  { value: 'mt', label: '🇲🇹 Maltese', searchTerms: ['maltese', 'mt', 'malti'] },
  { value: 'no', label: '🇳🇴 Norwegian', searchTerms: ['norwegian', 'no', 'norsk', 'norway'] },
  { value: 'fa', label: '🇮🇷 Persian', searchTerms: ['persian', 'fa', 'farsi', 'فارسی'] },
  { value: 'pl', label: '🇵🇱 Polish', searchTerms: ['polish', 'pl', 'polski', 'poland'] },
  { value: 'pt', label: '🇵🇹 Portuguese', searchTerms: ['portuguese', 'pt', 'português', 'brazil'] },
  { value: 'ro', label: '🇷🇴 Romanian', searchTerms: ['romanian', 'ro', 'română'] },
  { value: 'ru', label: '🇷🇺 Russian', searchTerms: ['russian', 'ru', 'русский'] },
  { value: 'sr', label: '🇷🇸 Serbian', searchTerms: ['serbian', 'sr', 'српски'] },
  { value: 'sk', label: '🇸🇰 Slovak', searchTerms: ['slovak', 'sk', 'slovenčina'] },
  { value: 'sl', label: '🇸🇮 Slovenian', searchTerms: ['slovenian', 'sl', 'slovenščina'] },
  { value: 'es', label: '🇪🇸 Spanish', searchTerms: ['spanish', 'es', 'español', 'spain'] },
  { value: 'sw', label: '🇰🇪 Swahili', searchTerms: ['swahili', 'sw', 'kiswahili', 'kenya'] },
  { value: 'sv', label: '🇸🇪 Swedish', searchTerms: ['swedish', 'sv', 'svenska', 'sweden'] },
  { value: 'th', label: '🇹🇭 Thai', searchTerms: ['thai', 'th', 'ไทย', 'thailand'] },
  { value: 'tr', label: '🇹🇷 Turkish', searchTerms: ['turkish', 'tr', 'türkçe', 'turkey'] },
  { value: 'uk', label: '🇺🇦 Ukrainian', searchTerms: ['ukrainian', 'uk', 'українська'] },
  { value: 'ur', label: '🇵🇰 Urdu', searchTerms: ['urdu', 'ur', 'اردو', 'pakistan'] },
  { value: 'vi', label: '🇻🇳 Vietnamese', searchTerms: ['vietnamese', 'vi', 'tiếng việt'] },
  { value: 'cy', label: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh', searchTerms: ['welsh', 'cy', 'cymraeg'] },
]

// Alphabetically organized countries (Germany first as default, then alphabetical)
export const COUNTRIES = [
  // Default market first
  { value: 'DE', label: '🇩🇪 Germany', searchTerms: ['germany', 'de', 'deutsch', 'deutschland'] },
  
  // All other countries alphabetically
  { value: 'AE', label: '🇦🇪 UAE', searchTerms: ['uae', 'ae', 'emirates', 'dubai'] },
  { value: 'AL', label: '🇦🇱 Albania', searchTerms: ['albania', 'al', 'albanian', 'shqipëria'] },
  { value: 'AR', label: '🇦🇷 Argentina', searchTerms: ['argentina', 'ar', 'argentinian'] },
  { value: 'AT', label: '🇦🇹 Austria', searchTerms: ['austria', 'at', 'austrian', 'österreich'] },
  { value: 'AU', label: '🇦🇺 Australia', searchTerms: ['australia', 'au', 'aussie', 'australian'] },
  { value: 'BA', label: '🇧🇦 Bosnia and Herzegovina', searchTerms: ['bosnia', 'ba', 'bosnian'] },
  { value: 'BD', label: '🇧🇩 Bangladesh', searchTerms: ['bangladesh', 'bd', 'bengali', 'বাংলাদেশ'] },
  { value: 'BE', label: '🇧🇪 Belgium', searchTerms: ['belgium', 'be', 'belgian', 'belgique'] },
  { value: 'BG', label: '🇧🇬 Bulgaria', searchTerms: ['bulgaria', 'bg', 'bulgarian', 'българия'] },
  { value: 'BH', label: '🇧🇭 Bahrain', searchTerms: ['bahrain', 'bh', 'bahraini', 'البحرين'] },
  { value: 'BO', label: '🇧🇴 Bolivia', searchTerms: ['bolivia', 'bo', 'bolivian'] },
  { value: 'BR', label: '🇧🇷 Brazil', searchTerms: ['brazil', 'br', 'brazilian', 'brasil'] },
  { value: 'BY', label: '🇧🇾 Belarus', searchTerms: ['belarus', 'by', 'беларусь'] },
  { value: 'CA', label: '🇨🇦 Canada', searchTerms: ['canada', 'ca', 'canadian'] },
  { value: 'CH', label: '🇨🇭 Switzerland', searchTerms: ['switzerland', 'ch', 'swiss', 'schweiz'] },
  { value: 'CL', label: '🇨🇱 Chile', searchTerms: ['chile', 'cl', 'chilean'] },
  { value: 'CN', label: '🇨🇳 China', searchTerms: ['china', 'cn', 'chinese', '中国'] },
  { value: 'CO', label: '🇨🇴 Colombia', searchTerms: ['colombia', 'co', 'colombian'] },
  { value: 'CY', label: '🇨🇾 Cyprus', searchTerms: ['cyprus', 'cy', 'κύπρος'] },
  { value: 'CZ', label: '🇨🇿 Czech Republic', searchTerms: ['czech', 'cz', 'czechia', 'česko'] },
  { value: 'DK', label: '🇩🇰 Denmark', searchTerms: ['denmark', 'dk', 'danish', 'danmark'] },
  { value: 'DZ', label: '🇩🇿 Algeria', searchTerms: ['algeria', 'dz', 'algerian', 'الجزائر'] },
  { value: 'EC', label: '🇪🇨 Ecuador', searchTerms: ['ecuador', 'ec', 'ecuadorian'] },
  { value: 'EE', label: '🇪🇪 Estonia', searchTerms: ['estonia', 'ee', 'estonian', 'eesti'] },
  { value: 'EG', label: '🇪🇬 Egypt', searchTerms: ['egypt', 'eg', 'egyptian', 'مصر'] },
  { value: 'ES', label: '🇪🇸 Spain', searchTerms: ['spain', 'es', 'spanish', 'españa'] },
  { value: 'ET', label: '🇪🇹 Ethiopia', searchTerms: ['ethiopia', 'et', 'ethiopian'] },
  { value: 'FI', label: '🇫🇮 Finland', searchTerms: ['finland', 'fi', 'finnish', 'suomi'] },
  { value: 'FR', label: '🇫🇷 France', searchTerms: ['france', 'fr', 'french', 'français'] },
  { value: 'GB', label: '🇬🇧 United Kingdom', searchTerms: ['uk', 'gb', 'britain', 'england', 'united kingdom'] },
  { value: 'GH', label: '🇬🇭 Ghana', searchTerms: ['ghana', 'gh', 'ghanaian'] },
  { value: 'Global', label: '🌍 Global', searchTerms: ['global', 'worldwide', 'international', 'world'] },
  { value: 'GR', label: '🇬🇷 Greece', searchTerms: ['greece', 'gr', 'greek', 'ελλάδα'] },
  { value: 'HK', label: '🇭🇰 Hong Kong', searchTerms: ['hong kong', 'hk', 'hongkong'] },
  { value: 'HR', label: '🇭🇷 Croatia', searchTerms: ['croatia', 'hr', 'croatian', 'hrvatska'] },
  { value: 'HU', label: '🇭🇺 Hungary', searchTerms: ['hungary', 'hu', 'hungarian', 'magyarország'] },
  { value: 'ID', label: '🇮🇩 Indonesia', searchTerms: ['indonesia', 'id', 'indonesian'] },
  { value: 'IE', label: '🇮🇪 Ireland', searchTerms: ['ireland', 'ie', 'irish', 'éire'] },
  { value: 'IL', label: '🇮🇱 Israel', searchTerms: ['israel', 'il', 'israeli', 'ישראל'] },
  { value: 'IN', label: '🇮🇳 India', searchTerms: ['india', 'in', 'indian', 'भारत'] },
  { value: 'IQ', label: '🇮🇶 Iraq', searchTerms: ['iraq', 'iq', 'iraqi', 'العراق'] },
  { value: 'IR', label: '🇮🇷 Iran', searchTerms: ['iran', 'ir', 'persian', 'ایران'] },
  { value: 'IS', label: '🇮🇸 Iceland', searchTerms: ['iceland', 'is', 'icelandic', 'ísland'] },
  { value: 'IT', label: '🇮🇹 Italy', searchTerms: ['italy', 'it', 'italian', 'italia'] },
  { value: 'JO', label: '🇯🇴 Jordan', searchTerms: ['jordan', 'jo', 'jordanian', 'الأردن'] },
  { value: 'JP', label: '🇯🇵 Japan', searchTerms: ['japan', 'jp', 'japanese', '日本'] },
  { value: 'KE', label: '🇰🇪 Kenya', searchTerms: ['kenya', 'ke', 'kenyan'] },
  { value: 'KR', label: '🇰🇷 South Korea', searchTerms: ['korea', 'kr', 'korean', '한국'] },
  { value: 'KW', label: '🇰🇼 Kuwait', searchTerms: ['kuwait', 'kw', 'kuwaiti', 'الكويت'] },
  { value: 'LB', label: '🇱🇧 Lebanon', searchTerms: ['lebanon', 'lb', 'lebanese', 'لبنان'] },
  { value: 'LK', label: '🇱🇰 Sri Lanka', searchTerms: ['sri lanka', 'lk', 'lanka'] },
  { value: 'LT', label: '🇱🇹 Lithuania', searchTerms: ['lithuania', 'lt', 'lithuanian', 'lietuva'] },
  { value: 'LU', label: '🇱🇺 Luxembourg', searchTerms: ['luxembourg', 'lu'] },
  { value: 'LV', label: '🇱🇻 Latvia', searchTerms: ['latvia', 'lv', 'latvian', 'latvija'] },
  { value: 'MA', label: '🇲🇦 Morocco', searchTerms: ['morocco', 'ma', 'moroccan', 'المغرب'] },
  { value: 'ME', label: '🇲🇪 Montenegro', searchTerms: ['montenegro', 'me', 'crna gora'] },
  { value: 'MK', label: '🇲🇰 North Macedonia', searchTerms: ['macedonia', 'mk', 'macedonian'] },
  { value: 'MT', label: '🇲🇹 Malta', searchTerms: ['malta', 'mt', 'maltese'] },
  { value: 'MX', label: '🇲🇽 Mexico', searchTerms: ['mexico', 'mx', 'mexican', 'méxico'] },
  { value: 'MY', label: '🇲🇾 Malaysia', searchTerms: ['malaysia', 'my', 'malaysian'] },
  { value: 'NG', label: '🇳🇬 Nigeria', searchTerms: ['nigeria', 'ng', 'nigerian'] },
  { value: 'NL', label: '🇳🇱 Netherlands', searchTerms: ['netherlands', 'nl', 'dutch', 'holland'] },
  { value: 'NO', label: '🇳🇴 Norway', searchTerms: ['norway', 'no', 'norwegian', 'norge'] },
  { value: 'NZ', label: '🇳🇿 New Zealand', searchTerms: ['new zealand', 'nz', 'kiwi'] },
  { value: 'OM', label: '🇴🇲 Oman', searchTerms: ['oman', 'om', 'omani', 'عمان'] },
  { value: 'PE', label: '🇵🇪 Peru', searchTerms: ['peru', 'pe', 'peruvian', 'perú'] },
  { value: 'PH', label: '🇵🇭 Philippines', searchTerms: ['philippines', 'ph', 'filipino', 'pilipinas'] },
  { value: 'PK', label: '🇵🇰 Pakistan', searchTerms: ['pakistan', 'pk', 'pakistani', 'پاکستان'] },
  { value: 'PL', label: '🇵🇱 Poland', searchTerms: ['poland', 'pl', 'polish', 'polska'] },
  { value: 'PT', label: '🇵🇹 Portugal', searchTerms: ['portugal', 'pt', 'portuguese'] },
  { value: 'PY', label: '🇵🇾 Paraguay', searchTerms: ['paraguay', 'py', 'paraguayan'] },
  { value: 'QA', label: '🇶🇦 Qatar', searchTerms: ['qatar', 'qa', 'qatari', 'قطر'] },
  { value: 'RO', label: '🇷🇴 Romania', searchTerms: ['romania', 'ro', 'romanian', 'românia'] },
  { value: 'RS', label: '🇷🇸 Serbia', searchTerms: ['serbia', 'rs', 'serbian', 'србија'] },
  { value: 'RU', label: '🇷🇺 Russia', searchTerms: ['russia', 'ru', 'russian', 'россия'] },
  { value: 'SA', label: '🇸🇦 Saudi Arabia', searchTerms: ['saudi arabia', 'sa', 'saudi', 'السعودية'] },
  { value: 'SE', label: '🇸🇪 Sweden', searchTerms: ['sweden', 'se', 'swedish', 'sverige'] },
  { value: 'SG', label: '🇸🇬 Singapore', searchTerms: ['singapore', 'sg', 'singaporean'] },
  { value: 'SI', label: '🇸🇮 Slovenia', searchTerms: ['slovenia', 'si', 'slovenian', 'slovenija'] },
  { value: 'SK', label: '🇸🇰 Slovakia', searchTerms: ['slovakia', 'sk', 'slovak', 'slovensko'] },
  { value: 'TH', label: '🇹🇭 Thailand', searchTerms: ['thailand', 'th', 'thai', 'ไทย'] },
  { value: 'TN', label: '🇹🇳 Tunisia', searchTerms: ['tunisia', 'tn', 'tunisian', 'تونس'] },
  { value: 'TR', label: '🇹🇷 Turkey', searchTerms: ['turkey', 'tr', 'turkish', 'türkiye'] },
  { value: 'TW', label: '🇹🇼 Taiwan', searchTerms: ['taiwan', 'tw', 'taiwanese', '台灣'] },
  { value: 'UA', label: '🇺🇦 Ukraine', searchTerms: ['ukraine', 'ua', 'ukrainian', 'україна'] },
  { value: 'US', label: '🇺🇸 United States', searchTerms: ['usa', 'us', 'america', 'united states'] },
  { value: 'UY', label: '🇺🇾 Uruguay', searchTerms: ['uruguay', 'uy', 'uruguayan'] },
  { value: 'VE', label: '🇻🇪 Venezuela', searchTerms: ['venezuela', 've', 'venezuelan'] },
  { value: 'VN', label: '🇻🇳 Vietnam', searchTerms: ['vietnam', 'vn', 'vietnamese', 'việt nam'] },
  { value: 'ZA', label: '🇿🇦 South Africa', searchTerms: ['south africa', 'za', 'african'] },
]

// Helper functions for language/country mapping
export function getLanguageByCode(code: string) {
  return LANGUAGES.find(lang => lang.value === code)
}

export function getCountryByCode(code: string) {
  return COUNTRIES.find(country => country.value === code)
}

// Language-country intelligent mapping (for smart defaults)
export function getDefaultLanguageForCountry(countryCode: string): string {
  const mapping: Record<string, string> = {
    'DE': 'de', // Germany -> German
    'AT': 'de', // Austria -> German
    'CH': 'de', // Switzerland -> German (simplified)
    'US': 'en', // United States -> English
    'GB': 'en', // United Kingdom -> English
    'CA': 'en', // Canada -> English (simplified)
    'AU': 'en', // Australia -> English
    'NZ': 'en', // New Zealand -> English
    'FR': 'fr', // France -> French
    'BE': 'fr', // Belgium -> French (simplified)
    'ES': 'es', // Spain -> Spanish
    'MX': 'es', // Mexico -> Spanish
    'AR': 'es', // Argentina -> Spanish
    'CL': 'es', // Chile -> Spanish
    'CO': 'es', // Colombia -> Spanish
    'PE': 'es', // Peru -> Spanish
    'IT': 'it', // Italy -> Italian
    'NL': 'nl', // Netherlands -> Dutch
    'PT': 'pt', // Portugal -> Portuguese
    'BR': 'pt', // Brazil -> Portuguese
    'PL': 'pl', // Poland -> Polish
    'RU': 'ru', // Russia -> Russian
    'JP': 'ja', // Japan -> Japanese
    'CN': 'zh', // China -> Chinese
    'KR': 'ko', // South Korea -> Korean
    'TR': 'tr', // Turkey -> Turkish
    'SE': 'sv', // Sweden -> Swedish
    'NO': 'no', // Norway -> Norwegian
    'DK': 'da', // Denmark -> Danish
    'FI': 'fi', // Finland -> Finnish
  }
  
  return mapping[countryCode] || 'en' // Default to English
}

export function getDefaultCountryForLanguage(languageCode: string): string {
  const mapping: Record<string, string> = {
    'de': 'DE', // German -> Germany
    'en': 'US', // English -> United States
    'fr': 'FR', // French -> France
    'es': 'ES', // Spanish -> Spain
    'it': 'IT', // Italian -> Italy
    'nl': 'NL', // Dutch -> Netherlands
    'pt': 'PT', // Portuguese -> Portugal
    'pl': 'PL', // Polish -> Poland
    'ru': 'RU', // Russian -> Russia
    'ja': 'JP', // Japanese -> Japan
    'zh': 'CN', // Chinese -> China
    'ko': 'KR', // Korean -> South Korea
    'tr': 'TR', // Turkish -> Turkey
    'sv': 'SE', // Swedish -> Sweden
    'no': 'NO', // Norwegian -> Norway
    'da': 'DK', // Danish -> Denmark
    'fi': 'FI', // Finnish -> Finland
  }
  
  return mapping[languageCode] || 'DE' // Default to Germany (as requested)
}