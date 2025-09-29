# Gemini Nano Setup Guide for Chrome Extensions

## Quick Answer: You DON'T need API keys

Gemini Nano runs locally in Chrome - no external API keys required.

## Required Setup Steps

### 1. ✅ Check Chrome Version

- Need Chrome 118 or higher
- Check: chrome://version

### 2. 🚩 Enable Chrome Flags (CRITICAL)

1. Go to: \chrome://flags\
2. Search for: **\
Prompt
API
for
Gemini
Nano\**
3. Set to: **\Enabled\** (NOT \Default\)
4. Also enable: **\Optimization
Guide
On
Device
Model\**
   - Go to: \chrome://flags/#optimization-guide-on-device-model\
   - Set to: **\Enabled\**
5. **RESTART CHROME COMPLETELY** (close all windows)

### 3. 💾 System Requirements Check

- **OS**: Windows 10/11, macOS 13+, or Linux (NOT mobile)
- **GPU**: 4GB+ VRAM (check Task Manager > Performance > GPU)
- **Storage**: 22GB+ free space on Chrome profile drive
- **Network**: Unmetered connection (WiFi, not cellular)

### 4. 🔍 Verify Installation

1. Go to: \chrome://on-device-internals\
2. Check \Model
Status\ tab
3. Look for Gemini Nano status
4. If downloading, wait 10+ minutes

### 5. 🧪 Test AI Access

1. Open DevTools (F12)
2. Go to Console tab
3. Run: \wait LanguageModel.availability()\
4. Should return: \available\ (good) or \downloadable\ (needs download)

## Test Commands for DevTools Console

\\\javascript
// Check availability
await LanguageModel.availability()

// Create a session (with required language specification)
const session = await LanguageModel.create({
  expectedInputs: [{ type: \text\, languages: [\en\] }],
  expectedOutputs: [{ type: \text\, languages: [\en\] }]
});

// Test a simple prompt
const response = await session.prompt('Say hello');
console.log('Response:', response);

// Clean up
session.destroy();
\\\

## Common Issues & Solutions

### \LanguageModel
is
not
defined\

- Chrome flags not enabled properly
- Need to restart Chrome completely
- Try incognito mode to test

### \No
output
language
was
specified\

- ✅ This is actually GOOD news - the API is working!
- Use the language specification in session creation (see test commands above)

### \unavailable\ status

- Check system requirements (especially VRAM)
- Ensure unmetered network connection
- May need to wait for gradual rollout

### Model shows \downloading\ forever

- Check available storage space
- Restart Chrome and wait
- Try different network connection

### Extension can't access AI

- Extension loaded correctly?
- Try reloading extension
- Check for JavaScript errors in DevTools

## Advanced: Origin Trial (if flags don't work)

If Chrome flags don't work, you may need an origin trial token:

1. Get your extension ID from \chrome://extensions\
2. Visit: https://developer.chrome.com/origintrials/#/trials/active
3. Look for \Prompt
API\ trial
4. Register with your extension ID
5. Add token to manifest.json:
   \\\json
   \trial_tokens\: [\YOUR_TOKEN_HERE\]
   \\\

## Verification Commands

Run these in Chrome DevTools Console:

\\\javascript
// Check if API exists
console.log('LanguageModel available:', typeof LanguageModel !== 'undefined');

// Check availability
if (typeof LanguageModel !== 'undefined') {
  LanguageModel.availability().then(status => 
    console.log('Status:', status)
  );
}

// List all globals with 'ai' or 'language'
console.log('AI-related globals:', 
  Object.keys(window).filter(k => 
    k.toLowerCase().includes('ai') || 
    k.toLowerCase().includes('language')
  )
);
\\\

## Still Not Working?

1. Try Chrome Canary (beta version)
2. Check if your region has access
3. File bug report with Chrome team
4. Use alternative: OpenAI API as fallback

## No API Keys Needed! ✅

Gemini Nano is:

- ✅ Built into Chrome
- ✅ Runs locally on your device
- ✅ No internet required after download
- ✅ No API keys or accounts needed
- ✅ Completely free

The challenge is just getting Chrome configured correctly!

