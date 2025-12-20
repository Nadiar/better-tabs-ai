"""
Simple Screenshot Generator for Better Tabs AI
Creates basic documentation screenshots using mock interfaces
"""
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def setup_chrome_driver():
    """Setup Chrome for screenshot capture"""
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--start-maximized')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--force-device-scale-factor=1')
    options.add_argument('--disable-web-security')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=options)
    return driver


def capture_screenshot(driver, filename, description=""):
    """Capture and save screenshot"""
    screenshots_dir = Path("screenshots")
    screenshots_dir.mkdir(exist_ok=True)
    
    filepath = screenshots_dir / filename
    driver.save_screenshot(str(filepath))
    print(f"📸 Captured: {filename} - {description}")
    return filepath


def create_ai_suggestions_demo(driver):
    """Create AI suggestions demo screenshot"""
    print("\n💡 Creating AI Suggestions Demo...")
    
    # Load the interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)  # Allow for full loading
        
        # Inject enhanced AI suggestions styling and content
        driver.execute_script("""
            // Add comprehensive styling for AI features
            const style = document.createElement('style');
            style.textContent = `
                .ai-suggestion-demo {
                    border: 2px dashed #3b82f6 !important;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.05)) !important;
                    margin: 12px 0;
                    padding: 16px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                }
                
                .suggestion-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .suggestion-badges {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .suggested-badge {
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                }
                
                .confidence-badge {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }
                
                .suggestion-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .btn-suggestion {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .btn-suggestion.create {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }
                
                .btn-suggestion.create:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
                }
                
                .btn-suggestion.dismiss {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }
                
                .btn-suggestion.dismiss:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
                }
                
                .suggestion-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }
                
                .suggested-tabs {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 8px;
                    margin-top: 12px;
                }
                
                .suggested-tab {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.8);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 8px;
                    gap: 8px;
                    transition: all 0.2s ease;
                }
                
                .suggested-tab:hover {
                    background: rgba(255, 255, 255, 0.95);
                    border-color: rgba(59, 130, 246, 0.4);
                    transform: translateY(-1px);
                }
                
                .tab-favicon {
                    width: 16px;
                    height: 16px;
                    border-radius: 2px;
                }
                
                .tab-info {
                    flex: 1;
                }
                
                .tab-title {
                    font-weight: 600;
                    color: #374151;
                    font-size: 14px;
                    margin-bottom: 2px;
                }
                
                .tab-domain {
                    color: #6b7280;
                    font-size: 12px;
                }
                
                .ai-sparkle {
                    color: #f59e0b;
                    margin-left: 8px;
                    animation: sparkle 2s ease-in-out infinite;
                }
                
                @keyframes sparkle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }
                
                .suggestion-description {
                    color: #6b7280;
                    font-size: 13px;
                    margin-top: 4px;
                    font-style: italic;
                }
            `;
            document.head.appendChild(style);
            
            // Find a container to add the suggestion to
            const mainContent = document.querySelector('.main-content') || 
                               document.querySelector('.groups-column') || 
                               document.querySelector('body');
                               
            if (mainContent) {
                const suggestionDemo = document.createElement('div');
                suggestionDemo.className = 'ai-suggestion-demo';
                suggestionDemo.innerHTML = `
                    <div class="suggestion-header">
                        <div>
                            <div class="suggestion-badges">
                                <span class="suggested-badge">AI Suggested</span>
                                <span class="confidence-badge">92% confident</span>
                                <span class="ai-sparkle">✨</span>
                            </div>
                            <h3 class="suggestion-title">Social Media & Communication</h3>
                            <p class="suggestion-description">AI detected social networking and messaging patterns</p>
                        </div>
                        <div class="suggestion-actions">
                            <button class="btn-suggestion create">✓ Create Group</button>
                            <button class="btn-suggestion dismiss">✗ Dismiss</button>
                        </div>
                    </div>
                    <div class="suggested-tabs">
                        <div class="suggested-tab">
                            <img class="tab-favicon" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234267B2'><path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'/></svg>">
                            <div class="tab-info">
                                <div class="tab-title">Facebook</div>
                                <div class="tab-domain">facebook.com</div>
                            </div>
                        </div>
                        <div class="suggested-tab">
                            <img class="tab-favicon" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231DA1F2'><path d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'/></svg>">
                            <div class="tab-info">
                                <div class="tab-title">Twitter / X</div>
                                <div class="tab-domain">x.com</div>
                            </div>
                        </div>
                        <div class="suggested-tab">
                            <img class="tab-favicon" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4500'><path d='M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z'/></svg>">
                            <div class="tab-info">
                                <div class="tab-title">Reddit</div>
                                <div class="tab-domain">reddit.com</div>
                            </div>
                        </div>
                        <div class="suggested-tab">
                            <img class="tab-favicon" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF0000'><path d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'/></svg>">
                            <div class="tab-info">
                                <div class="tab-title">YouTube</div>
                                <div class="tab-domain">youtube.com</div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Insert at the top of the main content
                if (mainContent.firstChild) {
                    mainContent.insertBefore(suggestionDemo, mainContent.firstChild);
                } else {
                    mainContent.appendChild(suggestionDemo);
                }
            }
        """)
        
        time.sleep(2)
        capture_screenshot(driver, "06_ai_suggestions_enhanced.png", 
                          "Enhanced AI suggestions with confidence scores and modern styling")
        
    except Exception as e:
        print(f"⚠️ AI suggestions demo error: {e}")


def create_search_demo(driver):
    """Create search functionality demo"""
    print("\n🔍 Creating Search Demo...")
    
    # Load the interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)
        
        # Add search bar to header
        driver.execute_script("""
            const header = document.querySelector('.main-header') || document.querySelector('header') || document.querySelector('body');
            if (header) {
                // Add search styling
                const style = document.createElement('style');
                style.textContent = `
                    .search-demo-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1000;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        border-radius: 12px;
                        padding: 16px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        min-width: 300px;
                    }
                    
                    .search-bar {
                        display: flex;
                        align-items: center;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-radius: 8px;
                        padding: 12px 16px;
                        margin-bottom: 12px;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    }
                    
                    .search-icon {
                        margin-right: 10px;
                        font-size: 16px;
                    }
                    
                    .search-input {
                        background: transparent;
                        border: none;
                        color: white;
                        outline: none;
                        flex: 1;
                        font-size: 14px;
                        font-weight: 500;
                    }
                    
                    .search-input::placeholder {
                        color: rgba(255, 255, 255, 0.7);
                    }
                    
                    .search-clear {
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        margin-left: 8px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s ease;
                    }
                    
                    .search-clear:hover {
                        background: rgba(255, 255, 255, 0.3);
                        transform: scale(1.1);
                    }
                    
                    .search-results {
                        font-size: 13px;
                        color: #6b7280;
                        margin-bottom: 8px;
                    }
                    
                    .search-filters {
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                    
                    .filter-chip {
                        background: #f3f4f6;
                        border: 1px solid #d1d5db;
                        border-radius: 16px;
                        padding: 4px 12px;
                        font-size: 12px;
                        color: #374151;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    
                    .filter-chip.active {
                        background: #667eea;
                        color: white;
                        border-color: #667eea;
                    }
                    
                    .filter-chip:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                `;
                document.head.appendChild(style);
                
                const searchContainer = document.createElement('div');
                searchContainer.className = 'search-demo-container';
                searchContainer.innerHTML = `
                    <div class="search-bar">
                        <span class="search-icon">🔍</span>
                        <input type="text" class="search-input" placeholder="Search tabs..." value="social media">
                        <button class="search-clear">×</button>
                    </div>
                    <div class="search-results">Found 4 tabs matching "social media"</div>
                    <div class="search-filters">
                        <span class="filter-chip active">All</span>
                        <span class="filter-chip">Grouped</span>
                        <span class="filter-chip">Ungrouped</span>
                        <span class="filter-chip">Duplicates</span>
                    </div>
                `;
                
                document.body.appendChild(searchContainer);
            }
        """)
        
        time.sleep(1)
        capture_screenshot(driver, "07_search_functionality.png", 
                          "Search bar with real-time filtering and result counts")
        
    except Exception as e:
        print(f"⚠️ Search demo error: {e}")


def main():
    """Main screenshot generation function"""
    print("🎬 Better Tabs AI - Simple Screenshot Generator")
    print("=" * 55)
    
    driver = setup_chrome_driver()
    
    try:
        # Create additional demo screenshots
        create_ai_suggestions_demo(driver)
        create_search_demo(driver)
        
        print("\n✅ Additional screenshots generated!")
        
        # List all screenshots
        screenshots_dir = Path("screenshots")
        if screenshots_dir.exists():
            files = list(screenshots_dir.glob("*.png"))
            print(f"\n📸 Total screenshots: {len(files)}")
            for file in sorted(files):
                print(f"   • {file.name}")
        
    except Exception as e:
        print(f"❌ Error during screenshot generation: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        driver.quit()


if __name__ == "__main__":
    main()