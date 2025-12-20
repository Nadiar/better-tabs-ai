// Pattern Detector - Identifies relationships between tabs
// Helps AI make better grouping suggestions by detecting patterns

/**
 * Detect patterns across tabs before AI analysis
 * @param {Array} tabs - Array of tab objects with title and URL
 * @returns {Object} Detected patterns
 */
export function detectPatterns(tabs) {
  return {
    domainGroups: groupBySameDomain(tabs),
    subdomainGroups: groupBySameSubdomain(tabs),
    titlePrefixGroups: groupByTitlePrefix(tabs),
    urlPatternGroups: groupByUrlPattern(tabs),
    toolEcosystems: detectToolEcosystems(tabs)
  };
}

/**
 * Group tabs by exact same domain
 */
function groupBySameDomain(tabs) {
  const groups = {};

  tabs.forEach(tab => {
    const domain = extractDomain(tab.url);
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
  });

  // Only return groups with 2+ tabs
  return Object.entries(groups)
    .filter(([_, tabList]) => tabList.length >= 2)
    .map(([domain, tabList]) => ({
      type: 'same-domain',
      domain,
      tabs: tabList,
      confidence: 0.9
    }));
}

/**
 * Group tabs by same subdomain (e.g., docs.google.com, drive.google.com)
 */
function groupBySameSubdomain(tabs) {
  const groups = {};

  tabs.forEach(tab => {
    const subdomain = extractSubdomain(tab.url);
    if (subdomain) {
      if (!groups[subdomain]) {
        groups[subdomain] = [];
      }
      groups[subdomain].push(tab);
    }
  });

  return Object.entries(groups)
    .filter(([_, tabList]) => tabList.length >= 2)
    .map(([subdomain, tabList]) => ({
      type: 'same-subdomain',
      subdomain,
      tabs: tabList,
      confidence: 0.7
    }));
}

/**
 * Group tabs by common title prefix (e.g., "DIM", "Bray", "*arr")
 */
function groupByTitlePrefix(tabs) {
  const prefixGroups = {};

  tabs.forEach(tab => {
    // Extract first word or acronym
    const prefix = extractTitlePrefix(tab.title);
    if (prefix) {
      if (!prefixGroups[prefix]) {
        prefixGroups[prefix] = [];
      }
      prefixGroups[prefix].push(tab);
    }
  });

  return Object.entries(prefixGroups)
    .filter(([_, tabList]) => tabList.length >= 2)
    .map(([prefix, tabList]) => ({
      type: 'title-prefix',
      prefix,
      tabs: tabList,
      confidence: 0.8
    }));
}

/**
 * Group tabs by URL pattern (e.g., *.example.com)
 */
function groupByUrlPattern(tabs) {
  const patternGroups = {};

  tabs.forEach(tab => {
    const pattern = extractUrlPattern(tab.url);
    if (pattern) {
      if (!patternGroups[pattern]) {
        patternGroups[pattern] = [];
      }
      patternGroups[pattern].push(tab);
    }
  });

  return Object.entries(patternGroups)
    .filter(([_, tabList]) => tabList.length >= 2)
    .map(([pattern, tabList]) => ({
      type: 'url-pattern',
      pattern,
      tabs: tabList,
      confidence: 0.75
    }));
}

/**
 * Detect known tool ecosystems
 */
function detectToolEcosystems(tabs) {
  const ecosystems = {
    'arr-stack': {
      keywords: ['radarr', 'sonarr', 'lidarr', 'prowlarr', 'autobrr', 'bazarr'],
      name: 'Media Server Tools',
      confidence: 0.95
    },
    'google-workspace': {
      keywords: ['docs.google', 'drive.google', 'mail.google', 'calendar.google', 'sheets.google'],
      name: 'Google Workspace',
      confidence: 0.95
    },
    'microsoft-office': {
      keywords: ['office.com', 'outlook.com', 'onedrive', 'teams.microsoft'],
      name: 'Microsoft 365',
      confidence: 0.95
    },
    'destiny-tools': {
      keywords: ['destinyitemmanager', 'braytech', 'light.gg', 'd2gunsmith'],
      name: 'Destiny Game Tools',
      confidence: 0.9
    },
    'development': {
      keywords: ['github', 'gitlab', 'bitbucket', 'stackoverflow', 'code.visualstudio'],
      name: 'Development Tools',
      confidence: 0.85
    },
    'social-media': {
      keywords: ['twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'discord'],
      name: 'Social Media',
      confidence: 0.9
    },
    'shopping': {
      keywords: ['amazon', 'ebay', 'walmart', 'target', 'homedepot', 'lowes'],
      name: 'Shopping',
      confidence: 0.85
    }
  };

  const detected = [];

  for (const [ecosystemId, ecosystem] of Object.entries(ecosystems)) {
    const matchingTabs = tabs.filter(tab => {
      const url = tab.url.toLowerCase();
      const title = tab.title.toLowerCase();
      return ecosystem.keywords.some(keyword =>
        url.includes(keyword) || title.includes(keyword)
      );
    });

    if (matchingTabs.length >= 2) {
      detected.push({
        type: 'tool-ecosystem',
        ecosystem: ecosystemId,
        name: ecosystem.name,
        tabs: matchingTabs,
        confidence: ecosystem.confidence
      });
    }
  }

  return detected;
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Extract subdomain pattern (e.g., google.com from docs.google.com)
 */
function extractSubdomain(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.hostname.split('.');
    if (parts.length >= 2) {
      // Return last two parts (e.g., google.com, github.com)
      return parts.slice(-2).join('.');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract title prefix (first word or acronym)
 */
function extractTitlePrefix(title) {
  if (!title) return null;

  // Match common patterns:
  // - Acronyms: "DIM", "FEMA"
  // - Prefixes: "Radarr", "Sonarr"
  // - Brands: "Google", "Microsoft"

  // Try to get first meaningful word
  const match = title.match(/^([A-Z]{2,}|[A-Z][a-z]+|\w+arr)\b/);
  return match ? match[1] : null;
}

/**
 * Extract URL pattern (subdomain wildcard)
 */
function extractUrlPattern(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.hostname.split('.');
    if (parts.length >= 3) {
      // Return pattern like *.google.com
      return `*.${parts.slice(-2).join('.')}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate boost score for patterns
 * Higher score = stronger pattern match
 */
export function calculatePatternBoost(tab, patterns) {
  let boost = 0;

  // Check if tab is in any domain groups
  patterns.domainGroups?.forEach(group => {
    if (group.tabs.some(t => t.id === tab.id)) {
      boost += group.confidence * 0.3; // 30% boost for same domain
    }
  });

  // Check if tab is in any subdomain groups
  patterns.subdomainGroups?.forEach(group => {
    if (group.tabs.some(t => t.id === tab.id)) {
      boost += group.confidence * 0.2; // 20% boost for same subdomain
    }
  });

  // Check if tab is in any title prefix groups
  patterns.titlePrefixGroups?.forEach(group => {
    if (group.tabs.some(t => t.id === tab.id)) {
      boost += group.confidence * 0.25; // 25% boost for title prefix
    }
  });

  // Check if tab is in any tool ecosystems (highest boost)
  patterns.toolEcosystems?.forEach(group => {
    if (group.tabs.some(t => t.id === tab.id)) {
      boost += group.confidence * 0.4; // 40% boost for known ecosystems
    }
  });

  return Math.min(boost, 0.5); // Cap at 50% boost
}

/**
 * Get suggested group name for pattern
 */
export function getSuggestedNameForPattern(pattern) {
  switch (pattern.type) {
    case 'same-domain':
      return `${capitalize(pattern.domain.split('.')[0])} Tabs`;
    case 'same-subdomain':
      return `${capitalize(pattern.subdomain.split('.')[0])} Services`;
    case 'title-prefix':
      return `${pattern.prefix} Related`;
    case 'tool-ecosystem':
      return pattern.name;
    default:
      return 'Related Tabs';
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
