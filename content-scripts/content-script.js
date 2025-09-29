// Better Tabs AI - Content Script
// Runs in the context of web pages to extract content for AI analysis

class ContentExtractor {
    constructor() {
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'extractContent') {
                try {
                    const content = this.extractPageContent(message.stage || 'metadata');
                    sendResponse({ success: true, content });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            }
            return true; // Keep message channel open
        });
    }

    extractPageContent(stage = 'metadata') {
        const result = {
            url: window.location.href,
            title: document.title,
            stage: stage
        };

        try {
            // Stage 1: Metadata only (fastest)
            if (stage === 'metadata') {
                result.metadata = this.extractMetadata();
            }
            
            // Stage 2: Basic content (balanced)
            else if (stage === 'basic') {
                result.metadata = this.extractMetadata();
                result.content = this.extractBasicContent();
            }
            
            // Stage 3: Extended content (comprehensive)
            else if (stage === 'extended') {
                result.metadata = this.extractMetadata();
                result.content = this.extractBasicContent();
                result.extended = this.extractExtendedContent();
            }

            return result;
        } catch (error) {
            console.error('Content extraction error:', error);
            return {
                ...result,
                error: error.message,
                metadata: this.extractMetadata() // Always try to get at least metadata
            };
        }
    }

    extractMetadata() {
        const metadata = {
            title: document.title || '',
            domain: window.location.hostname || '',
            pathname: window.location.pathname || '',
            description: '',
            keywords: '',
            author: '',
            type: '',
            siteName: ''
        };

        // Meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metadata.description = metaDesc.content;

        // Meta keywords
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) metadata.keywords = metaKeywords.content;

        // Meta author
        const metaAuthor = document.querySelector('meta[name="author"]');
        if (metaAuthor) metadata.author = metaAuthor.content;

        // Open Graph data
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && !metadata.title) metadata.title = ogTitle.content;

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && !metadata.description) metadata.description = ogDesc.content;

        const ogType = document.querySelector('meta[property="og:type"]');
        if (ogType) metadata.type = ogType.content;

        const ogSiteName = document.querySelector('meta[property="og:site_name"]');
        if (ogSiteName) metadata.siteName = ogSiteName.content;

        // Twitter Card data
        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc && !metadata.description) metadata.description = twitterDesc.content;

        // JSON-LD structured data
        try {
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            const structuredData = [];
            jsonLdScripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    structuredData.push(data);
                } catch (e) {
                    // Ignore invalid JSON-LD
                }
            });
            if (structuredData.length > 0) {
                metadata.structuredData = structuredData;
            }
        } catch (e) {
            // Ignore structured data errors
        }

        return metadata;
    }

    extractBasicContent() {
        const content = {
            headings: [],
            excerpt: '',
            links: [],
            images: []
        };

        // Extract headings (H1-H3)
        const headings = document.querySelectorAll('h1, h2, h3');
        content.headings = Array.from(headings)
            .map(h => ({
                level: parseInt(h.tagName.substring(1)),
                text: h.textContent?.trim() || ''
            }))
            .filter(h => h.text.length > 0)
            .slice(0, 10); // Limit to first 10 headings

        // Extract text excerpt (first 500 characters)
        const bodyText = this.getCleanTextContent();
        content.excerpt = bodyText.substring(0, 500);

        // Extract key links
        const links = document.querySelectorAll('a[href]');
        content.links = Array.from(links)
            .map(link => ({
                text: link.textContent?.trim() || '',
                href: link.href,
                internal: link.hostname === window.location.hostname
            }))
            .filter(link => link.text.length > 0 && link.text.length < 100)
            .slice(0, 20); // Limit to first 20 links

        // Extract key images
        const images = document.querySelectorAll('img[src]');
        content.images = Array.from(images)
            .map(img => ({
                src: img.src,
                alt: img.alt || '',
                title: img.title || ''
            }))
            .filter(img => img.alt || img.title)
            .slice(0, 10); // Limit to first 10 images with descriptions

        return content;
    }

    extractExtendedContent() {
        const extended = {
            fullText: '',
            categories: [],
            forms: [],
            multimedia: []
        };

        // Extract more comprehensive text content
        const bodyText = this.getCleanTextContent();
        extended.fullText = bodyText.substring(0, 2000); // First 2000 characters

        // Detect content categories based on elements
        const categories = new Set();
        
        // Check for e-commerce indicators
        if (document.querySelector('.price, .cart, .buy, [class*="price"], [class*="cart"], [class*="buy"]')) {
            categories.add('shopping');
        }
        
        // Check for news/article indicators
        if (document.querySelector('article, .article, [class*="article"], [class*="news"]')) {
            categories.add('news');
        }
        
        // Check for video content
        if (document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]')) {
            categories.add('video');
        }
        
        // Check for social media indicators
        if (document.querySelector('[class*="social"], [class*="share"], [class*="follow"]')) {
            categories.add('social');
        }
        
        // Check for documentation/help content
        if (document.querySelector('[class*="doc"], [class*="help"], [class*="guide"], [class*="tutorial"]')) {
            categories.add('documentation');
        }

        extended.categories = Array.from(categories);

        // Extract form information
        const forms = document.querySelectorAll('form');
        extended.forms = Array.from(forms).map(form => ({
            action: form.action || '',
            method: form.method || 'get',
            inputs: Array.from(form.querySelectorAll('input, select, textarea')).length
        }));

        // Extract multimedia content
        const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
        const audios = document.querySelectorAll('audio');
        extended.multimedia = {
            videos: videos.length,
            audios: audios.length
        };

        return extended;
    }

    getCleanTextContent() {
        // Create a clone of the document to avoid modifying the original
        const clone = document.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer', 
            '.navigation', '.nav', '.menu', '.sidebar',
            '.advertisement', '.ad', '.ads', '.cookie',
            '[class*="cookie"]', '[class*="ad"]'
        ];
        
        unwantedSelectors.forEach(selector => {
            clone.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Get text content and clean it up
        const text = clone.body?.textContent || '';
        
        // Clean up whitespace and normalize
        return text
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
            .trim();
    }

    // Utility method to determine content confidence
    assessContentQuality(metadata, content) {
        let score = 0;
        let factors = [];

        // Title quality
        if (metadata.title && metadata.title.length > 10) {
            score += 20;
            factors.push('good title');
        }

        // Description quality
        if (metadata.description && metadata.description.length > 20) {
            score += 20;
            factors.push('good description');
        }

        // Content length
        if (content?.excerpt && content.excerpt.length > 100) {
            score += 20;
            factors.push('substantial content');
        }

        // Headings structure
        if (content?.headings && content.headings.length > 0) {
            score += 15;
            factors.push('structured headings');
        }

        // Metadata completeness
        if (metadata.keywords || metadata.author || metadata.type) {
            score += 10;
            factors.push('rich metadata');
        }

        // Structured data
        if (metadata.structuredData && metadata.structuredData.length > 0) {
            score += 15;
            factors.push('structured data');
        }

        return {
            score: Math.min(score, 100),
            confidence: score / 100,
            factors: factors
        };
    }
}

// Initialize content extractor
const contentExtractor = new ContentExtractor();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentExtractor;
}