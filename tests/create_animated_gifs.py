"""
Animated GIF Generator for Better Tabs AI
Creates animated demonstrations of key features
"""
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from PIL import Image, ImageDraw, ImageFont
import io


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


def capture_frame(driver, description=""):
    """Capture a frame and return as PIL Image"""
    png_data = driver.get_screenshot_as_png()
    frame = Image.open(io.BytesIO(png_data))
    print(f"📷 Frame captured: {description}")
    return frame


def add_text_overlay(image, text, position=(50, 50), font_size=32):
    """Add text overlay to image"""
    draw = ImageDraw.Draw(image)
    try:
        # Try to use a system font
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Add background rectangle for text
    bbox = draw.textbbox(position, text, font=font)
    # Expand the box a bit for padding
    expanded_bbox = (bbox[0] - 10, bbox[1] - 5, bbox[2] + 10, bbox[3] + 5)
    draw.rectangle(expanded_bbox, fill=(0, 0, 0, 200))
    draw.text(position, text, fill="white", font=font)
    return image


def create_drag_drop_animation(driver):
    """Create animated GIF showing drag & drop functionality"""
    print("\n🎬 Creating Drag & Drop Animation...")
    
    frames = []
    
    # Load the mock interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    time.sleep(2)
    
    # Frame 1: Initial state
    frame1 = capture_frame(driver, "Initial interface")
    frame1 = add_text_overlay(frame1, "1. Select a tab to organize", (50, 50))
    frames.append(frame1)
    
    # Find a tab to drag
    try:
        tab_cards = driver.find_elements(By.CLASS_NAME, "tab-card")
        if len(tab_cards) > 0:
            first_tab = tab_cards[0]
            
            # Frame 2: Highlight tab
            driver.execute_script("""
                arguments[0].style.outline = '3px solid #667eea';
                arguments[0].style.outlineOffset = '2px';
                arguments[0].style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            """, first_tab)
            time.sleep(0.5)
            
            frame2 = capture_frame(driver, "Tab highlighted")
            frame2 = add_text_overlay(frame2, "2. Tab selected for dragging", (50, 50))
            frames.append(frame2)
            
            # Frame 3: Drag state
            driver.execute_script("""
                arguments[0].style.transform = 'scale(1.05) rotate(2deg)';
                arguments[0].style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                arguments[0].style.zIndex = '1000';
                arguments[0].style.opacity = '0.9';
            """, first_tab)
            time.sleep(0.5)
            
            frame3 = capture_frame(driver, "Tab being dragged")
            frame3 = add_text_overlay(frame3, "3. Dragging to new position", (50, 50))
            frames.append(frame3)
            
            # Frame 4: Drop zone highlight
            driver.execute_script("""
                // Create drop zone visual effect
                const dropZone = document.querySelector('.groups-column') || document.body;
                if (dropZone) {
                    dropZone.style.border = '3px dashed #10b981';
                    dropZone.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }
            """)
            time.sleep(0.5)
            
            frame4 = capture_frame(driver, "Drop zone active")
            frame4 = add_text_overlay(frame4, "4. Drop zone highlighted", (50, 50))
            frames.append(frame4)
            
            # Frame 5: Dropped state
            driver.execute_script("""
                arguments[0].style.transform = 'scale(1)';
                arguments[0].style.outline = 'none';
                arguments[0].style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                arguments[0].style.opacity = '1';
                
                // Remove drop zone highlight
                const dropZone = document.querySelector('.groups-column') || document.body;
                if (dropZone) {
                    dropZone.style.border = 'none';
                    dropZone.style.backgroundColor = 'transparent';
                }
                
                // Add success indicator
                arguments[0].style.border = '2px solid #10b981';
            """, first_tab)
            time.sleep(0.5)
            
            frame5 = capture_frame(driver, "Tab successfully moved")
            frame5 = add_text_overlay(frame5, "5. Tab successfully organized!", (50, 50))
            frames.append(frame5)
            
    except Exception as e:
        print(f"⚠️ Drag animation error: {e}")
    
    # Create and save the GIF
    if frames:
        gif_path = Path("screenshots") / "drag_drop_animation.gif"
        frames[0].save(
            gif_path,
            save_all=True,
            append_images=frames[1:],
            duration=1500,  # 1.5 seconds per frame
            loop=0  # Loop forever
        )
        print(f"🎬 Saved: {gif_path}")
        return gif_path
    
    return None


def create_ai_suggestions_animation(driver):
    """Create animated GIF showing AI suggestions workflow"""
    print("\n🤖 Creating AI Suggestions Animation...")
    
    frames = []
    
    # Load the interface
    mock_path = Path(__file__).parent / "mock-interface.html"
    driver.get(f"file://{mock_path.absolute()}")
    
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    time.sleep(2)
    
    # Frame 1: Initial state
    frame1 = capture_frame(driver, "Interface before AI analysis")
    frame1 = add_text_overlay(frame1, "1. Click 'AI Analyze' to start", (50, 50))
    frames.append(frame1)
    
    # Frame 2: Add AI button highlight
    driver.execute_script("""
        // Add AI analyze button
        const header = document.querySelector('.main-header') || document.querySelector('body');
        if (header) {
            const aiButton = document.createElement('button');
            aiButton.textContent = '🤖 AI Analyze';
            aiButton.style.cssText = `
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                animation: pulse 1s ease-in-out infinite;
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            `;
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
            
            header.appendChild(aiButton);
        }
    """)
    time.sleep(1)
    
    frame2 = capture_frame(driver, "AI button highlighted")
    frame2 = add_text_overlay(frame2, "2. AI is analyzing your tabs...", (50, 50))
    frames.append(frame2)
    
    # Frame 3: Add loading indicator
    driver.execute_script("""
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            z-index: 1001;
            text-align: center;
        `;
        loadingIndicator.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 12px;">🧠</div>
            <div style="font-weight: 600; color: #374151;">AI Analyzing Tabs...</div>
            <div style="color: #6b7280; font-size: 14px; margin-top: 8px;">Finding patterns and themes</div>
        `;
        document.body.appendChild(loadingIndicator);
    """)
    time.sleep(1)
    
    frame3 = capture_frame(driver, "AI processing")
    frame3 = add_text_overlay(frame3, "3. AI finding patterns in your tabs", (50, 100))
    frames.append(frame3)
    
    # Frame 4: Show suggestions
    driver.execute_script("""
        // Remove loading indicator
        const loading = document.querySelector('div[style*="position: fixed"][style*="top: 50%"]');
        if (loading) loading.remove();
        
        // Add AI suggestions
        const mainContent = document.querySelector('.main-content') || document.querySelector('body');
        if (mainContent) {
            const suggestionDemo = document.createElement('div');
            suggestionDemo.style.cssText = `
                border: 2px dashed #3b82f6;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.05));
                margin: 20px;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                animation: slideIn 0.5s ease-out;
                position: relative;
                z-index: 1000;
            `;
            
            suggestionDemo.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">AI SUGGESTED</span>
                            <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">95% CONFIDENT</span>
                            <span style="color: #f59e0b; font-size: 16px;">✨</span>
                        </div>
                        <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0;">Social Media & Communication</h3>
                        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0; font-style: italic;">AI detected social networking patterns</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">✓ Create</button>
                        <button style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">✗ Dismiss</button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    <div style="display: flex; align-items: center; padding: 8px; background: rgba(255,255,255,0.8); border-radius: 8px; gap: 8px;">
                        <div style="width: 16px; height: 16px; background: #4267B2; border-radius: 2px;"></div>
                        <div><div style="font-weight: 600; font-size: 14px;">Facebook</div><div style="color: #6b7280; font-size: 12px;">facebook.com</div></div>
                    </div>
                    <div style="display: flex; align-items: center; padding: 8px; background: rgba(255,255,255,0.8); border-radius: 8px; gap: 8px;">
                        <div style="width: 16px; height: 16px; background: #1DA1F2; border-radius: 2px;"></div>
                        <div><div style="font-weight: 600; font-size: 14px;">Twitter</div><div style="color: #6b7280; font-size: 12px;">twitter.com</div></div>
                    </div>
                </div>
            `;
            
            // Add slide-in animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
            
            mainContent.insertBefore(suggestionDemo, mainContent.firstChild);
        }
    """)
    time.sleep(1)
    
    frame4 = capture_frame(driver, "AI suggestions appeared")
    frame4 = add_text_overlay(frame4, "4. AI suggests grouping options", (50, 50))
    frames.append(frame4)
    
    # Frame 5: Create group action
    driver.execute_script("""
        const suggestion = document.querySelector('div[style*="border: 2px dashed #3b82f6"]');
        if (suggestion) {
            // Highlight create button
            const createBtn = suggestion.querySelector('button[style*="background: #10b981"]');
            if (createBtn) {
                createBtn.style.transform = 'scale(1.1)';
                createBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.5)';
            }
        }
    """)
    time.sleep(0.5)
    
    frame5 = capture_frame(driver, "Create button highlighted")
    frame5 = add_text_overlay(frame5, "5. Click ✓ to create the group", (50, 50))
    frames.append(frame5)
    
    # Frame 6: Group created
    driver.execute_script("""
        const suggestion = document.querySelector('div[style*="border: 2px dashed #3b82f6"]');
        if (suggestion) {
            // Transform to regular group
            suggestion.style.border = '2px solid #10b981';
            suggestion.style.background = 'rgba(16, 185, 129, 0.1)';
            
            // Update header
            const header = suggestion.querySelector('h3');
            if (header) {
                header.innerHTML = '✅ Social Media & Communication';
            }
            
            // Remove buttons, add success message
            const buttons = suggestion.querySelector('div[style*="display: flex; gap: 8px"]');
            if (buttons) {
                buttons.innerHTML = '<span style="color: #10b981; font-weight: 600;">✓ Group Created!</span>';
            }
        }
    """)
    time.sleep(1)
    
    frame6 = capture_frame(driver, "Group successfully created")
    frame6 = add_text_overlay(frame6, "6. Group created successfully! 🎉", (50, 50))
    frames.append(frame6)
    
    # Create and save the GIF
    if frames:
        gif_path = Path("screenshots") / "ai_suggestions_animation.gif"
        frames[0].save(
            gif_path,
            save_all=True,
            append_images=frames[1:],
            duration=2000,  # 2 seconds per frame
            loop=0  # Loop forever
        )
        print(f"🤖 Saved: {gif_path}")
        return gif_path
    
    return None


def main():
    """Main animation generation function"""
    print("🎬 Better Tabs AI - Animated GIF Generator")
    print("=" * 55)
    
    # Ensure screenshots directory exists
    Path("screenshots").mkdir(exist_ok=True)
    
    driver = setup_chrome_driver()
    
    try:
        created_gifs = []
        
        # Create different animations
        gif1 = create_drag_drop_animation(driver)
        if gif1:
            created_gifs.append(gif1)
            
        gif2 = create_ai_suggestions_animation(driver)
        if gif2:
            created_gifs.append(gif2)
        
        print(f"\n✅ Created {len(created_gifs)} animated GIFs!")
        
        # List all files
        screenshots_dir = Path("screenshots")
        if screenshots_dir.exists():
            all_files = list(screenshots_dir.glob("*"))
            print(f"\n📁 Total files in screenshots: {len(all_files)}")
            
            # Group by type
            pngs = [f for f in all_files if f.suffix == '.png']
            gifs = [f for f in all_files if f.suffix == '.gif']
            
            print(f"\n📸 Static Screenshots ({len(pngs)}):")
            for file in sorted(pngs):
                print(f"   • {file.name}")
                
            print(f"\n🎬 Animated GIFs ({len(gifs)}):")
            for file in sorted(gifs):
                print(f"   • {file.name}")
        
    except Exception as e:
        print(f"❌ Error during animation generation: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        driver.quit()


if __name__ == "__main__":
    main()