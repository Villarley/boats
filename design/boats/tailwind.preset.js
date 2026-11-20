// Tailwind v3: module.exports = { presets: [require('./tailwind.preset.js')] } and import tokens.css in globals.css
const v = (n) => `var(--bt-${n})`;
const keys = ['paper','surface','ink','ink-2','hair','primary','on-primary','crew','captain','up','down','caution','tint-blue','tint-red','tint-yellow','flag-red','flag-yellow','flag-blue','flag-ink'];
module.exports = { theme: { extend: {
  colors: Object.fromEntries(keys.map(k => [k, v(k)])),
  fontFamily: { sans: [v('font')], mono: [v('font-mono')] },
  borderRadius: { DEFAULT: v('radius'), sm: v('radius-sm'), md: v('radius'), lg: v('radius') },
  borderWidth: { DEFAULT: v('border') },
  minHeight: { tap: v('tap') }, height: { tap: v('tap') },
} } };
