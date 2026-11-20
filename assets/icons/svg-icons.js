/**
 * svg-icons.js
 * -----------------------------------------------------------------------------
 * Minimal 1.5px stroke outline icons plus the custom Blank Tree silhouette that
 * stands in for team portraits until real photos are supplied.
 *
 * Every export returns an SVG string so pages can inline it with template
 * literals. Add new icons by adding one entry to ICON_PATHS.
 */

/** Inner SVG markup for each 24x24 outline icon. */
const ICON_PATHS = {
  arrowRight: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  arrowDown: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  speaker:
    '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  // Page 3 camera cut icons
  pitchDown: '<path d="M12 4v14"/><path d="M6 12l6 6 6-6"/>',
  swipeLeft: '<path d="M20 12H6"/><path d="M12 6l-6 6 6 6"/>',
  zoomIn: '<path d="M12 5v14M5 12h14"/>',
  orbit: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4h-4"/>',
  // Page 4 scenario icons
  coffee:
    '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M12 3v2"/>',
  desk: '<path d="M4 17h16"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M12 8V6M10 6h4"/>',
  classroom:
    '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15z"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  transit:
    '<rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16"/><path d="M8 17v2.5M16 17v2.5"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  shield:
    '<path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3z"/><path d="M12 8v5M12 16v.5"/>',
};

/**
 * Render a named outline icon.
 * @param {keyof typeof ICON_PATHS} name
 * @param {{size?: number, className?: string}} [options]
 * @returns {string} SVG markup
 */
export function icon(name, { size = 20, className = '' } = {}) {
  const inner = ICON_PATHS[name] || '';
  return `<svg class="icon ${className}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/**
 * Blank Tree silhouette: a lone geometric tree against a horizon grid and a
 * soft circular halo. Used as the portrait placeholder on Page 6.
 * @param {{className?: string}} [options]
 * @returns {string} SVG markup (scales to its container)
 */
export function blankTreeSVG({ className = '' } = {}) {
  return `<svg class="blank-tree ${className}" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Portrait placeholder: lone tree silhouette">
    <rect width="200" height="240" fill="#0d1016"/>
    <circle cx="100" cy="108" r="64" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.28)" stroke-width="1"/>
    <circle cx="100" cy="108" r="48" fill="none" stroke="rgba(59,130,246,0.12)" stroke-width="1"/>
    <g stroke="#1e2430" stroke-width="1" fill="none">
      <path d="M0 192H200M0 206H200M0 224H200"/>
      <path d="M100 192L-20 240M100 192L30 240M100 192L65 240M100 192L100 240M100 192L135 240M100 192L170 240M100 192L220 240"/>
    </g>
    <g stroke="#5e6675" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M95.5 192L97.5 132L102.5 132L104.5 192Z" fill="#161a22"/>
      <path d="M100 160L74 134"/>
      <path d="M100 148L128 118"/>
      <path d="M99 134L80 102"/>
      <path d="M101 126L122 94"/>
      <path d="M100 132L100 72"/>
      <path d="M74 134L62 130M74 134L72 122M80 102L68 98M80 102L82 90"/>
      <path d="M128 118L140 116M128 118L128 106M122 94L134 90M122 94L120 82"/>
      <path d="M100 72L94 62M100 72L106 62"/>
    </g>
    <g fill="#3b82f6">
      <circle cx="62" cy="130" r="2"/><circle cx="72" cy="122" r="2"/><circle cx="68" cy="98" r="2"/>
      <circle cx="82" cy="90" r="2"/><circle cx="140" cy="116" r="2"/><circle cx="128" cy="106" r="2"/>
      <circle cx="134" cy="90" r="2"/><circle cx="120" cy="82" r="2"/><circle cx="94" cy="62" r="2"/>
      <circle cx="106" cy="62" r="2"/>
    </g>
  </svg>`;
}
