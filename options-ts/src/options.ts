// Better Tabs AI - Settings Page (TypeScript)
import './options.css';
import {
  SettingsOperations,
  NotificationManager,
  type Settings,
} from '@shared';

let currentSettings: Settings | null = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  // Confidence threshold slider
  const confidenceSlider = document.getElementById(
    'minConfidenceThreshold'
  ) as HTMLInputElement;
  confidenceSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    updateConfidenceDisplay(parseFloat(target.value));
  });

  // Save button
  document
    .getElementById('saveBtn')
    ?.addEventListener('click', saveSettings);

  // Reset button
  document
    .getElementById('resetBtn')
    ?.addEventListener('click', resetSettings);

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
    maxSuggestions: parseInt(getData('maxSuggestions') || '10'),

    // UI Preferences
    showConfidenceScores: getChecked('showConfidenceScores'),
    showInlineSuggestions: getChecked('showInlineSuggestions'),
    defaultGroupColor: getData('defaultGroupColor') as any,

    // Performance
    enableContentAnalysis: getChecked('enableContentAnalysis'),
    maxConcurrentAnalysis: parseInt(getData('maxConcurrentAnalysis') || '10'),
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
    } else {
      NotificationManager.error(`Failed to save settings: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    NotificationManager.error('Error saving settings');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Settings';
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
