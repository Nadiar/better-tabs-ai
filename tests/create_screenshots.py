"""
Screenshot Generator for Better Tabs AI
Creates documentation screenshots using mock interfaces
"""
import time
import os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys


def setup_chrome_driver():
    """Setup Chrome for screenshot capture"""
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--start-maximized')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--force-device-scale-factor=1')
    
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


def create_basic_interface_screenshots(driver):
    """Create screenshots of the basic interface"""
    print("\n🚀 Creating Basic Interface Screenshots...")
    
    # Load the main mock interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    # Wait for page to load
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "app-container"))
    )
    time.sleep(2)  # Allow for animations
    
    # 1. Full interface overview
    capture_screenshot(driver, "01_full_interface_overview.png", 
                      "Complete 3-column drag & drop interface")
    
    # 2. Focus on ungrouped column
    try:
        ungrouped_column = driver.find_element(By.CLASS_NAME, "ungrouped-column")
        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", ungrouped_column)
        time.sleep(1)
        capture_screenshot(driver, "02_ungrouped_tabs_column.png", 
                          "Ungrouped tabs waiting to be organized")
    except Exception as e:
        print(f"⚠️ Ungrouped column not found: {e}")
    
    # 3. Focus on groups column
    try:
        groups_column = driver.find_element(By.CLASS_NAME, "groups-column")
        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", groups_column)
        time.sleep(1)
        capture_screenshot(driver, "03_groups_column.png", 
                          "Organized tab groups with colors")
    except Exception as e:
        print(f"⚠️ Groups column not found: {e}")


def create_drag_drop_screenshots(driver):
    """Create screenshots showing drag & drop functionality"""
    print("\n🎯 Creating Drag & Drop Screenshots...")
    
    try:
        # Find a tab to drag
        tab_cards = driver.find_elements(By.CLASS_NAME, "tab-card")
        if len(tab_cards) > 0:
            first_tab = tab_cards[0]
            
            # Highlight the tab being dragged
            driver.execute_script("""
                arguments[0].style.outline = '3px solid #667eea';
                arguments[0].style.outlineOffset = '2px';
            """, first_tab)
            
            capture_screenshot(driver, "04_tab_highlighted_for_drag.png", 
                              "Tab highlighted and ready to drag")
            
            # Show drag in progress (simulate hover state)
            driver.execute_script("""
                arguments[0].style.transform = 'scale(1.05) rotate(2deg)';
                arguments[0].style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                arguments[0].style.zIndex = '1000';
            """, first_tab)
            
            capture_screenshot(driver, "05_tab_being_dragged.png", 
                              "Tab in drag state with visual feedback")
            
            # Reset tab styling
            driver.execute_script("""
                arguments[0].style.outline = '';
                arguments[0].style.transform = '';
                arguments[0].style.boxShadow = '';
                arguments[0].style.zIndex = '';
            """, first_tab)
            
    except Exception as e:
        print(f"⚠️ Drag demo error: {e}")


def create_ai_features_screenshots(driver):
    """Create screenshots showing AI features"""
    print("\n🤖 Creating AI Features Screenshots...")
    
    # Load Phase 4 interface (has AI features)
    mock_path = Path(__file__).parent / "mock-phase4-interface.html"
    if not mock_path.exists():
        print("⚠️ Phase 4 mock not found, using basic interface")
        mock_path = Path(__file__).parent / "mock-interface.html"
        
    driver.get(f"file://{mock_path.absolute()}")
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "app-container"))
    )
    time.sleep(2)
    
    # 1. AI Analyze button in header
    try:
        analyze_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Analyze') or contains(text(), '🤖')]")
        driver.execute_script("""
            arguments[0].style.outline = '3px solid #10b981';
            arguments[0].style.outlineOffset = '2px';
        """, analyze_button)
        
        capture_screenshot(driver, "06_ai_analyze_button.png", 
                          "AI Analyze button highlighted in header")
        
        # Reset styling
        driver.execute_script("arguments[0].style.outline = '';", analyze_button)
        
    except Exception as e:
        print(f"⚠️ AI button not found: {e}")
    
    # 2. Group with AI features
    try:
        # Find group containers and highlight AI features
        group_containers = driver.find_elements(By.CLASS_NAME, "group-container")
        if group_containers:
            first_group = group_containers[0]
            
            # Highlight sparkle button if it exists
            try:
                sparkle_btn = first_group.find_element(By.XPATH, ".//button[contains(text(), '✨')]")
                driver.execute_script("""
                    arguments[0].style.outline = '2px solid #f59e0b';
                    arguments[0].style.outlineOffset = '2px';
                """, sparkle_btn)
            except:
                pass
            
            # Highlight color picker if it exists
            try:
                color_swatch = first_group.find_element(By.CLASS_NAME, "color-swatch")
                driver.execute_script("""
                    arguments[0].style.outline = '2px solid #ef4444';
                    arguments[0].style.outlineOffset = '2px';
                """, color_swatch)
            except:
                pass
            
            capture_screenshot(driver, "07_group_ai_features.png", 
                              "Group with AI naming and color features highlighted")
            
    except Exception as e:
        print(f"⚠️ Group features error: {e}")


def create_ai_suggestions_screenshots(driver):
    """Create screenshots of AI suggestions"""
    print("\n💡 Creating AI Suggestions Screenshots...")
    
    # Load the interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "app-container"))
    )
    time.sleep(2)
    
    # Inject AI suggestions into the interface
    driver.execute_script("""
        // Create a suggested group
        const groupsColumn = document.querySelector('.groups-column .column-content') || 
                           document.querySelector('.main-content > div:nth-child(2)') ||
                           document.querySelector('.main-content');
        if (groupsColumn) {
            const suggestedGroup = document.createElement('div');
            suggestedGroup.className = 'group-container suggested';
            suggestedGroup.innerHTML = `
                <div class="group-header">
                    <div class="group-info">
                        <span class="suggested-badge">Suggested</span>
                        <h3>Social Media</h3>
                        <span class="confidence-badge">87%</span>
                    </div>
                    <div class="group-actions">
                        <button class="btn-suggestion create" title="Create group">✓</button>
                        <button class="btn-suggestion dismiss" title="Dismiss">✗</button>
                    </div>
                </div>
                <div class="group-tabs">
                    <div class="tab-card suggested-tab">
                        <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234267B2'><path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'/></svg>" width="16" height="16">
                        <div class="tab-info">
                            <div class="tab-title">Facebook</div>
                            <div class="tab-domain">facebook.com</div>
                        </div>
                    </div>
                    <div class="tab-card suggested-tab">
                        <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231DA1F2'><path d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'/></svg>" width="16" height="16">
                        <div class="tab-info">
                            <div class="tab-title">Twitter</div>
                            <div class="tab-domain">twitter.com</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add suggested group styling
            const style = document.createElement('style');
            style.textContent = `
                .group-container.suggested {
                    border: 2px dashed #3b82f6 !important;
                    background: rgba(59, 130, 246, 0.05) !important;
                    margin-bottom: 16px;
                }
                .suggested-badge {
                    background: #3b82f6;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                    margin-right: 8px;
                }
                .confidence-badge {
                    background: #6b7280;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 8px;
                    font-size: 11px;
                }
                .btn-suggestion {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                    border: none;
                    margin-left: 4px;
                }
                .btn-suggestion.create {
                    background: #10b981;
                    color: white;
                }
                .btn-suggestion.dismiss {
                    background: #ef4444;
                    color: white;
                }
                .suggested-tab {
                    opacity: 0.9;
                }
                .group-info {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }
                .group-actions {
                    display: flex;
                    align-items: center;
                }
            `;
            document.head.appendChild(style);
            
            groupsColumn.insertBefore(suggestedGroup, groupsColumn.firstChild);
        }
    """)
    
    time.sleep(1)
    capture_screenshot(driver, "08_ai_suggestions_inline.png", 
                      "AI suggestions displayed inline with groups")


def create_search_screenshots(driver):
    """Create screenshots of search functionality"""
    print("\n🔍 Creating Search Screenshots...")
    
    # Load the interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "app-container"))
    )
    time.sleep(2)
    
    # Add search bar to header
    driver.execute_script("""
        const header = document.querySelector('.main-header .header-left') || document.querySelector('.main-header');
        if (header) {
            const searchContainer = document.createElement('div');
            searchContainer.style.cssText = `
                display: flex;
                align-items: center;
                background: rgba(255,255,255,0.2);
                border-radius: 8px;
                padding: 8px 12px;
                margin-left: 20px;
                backdrop-filter: blur(10px);
            `;
            searchContainer.innerHTML = `
                <span style="margin-right: 8px;">🔍</span>
                <input type="text" placeholder="Search tabs..." value="social" style="
                    background: transparent;
                    border: none;
                    color: white;
                    outline: none;
                    width: 200px;
                    placeholder: rgba(255,255,255,0.7);
                ">
                <button style="
                    background: rgba(255,255,255,0.3);
                    border: none;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    margin-left: 8px;
                    cursor: pointer;
                ">×</button>
            `;
            header.appendChild(searchContainer);
        }
    """)
    
    capture_screenshot(driver, "09_search_functionality.png", 
                      "Search bar with active search filtering")


def create_mobile_responsive_screenshots(driver):
    """Create screenshots showing mobile responsiveness"""
    print("\n📱 Creating Mobile Responsive Screenshots...")
    
    # Set mobile viewport
    driver.set_window_size(375, 812)  # iPhone X size
    
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "app-container"))
    )
    time.sleep(2)
    
    capture_screenshot(driver, "10_mobile_responsive.png", 
                      "Mobile responsive layout")
    
    # Reset to desktop size
    driver.set_window_size(1920, 1080)


def main():
    """Main screenshot generation function"""
    print("🎬 Better Tabs AI - Screenshot Generator")
    print("=" * 50)
    
    driver = setup_chrome_driver()
    
    try:
        # Create all screenshot categories
        create_basic_interface_screenshots(driver)
        create_drag_drop_screenshots(driver)
        create_ai_features_screenshots(driver)
        create_ai_suggestions_screenshots(driver)
        create_search_screenshots(driver)
        create_mobile_responsive_screenshots(driver)
        
        print("\n✅ Screenshot generation complete!")
        print(f"📁 Screenshots saved to: {Path('screenshots').absolute()}")
        
        # List generated files
        screenshots_dir = Path("screenshots")
        if screenshots_dir.exists():
            files = list(screenshots_dir.glob("*.png"))
            print(f"\n📸 Generated {len(files)} screenshots:")
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
