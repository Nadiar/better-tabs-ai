// Chrome AI Diagnostic Tool
// Run this in your Chrome DevTools console to diagnose Gemini Nano issues

console.log('🔍 Chrome AI Diagnostic Tool');
console.log('=====================================');

// Check Chrome version
console.log('Chrome Version:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown');

// Check if LanguageModel is available
if (typeof LanguageModel !== 'undefined') {
    console.log('✅ LanguageModel API is available');
    
    // Check availability
    LanguageModel.availability().then(status => {
        console.log('📊 Model Status:', status);
        
        switch(status) {
            case 'available':
                console.log('🟢 SUCCESS: Gemini Nano is ready to use!');
                break;
            case 'downloadable':
                console.log('🟡 NEEDS DOWNLOAD: Model needs to be downloaded');
                console.log('💡 Try creating a session to trigger download');
                break;
            case 'downloading':
                console.log('🟡 DOWNLOADING: Model is currently downloading');
                console.log('💡 Wait for download to complete');
                break;
            case 'unavailable':
                console.log('🔴 UNAVAILABLE: Model cannot be used on this device');
                console.log('💡 Check hardware requirements or Chrome flags');
                break;
        }
    }).catch(error => {
        console.error('❌ Error checking availability:', error);
    });
    
    // Try to get parameters
    try {
        LanguageModel.params().then(params => {
            console.log('📋 Model Parameters:', params);
        }).catch(error => {
            console.error('❌ Error getting parameters:', error);
        });
    } catch (error) {
        console.error('❌ Error accessing params:', error);
    }
    
} else {
    console.log('❌ LanguageModel API is NOT available');
    console.log('💡 Possible issues:');
    console.log('   - Chrome flags not enabled');
    console.log('   - Origin trial token missing');
    console.log('   - Insufficient Chrome version');
}

// Check for other AI APIs
const aiAPIs = ['ai', 'translation', 'summarizer'];
aiAPIs.forEach(api => {
    if (typeof window[api] !== 'undefined') {
        console.log(✅  API available);
    } else {
        console.log(❌  API not available);
    }
});

console.log('');
console.log('🛠️ Next Steps:');
console.log('1. Visit chrome://flags and search for \
Prompt
API\');
console.log('2. Enable \Prompt
API
for
Gemini
Nano\ flag');
console.log('3. Restart Chrome completely');
console.log('4. Check chrome://on-device-internals for model status');
console.log('5. Ensure 4GB+ VRAM and 22GB+ free storage');
console.log('');
console.log('🔗 Useful URLs:');
console.log('   chrome://flags/#prompt-api-for-gemini-nano');
console.log('   chrome://on-device-internals');
console.log('   chrome://extensions');

