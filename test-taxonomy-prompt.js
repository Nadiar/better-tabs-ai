#!/usr/bin/env node

/**
 * Test Hierarchical Taxonomy Prompt with Gemini CLI
 *
 * Uses real tab data from user's browser session to test
 * whether Gemini Nano can follow our hierarchical format.
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Real tab data from user's debug output
const TEST_TABS = [
  {
    title: "Kubernetes IngressRoute | Traefik | v2.4",
    url: "doc.traefik.io/traefik/v2.4/providers/kubernetes-crd/",
    description: null
  },
  {
    title: "Baby Ketten Klub - Google Maps",
    url: "www.google.com/maps",
    description: null
  },
  {
    title: "private karaoke rooms Baby Ketten Club - Google Search",
    url: "www.google.com/search",
    description: null
  },
  {
    title: "r/politics",
    url: "www.reddit.com/r/politics/",
    description: null
  },
  {
    title: "anansi-project/comicinfo: ComicInfo.xml's new home",
    url: "github.com/anansi-project/comicinfo/tree/main",
    description: null
  },
  {
    title: "MetronInfo | The Metron Project",
    url: "metron-project.github.io/docs/category/metroninfo",
    description: null
  },
  {
    title: "Thanks for your order - Walmart.com",
    url: "www.walmart.com/thankyou",
    description: null
  },
  {
    title: "Amazon Thanks You",
    url: "www.amazon.com/gp/buy/thankyou/handlers/display.html",
    description: null
  }
];

// Current hierarchical prompt from service worker
const HIERARCHICAL_PROMPT = (title, url) => `Extract 1-3 hierarchical topic taxonomies for this page.

Title: "${title}"
URL: ${url}

CRITICAL FORMAT RULES:
1. Each taxonomy: "specific:0.XX > general:0.XX > broader:0.XX"
2. Multiple taxonomies separated by " | " (space-pipe-space)
3. Hierarchy levels separated by " > " (space-greater-space)
4. NO other punctuation (commas, periods, etc.)

CORRECT EXAMPLES:
"baby-ketten-klub:0.95 > karaoke:0.85 | portland:0.8 > oregon:0.6"
"better-tabs-ai:0.95 > chrome-extension:0.9 | github:0.95 > code-hosting:0.8"
"reddit:0.9 > social-media:0.7 | politics:0.9 > news:0.8"

WRONG (do NOT do this):
"Kubernetes | Traefik | Networking" (missing confidence, wrong format)
"kubernetes,traefik,networking" (commas not allowed)
"kubernetes:0.9, traefik:0.8" (commas not allowed)

Return ONLY the formatted taxonomy string, nothing else.`;

// Simplified flat prompt (fallback)
const FLAT_PROMPT = (title, url) => `Extract 1-3 specific topic keywords with confidence (0-1) for this page.

Title: "${title}"
URL: ${url}

Format: "keyword:confidence,keyword:confidence"
Be SPECIFIC, not generic. Higher confidence = more specific/unique topic.

Examples:
- "github:0.9,better-tabs-ai:0.95" (very specific project)
- "reddit:0.8,politics:0.9" (specific subreddit)
- "karaoke:0.95,portland:0.8" (very specific activity + location)

Return ONLY the formatted string, nothing else.`;

async function testPrompt(tab, promptFn, promptName) {
  const prompt = promptFn(tab.title, tab.url);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${tab.title}`);
  console.log(`Prompt Type: ${promptName}`);
  console.log(`${'='.repeat(80)}`);

  try {
    // Use gemini CLI to test the prompt
    // Note: This uses the cloud Gemini API, not Gemini Nano
    // But it should give us insights into format compliance
    const { stdout, stderr } = await execAsync(
      `echo ${JSON.stringify(prompt)} | gemini chat --model gemini-2.0-flash-exp`,
      { maxBuffer: 1024 * 1024 }
    );

    if (stderr) {
      console.log('⚠️  Warnings:', stderr);
    }

    const response = stdout.trim();
    console.log('\n📝 AI Response:');
    console.log(response);

    // Validate format
    if (promptName === 'Hierarchical') {
      const hasCorrectDelimiters = response.includes('>') || response.includes('|');
      const hasConfidence = /:\d+\.\d+/.test(response);
      const hasWrongCommas = response.includes(',') && !response.includes('>');

      console.log('\n✅ Validation:');
      console.log(`  - Uses > or | delimiters: ${hasCorrectDelimiters ? '✓' : '✗'}`);
      console.log(`  - Has confidence scores: ${hasConfidence ? '✓' : '✗'}`);
      console.log(`  - No incorrect commas: ${!hasWrongCommas ? '✓' : '✗'}`);

      if (hasCorrectDelimiters && hasConfidence && !hasWrongCommas) {
        console.log('\n🎉 FORMAT CORRECT!');
      } else {
        console.log('\n❌ FORMAT VIOLATION');
      }
    } else {
      const hasCommas = response.includes(',');
      const hasConfidence = /:\d+\.\d+/.test(response);

      console.log('\n✅ Validation:');
      console.log(`  - Uses comma delimiters: ${hasCommas ? '✓' : '✗'}`);
      console.log(`  - Has confidence scores: ${hasConfidence ? '✓' : '✗'}`);

      if (hasCommas && hasConfidence) {
        console.log('\n🎉 FORMAT CORRECT!');
      } else {
        console.log('\n❌ FORMAT VIOLATION');
      }
    }

    return response;

  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Hierarchical Taxonomy Prompts with Gemini');
  console.log(`Testing ${TEST_TABS.length} tabs with 2 different prompt styles\n`);

  // Test a few tabs with both prompts
  const testSamples = TEST_TABS.slice(0, 3); // Test first 3 tabs

  for (const tab of testSamples) {
    // Test hierarchical prompt
    await testPrompt(tab, HIERARCHICAL_PROMPT, 'Hierarchical');

    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test flat prompt for comparison
    await testPrompt(tab, FLAT_PROMPT, 'Flat');

    // Wait before next tab
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 Testing Complete!');
  console.log('='.repeat(80));
  console.log('\nNext Steps:');
  console.log('1. Review which prompt format gets better AI compliance');
  console.log('2. Check if hierarchical format is consistently followed');
  console.log('3. Update service-worker.js with best-performing prompt');
}

main().catch(console.error);
