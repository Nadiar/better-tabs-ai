// Exclusion List Management Functions
// These will be appended to options.ts

// Advanced Grouping - Match Score Display
export function updateMatchScoreDisplay(value: number) {
  const valueDisplay = document.getElementById('matchScoreValue');
  if (valueDisplay) {
    valueDisplay.textContent = value.toFixed(2);
  }

  const hint = document.getElementById('matchScoreHint');
  if (hint) {
    if (value <= 0.6) {
      hint.textContent = 'More suggestions';
    } else if (value <= 0.75) {
      hint.textContent = 'Balanced';
    } else {
      hint.textContent = 'Only very similar';
    }
  }
}

// Advanced Grouping - Skip Low Confidence Display
export function updateSkipLowConfDisplay(value: number) {
  const valueDisplay = document.getElementById('skipLowConfValue');
  if (valueDisplay) {
    valueDisplay.textContent = value.toFixed(2);
  }

  const hint = document.getElementById('skipLowConfHint');
  if (hint) {
    if (value <= 0.25) {
      hint.textContent = 'Include more';
    } else if (value <= 0.35) {
      hint.textContent = 'Default';
    } else {
      hint.textContent = 'Skip more';
    }
  }
}

// Exclusion List Management
export function renderExclusionList(patterns: any[], currentSettings: any, NotificationManager: any, SettingsOperations: any, checkForChanges: () => void) {
  const listContainer = document.getElementById('exclusionList');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (!patterns || patterns.length === 0) {
    return; // CSS ::before will show empty message
  }

  patterns.forEach((pattern, index) => {
    const item = document.createElement('div');
    const disabledClass = pattern.enabled ? '' : ' disabled';
    item.className = 'exclusion-item' + disabledClass;
    item.dataset.index = index.toString();

    const addedDate = new Date(pattern.addedDate).toLocaleDateString();
    const checkedAttr = pattern.enabled ? 'checked' : '';
    const descriptionHtml = pattern.description ? `<span> · ${escapeHtml(pattern.description)}</span>` : '';

    item.innerHTML = `
      <div class="exclusion-toggle">
        <input type="checkbox" ${checkedAttr}
               onchange="toggleExclusion(${index})">
      </div>
      <div class="exclusion-details">
        <div class="exclusion-pattern">${escapeHtml(pattern.pattern)}</div>
        <div class="exclusion-meta">
          <span class="exclusion-type-badge">${pattern.type}</span>
          ${descriptionHtml}
          <span> · Added ${addedDate}</span>
        </div>
      </div>
      <div class="exclusion-actions">
        <button onclick="deleteExclusion(${index})" class="delete-btn">🗑 Delete</button>
      </div>
    `;

    listContainer.appendChild(item);
  });

  // Setup global handlers
  setupExclusionHandlers(currentSettings, NotificationManager, SettingsOperations, checkForChanges, renderExclusionList);
}

function setupExclusionHandlers(currentSettings: any, NotificationManager: any, SettingsOperations: any, checkForChanges: () => void, renderExclusionList: Function) {
  (window as any).toggleExclusion = function(index: number) {
    if (!currentSettings || !currentSettings.excludedPatterns) return;

    const updatedPatterns = [...currentSettings.excludedPatterns];
    updatedPatterns[index].enabled = !updatedPatterns[index].enabled;

    SettingsOperations.save({ excludedPatterns: updatedPatterns })
      .then((result: any) => {
        if (result.success) {
          Object.assign(currentSettings, result.data);
          renderExclusionList(result.data.excludedPatterns, currentSettings, NotificationManager, SettingsOperations, checkForChanges);
          const status = updatedPatterns[index].enabled ? 'enabled' : 'disabled';
          NotificationManager.success('Exclusion ' + status);
          checkForChanges();
        }
      });
  };

  (window as any).deleteExclusion = function(index: number) {
    if (!currentSettings || !currentSettings.excludedPatterns) return;

    if (!confirm('Delete this exclusion pattern?')) return;

    const updatedPatterns = currentSettings.excludedPatterns.filter((_: any, i: number) => i !== index);

    SettingsOperations.save({ excludedPatterns: updatedPatterns })
      .then((result: any) => {
        if (result.success) {
          Object.assign(currentSettings, result.data);
          renderExclusionList(result.data.excludedPatterns, currentSettings, NotificationManager, SettingsOperations, checkForChanges);
          NotificationManager.success('Exclusion deleted');
          checkForChanges();
        }
      });
  };
}

export function addExclusion(currentSettings: any, NotificationManager: any, SettingsOperations: any, checkForChanges: () => void, renderExclusionList: Function) {
  if (!currentSettings) return;

  const patternInput = document.getElementById('newExclusionPattern') as HTMLInputElement;
  const typeSelect = document.getElementById('newExclusionType') as HTMLSelectElement;

  const pattern = patternInput.value.trim();
  if (!pattern) {
    NotificationManager.error('Please enter a pattern');
    return;
  }

  // Validate pattern format
  if (!isValidPattern(pattern)) {
    NotificationManager.error('Invalid pattern. Use: example.com, *.example.com, or example.com/path/*');
    return;
  }

  const newPattern = {
    pattern,
    type: typeSelect.value as 'domain' | 'subdomain' | 'uri',
    enabled: true,
    addedDate: Date.now()
  };

  const updatedPatterns = [...(currentSettings.excludedPatterns || []), newPattern];

  // Update settings
  SettingsOperations.save({ excludedPatterns: updatedPatterns })
    .then((result: any) => {
      if (result.success) {
        Object.assign(currentSettings, result.data);
        renderExclusionList(result.data.excludedPatterns, currentSettings, NotificationManager, SettingsOperations, checkForChanges);
        patternInput.value = '';
        NotificationManager.success('Exclusion added');
        checkForChanges();
      }
    });
}

function isValidPattern(pattern: string): boolean {
  // Allow basic patterns: example.com, *.example.com, example.com/path/*
  const domainPattern = /^(\*\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  const uriPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}\/.*$/i;

  return domainPattern.test(pattern) || uriPattern.test(pattern);
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
