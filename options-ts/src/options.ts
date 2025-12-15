// Better Tabs AI - Settings Page (TypeScript)
import './options.css';
import {
  SettingsOperations,
  NotificationManager,
  type Settings,
  type ExcludePattern,
} from '@shared';

let currentSettings: Settings | null = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function checkForChanges() {
  if (!currentSettings) return;

  const formData = getFormData();
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  if (!saveBtn) return;

  // Check if any field has changed
  let hasChanges = false;
  for (const key in formData) {
    const formValue = (formData as any)[key];
    const currentValue = (currentSettings as any)[key];

    // Handle undefined/null comparison
    if (formValue !== currentValue) {
      hasChanges = true;
      break;
    }
  }

  saveBtn.disabled = !hasChanges;
}

function setupEventListeners() {
  // Group confidence threshold slider
  const confidenceSlider = document.getElementById(
    'minConfidenceThreshold'
  ) as HTMLInputElement;
  confidenceSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    updateConfidenceDisplay(parseFloat(target.value));
    checkForChanges();
  });

  // Tab confidence threshold slider
  const tabConfidenceSlider = document.getElementById(
    'minTabConfidence'
  ) as HTMLInputElement;
  tabConfidenceSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    updateTabConfidenceDisplay(parseFloat(target.value));
    checkForChanges();
  });

  // Min match score slider
  const matchScoreSlider = document.getElementById('minMatchScore') as HTMLInputElement;
  matchScoreSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    updateMatchScoreDisplay(parseFloat(target.value));
    checkForChanges();
  });

  // Skip low confidence slider
  const skipLowConfSlider = document.getElementById('skipLowConfidenceTabs') as HTMLInputElement;
  skipLowConfSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    updateSkipLowConfDisplay(parseFloat(target.value));
    checkForChanges();
  });

  // Exclusion list
  document.getElementById('addExclusionBtn')?.addEventListener('click', addExclusion);

  // Add change listeners to all form fields
  const formFields = [
    'maxSuggestions',
    'showConfidenceScores',
    'showInlineSuggestions',
    'defaultGroupColor',
    'showAdvancedOptions',
    'enableContentAnalysis',
    'maxConcurrentAnalysis',
    'cacheDuration',
    'customAIPromptRules',
    'minMatchScore',
    'minTabsPerGroup',
    'skipLowConfidenceTabs'
  ];

  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', checkForChanges);
      field.addEventListener('change', checkForChanges);
    }
  });

  // Save button
  document
    .getElementById('saveBtn')
    ?.addEventListener('click', saveSettings);

  // Reset button
  document
    .getElementById('resetBtn')
    ?.addEventListener('click', resetSettings);

  // Restore default prompt button
  document
    .getElementById('restoreDefaultPromptBtn')
    ?.addEventListener('click', restoreDefaultPrompt);

  // Cancel button
  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    window.close();
  });
}

async function loadSettings() {
  try {
    const result = await SettingsOperations.get();

    if (result.success) {
      currentSettings = result.data;
      populateForm(currentSettings);
      updateStatusDisplay(currentSettings);
      checkForChanges(); // Disable save button initially
    } else {
      NotificationManager.error('Failed to load settings');
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    NotificationManager.error('Failed to load settings');
  }
}

function populateForm(settings: Settings) {
  // AI Analysis
  const confidenceSlider = document.getElementById(
    'minConfidenceThreshold'
  ) as HTMLInputElement;
  if (confidenceSlider) {
    confidenceSlider.value = settings.minConfidenceThreshold.toString();
    updateConfidenceDisplay(settings.minConfidenceThreshold);
  }

  const tabConfidenceSlider = document.getElementById(
    'minTabConfidence'
  ) as HTMLInputElement;
  if (tabConfidenceSlider) {
    tabConfidenceSlider.value = settings.minTabConfidence.toString();
    updateTabConfidenceDisplay(settings.minTabConfidence);
  }

  const maxSuggestionsInput = document.getElementById(
    'maxSuggestions'
  ) as HTMLInputElement;
  if (maxSuggestionsInput) {
    maxSuggestionsInput.value = settings.maxSuggestions.toString();
  }

  // UI Preferences
  const showConfidenceCheckbox = document.getElementById(
    'showConfidenceScores'
  ) as HTMLInputElement;
  if (showConfidenceCheckbox) {
    showConfidenceCheckbox.checked = settings.showConfidenceScores;
  }

  const showInlineCheckbox = document.getElementById(
    'showInlineSuggestions'
  ) as HTMLInputElement;
  if (showInlineCheckbox) {
    showInlineCheckbox.checked = settings.showInlineSuggestions;
  }

  const colorSelect = document.getElementById(
    'defaultGroupColor'
  ) as HTMLSelectElement;
  if (colorSelect) {
    colorSelect.value = settings.defaultGroupColor;
  }

  const showAdvancedCheckbox = document.getElementById(
    'showAdvancedOptions'
  ) as HTMLInputElement;
  if (showAdvancedCheckbox) {
    showAdvancedCheckbox.checked = settings.showAdvancedOptions;
  }

  // Performance
  const enableContentCheckbox = document.getElementById(
    'enableContentAnalysis'
  ) as HTMLInputElement;
  if (enableContentCheckbox) {
    enableContentCheckbox.checked = settings.enableContentAnalysis;
  }

  const maxConcurrentInput = document.getElementById(
    'maxConcurrentAnalysis'
  ) as HTMLInputElement;
  if (maxConcurrentInput) {
    maxConcurrentInput.value = settings.maxConcurrentAnalysis.toString();
  }

  // Cache duration (if element exists)
  const cacheDurationInput = document.getElementById(
    'cacheDuration'
  ) as HTMLInputElement;
  if (cacheDurationInput && settings.cacheDuration !== undefined) {
    cacheDurationInput.value = settings.cacheDuration.toString();
  }

  // Custom AI Prompt Rules
  const customPromptTextarea = document.getElementById(
    'customAIPromptRules'
  ) as HTMLTextAreaElement;
  if (customPromptTextarea) {
    customPromptTextarea.value = settings.customAIPromptRules || '';
  }

  // Advanced Grouping Parameters
  const minMatchScoreSlider = document.getElementById('minMatchScore') as HTMLInputElement;
  if (minMatchScoreSlider && settings.minMatchScore !== undefined) {
    minMatchScoreSlider.value = settings.minMatchScore.toString();
    updateMatchScoreDisplay(settings.minMatchScore);
  }

  const minTabsPerGroupInput = document.getElementById('minTabsPerGroup') as HTMLInputElement;
  if (minTabsPerGroupInput && settings.minTabsPerGroup !== undefined) {
    minTabsPerGroupInput.value = settings.minTabsPerGroup.toString();
  }

  const skipLowConfSlider = document.getElementById('skipLowConfidenceTabs') as HTMLInputElement;
  if (skipLowConfSlider && settings.skipLowConfidenceTabs !== undefined) {
    skipLowConfSlider.value = settings.skipLowConfidenceTabs.toString();
    updateSkipLowConfDisplay(settings.skipLowConfidenceTabs);
  }

  // Exclusion List
  if (settings.excludedPatterns) {
    renderExclusionList(settings.excludedPatterns);
  }
}

function updateConfidenceDisplay(value: number) {
  const valueDisplay = document.getElementById('confidenceValue');
  if (valueDisplay) {
    valueDisplay.textContent = value.toFixed(1);
  }

  // Update hint text
  const hint = document.getElementById('confidenceHint');
  if (hint) {
    if (value <= 0.5) {
      hint.textContent = 'Aggressive (more suggestions)';
    } else if (value <= 0.7) {
      hint.textContent = 'Moderate';
    } else {
      hint.textContent = 'Conservative (fewer suggestions)';
    }
  }
}

function updateTabConfidenceDisplay(value: number) {
  const valueDisplay = document.getElementById('tabConfidenceValue');
  if (valueDisplay) {
    valueDisplay.textContent = value.toFixed(1);
  }

  // Update hint text
  const hint = document.getElementById('tabConfidenceHint');
  if (hint) {
    if (value <= 0.4) {
      hint.textContent = 'Include uncertain tabs';
    } else if (value <= 0.7) {
      hint.textContent = 'Moderate certainty';
    } else {
      hint.textContent = 'Only very certain tabs';
    }
  }
}

function getFormData(): Partial<Settings> {
  const getData = (id: string): string | null => {
    const element = document.getElementById(id) as
      | HTMLInputElement
      | HTMLSelectElement;
    return element?.value || null;
  };

  const getChecked = (id: string): boolean => {
    const element = document.getElementById(id) as HTMLInputElement;
    return element?.checked ?? false;
  };

  const settings: Partial<Settings> = {
    // AI Analysis
    minConfidenceThreshold: parseFloat(
      getData('minConfidenceThreshold') || '0.5'
    ),
    minTabConfidence: parseFloat(
      getData('minTabConfidence') || '0.5'
    ),
    maxSuggestions: parseInt(getData('maxSuggestions') || '10'),

    // UI Preferences
    showConfidenceScores: getChecked('showConfidenceScores'),
    showInlineSuggestions: getChecked('showInlineSuggestions'),
    defaultGroupColor: getData('defaultGroupColor') as any,
    showAdvancedOptions: getChecked('showAdvancedOptions'),

    // Performance (deprecated)
    enableContentAnalysis: getChecked('enableContentAnalysis'),
    maxConcurrentAnalysis: parseInt(getData('maxConcurrentAnalysis') || '10'),

    // Custom AI Prompt
    customAIPromptRules: getData('customAIPromptRules') || undefined,


    // Advanced Grouping Parameters
    minMatchScore: parseFloat(getData('minMatchScore') || '0.7'),
    minTabsPerGroup: parseInt(getData('minTabsPerGroup') || '2'),
    skipLowConfidenceTabs: parseFloat(getData('skipLowConfidenceTabs') || '0.3'),

    // Exclusion list is managed separately, not from form
    excludedPatterns: currentSettings?.excludedPatterns || [],
  };

  // Cache duration (if element exists)
  const cacheDuration = getData('cacheDuration');
  if (cacheDuration) {
    settings.cacheDuration = parseInt(cacheDuration);
  }

  return settings;
}

async function saveSettings() {
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  if (!saveBtn) return;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const newSettings = getFormData();
    const result = await SettingsOperations.save(newSettings);

    if (result.success) {
      currentSettings = result.data;
      updateStatusDisplay(result.data);
      NotificationManager.success('Settings saved successfully!');
      checkForChanges(); // Disable save button after successful save
    } else {
      NotificationManager.error(`Failed to save settings: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    NotificationManager.error('Error saving settings');
  } finally {
    saveBtn.textContent = '💾 Save Settings';
    // Don't re-enable here, let checkForChanges handle it
  }
}

async function restoreDefaultPrompt() {
  if (!confirm('Restore default AI grouping rules? This will overwrite your custom rules.')) {
    return;
  }

  try {
    // Get default prompt from background
    const response = await chrome.runtime.sendMessage({ action: 'getDefaultPromptRules' });

    if (response.success) {
      const customPromptTextarea = document.getElementById(
        'customAIPromptRules'
      ) as HTMLTextAreaElement;
      if (customPromptTextarea) {
        customPromptTextarea.value = response.defaultRules;
        NotificationManager.success('Default AI rules restored. Click Save to apply.');
        checkForChanges(); // Enable save button
      }
    }
  } catch (error) {
    console.error('Error restoring default prompt:', error);
    NotificationManager.error('Error restoring default rules');
  }
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
    return;
  }

  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  if (!resetBtn) return;

  resetBtn.disabled = true;
  resetBtn.textContent = 'Resetting...';

  try {
    const result = await SettingsOperations.reset();

    if (result.success) {
      currentSettings = result.data;
      populateForm(result.data);
      updateStatusDisplay(result.data);
      NotificationManager.success('Settings reset to defaults');
      checkForChanges(); // Disable save button after reset
    } else {
      NotificationManager.error(`Error resetting settings: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    NotificationManager.error('Error resetting settings');
  } finally {
    resetBtn.disabled = false;
    resetBtn.textContent = '🔄 Reset to Defaults';
  }
}

function updateStatusDisplay(settings: Settings) {
  const statusDiv = document.getElementById('statusDisplay');
  if (!statusDiv) return;

  const html = `
    <p><strong>Current Configuration:</strong></p>
    <p>Confidence Threshold: <code>${settings.minConfidenceThreshold.toFixed(
      1
    )}</code> (${getThresholdLabel(settings.minConfidenceThreshold)})</p>
    <p>Max Suggestions: <code>${settings.maxSuggestions}</code></p>
    <p>Content Analysis: <code>${
      settings.enableContentAnalysis ? 'Enabled' : 'Disabled'
    }</code></p>
    <p>Show Confidence Scores: <code>${
      settings.showConfidenceScores ? 'Yes' : 'No'
    }</code></p>
    <p style="margin-top: 1rem; font-size: 0.8125rem; color: #94a3b8;">
      Changes take effect immediately for new analyses
    </p>
  `;

  statusDiv.innerHTML = html;
}

function getThresholdLabel(value: number): string {
  if (value <= 0.5) return 'Aggressive';
  if (value <= 0.7) return 'Moderate';
  return 'Conservative';
}

// Toast notifications handled by NotificationManager
// No need for custom toast function

// ============================================================================
// Display Update Functions for New Sliders
// ============================================================================

function updateMatchScoreDisplay(value: number) {
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

function updateSkipLowConfDisplay(value: number) {
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

// ============================================================================
// Exclusion List Management
// ============================================================================

function renderExclusionList(patterns: any[]) {
  const listContainer = document.getElementById('exclusionList');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (!patterns || patterns.length === 0) {
    return; // CSS ::before will show empty message
  }

  patterns.forEach((pattern: any, index: number) => {
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
               onchange="window.toggleExclusion(${index})">
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
        <button onclick="window.deleteExclusion(${index})" class="delete-btn">🗑 Delete</button>
      </div>
    `;

    listContainer.appendChild(item);
  });
}

function addExclusion() {
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
    .then(result => {
      if (result.success) {
        currentSettings = result.data;
        renderExclusionList(result.data.excludedPatterns || []);
        patternInput.value = '';
        NotificationManager.success('Exclusion added');
        checkForChanges();
      }
    });
}

// Global handlers for onclick in HTML
(window as any).toggleExclusion = function(index: number) {
  if (!currentSettings || !currentSettings.excludedPatterns) return;

  const updatedPatterns = [...currentSettings.excludedPatterns];
  updatedPatterns[index].enabled = !updatedPatterns[index].enabled;

  SettingsOperations.save({ excludedPatterns: updatedPatterns })
    .then(result => {
      if (result.success) {
        currentSettings = result.data;
        renderExclusionList(result.data.excludedPatterns || []);
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
    .then(result => {
      if (result.success) {
        currentSettings = result.data;
        renderExclusionList(result.data.excludedPatterns || []);
        NotificationManager.success('Exclusion deleted');
        checkForChanges();
      }
    });
};

function isValidPattern(pattern: string): boolean {
  // Allow basic patterns: example.com, *.example.com, example.com/path/*, localhost, localhost:8080

  // Special case: localhost (with optional port)
  if (/^localhost(:\d+)?$/i.test(pattern)) {
    return true;
  }

  // Domain with TLD: example.com, *.example.com
  const domainPattern = /^(\*\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

  // URI with path: example.com/path/*, localhost/path/*
  const uriPattern = /^([a-z0-9]+([\-\.]{1}[a-z0-9]+)*(\.[a-z]{2,})?|localhost)(:\d+)?\/.*$/i;

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
