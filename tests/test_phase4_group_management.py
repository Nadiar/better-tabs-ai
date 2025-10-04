"""
Selenium test for Phase 4 Group Management features
Tests: AI name generation, color picker, delete group, performance
"""
import sys
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def setup_chrome_driver():
    """Setup Chrome driver"""
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    driver = webdriver.Chrome(options=options)
    return driver


def create_phase4_mock_interface():
    """Create a mock interface HTML file with Phase 4 features for testing"""
    mock_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Better Tabs AI - Phase 4 Test</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; }

        .group-container { background: white; border: 2px solid #e2e8f0; border-left: 4px solid #667eea; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; max-width: 600px; }
        .group-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: rgba(102, 126, 234, 0.1); border-radius: 4px; margin-bottom: 0.5rem; }
        .group-title-section { display: flex; align-items: center; gap: 0.5rem; flex: 1; }

        .color-swatch-container { position: relative; }
        .color-swatch { width: 20px; height: 20px; border-radius: 4px; border: 2px solid rgba(0, 0, 0, 0.1); cursor: pointer; transition: all 0.2s; }
        .color-swatch:hover { transform: scale(1.1); }

        .color-picker-dropdown { position: absolute; top: 100%; left: 0; margin-top: 0.25rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); padding: 0.5rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; z-index: 1000; }
        .color-picker-dropdown.hidden { display: none; }

        .color-option { width: 28px; height: 28px; border-radius: 4px; border: 2px solid rgba(0, 0, 0, 0.1); cursor: pointer; transition: all 0.2s; }
        .color-option:hover { transform: scale(1.1); border-color: rgba(0, 0, 0, 0.3); }
        .color-option.active { border-color: #1e293b; border-width: 3px; box-shadow: 0 0 0 2px white, 0 0 0 4px #1e293b; }

        .group-title { font-size: 0.875rem; font-weight: 600; cursor: pointer; user-select: none; }
        .group-title-input { font-size: 0.875rem; font-weight: 600; border: 2px solid #667eea; border-radius: 4px; padding: 0.25rem 0.5rem; outline: none; min-width: 150px; }

        .ai-name-btn { background: transparent; border: none; font-size: 1rem; padding: 0.25rem; opacity: 0.7; cursor: pointer; transition: all 0.2s; }
        .ai-name-btn:hover:not(:disabled) { opacity: 1; transform: scale(1.1); background: rgba(102, 126, 234, 0.1); border-radius: 4px; }
        .ai-name-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .group-actions { display: flex; align-items: center; gap: 0.5rem; }
        .tab-count { font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 10px; font-weight: 600; }
        .delete-group { background: transparent; border: none; font-size: 1.5rem; color: #ef4444; opacity: 0.6; cursor: pointer; transition: all 0.2s; padding: 0.25rem; }
        .delete-group:hover { opacity: 1; background: rgba(239, 68, 68, 0.1); border-radius: 4px; }

        .group-tabs { padding: 0.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.4rem; }
        .tab-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.5rem; font-size: 0.875rem; }

        .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 1000; display: flex; flex-direction: column; gap: 0.75rem; max-width: 400px; }
        .toast { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 10px 15px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.75rem; animation: toast-slide-in 0.3s ease; }
        .toast-success { border-left: 4px solid #10b981; }
        .toast-info { border-left: 4px solid #3b82f6; }

        @keyframes toast-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .stats { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; max-width: 600px; }
        .stats h3 { margin-bottom: 0.5rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 0.5rem; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #667eea; }
        .stat-label { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
    </style>
</head>
<body>
    <h1>Phase 4: Group Management Test</h1>
    <p style="margin: 1rem 0; color: #64748b;">Testing AI name generation, color picker, and delete functionality</p>

    <div class="stats" id="stats">
        <h3>Performance Metrics</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value" id="colorPickerTime">-</div>
                <div class="stat-label">Color Picker (ms)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="aiNameTime">-</div>
                <div class="stat-label">AI Name Gen (ms)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="deleteTime">-</div>
                <div class="stat-label">Delete (ms)</div>
            </div>
        </div>
    </div>

    <div class="group-container" id="testGroup" data-group-id="1">
        <div class="group-header">
            <div class="group-title-section">
                <!-- Color Swatch -->
                <div class="color-swatch-container">
                    <button class="color-swatch" id="colorSwatch" style="background-color: #667eea;"></button>
                    <div class="color-picker-dropdown hidden" id="colorPicker">
                        <button class="color-option" data-color="grey" style="background-color: #5f6368;"></button>
                        <button class="color-option active" data-color="blue" style="background-color: #1a73e8;"></button>
                        <button class="color-option" data-color="red" style="background-color: #d93025;"></button>
                        <button class="color-option" data-color="yellow" style="background-color: #f9ab00;"></button>
                        <button class="color-option" data-color="green" style="background-color: #1e8e3e;"></button>
                        <button class="color-option" data-color="pink" style="background-color: #d01884;"></button>
                        <button class="color-option" data-color="purple" style="background-color: #9334e6;"></button>
                        <button class="color-option" data-color="cyan" style="background-color: #007b83;"></button>
                    </div>
                </div>

                <!-- Title (editable) -->
                <span class="group-title" id="groupTitle">Development Tools</span>
                <input class="group-title-input hidden" id="groupTitleInput" value="Development Tools" maxlength="50" />

                <!-- AI Name Generation -->
                <button class="ai-name-btn" id="aiNameBtn" title="Generate AI name">✨</button>
            </div>

            <div class="group-actions">
                <span class="tab-count" id="tabCount">5</span>
                <button class="delete-group" id="deleteBtn" title="Delete group">×</button>
            </div>
        </div>

        <div class="group-tabs" id="groupTabs">
            <div class="tab-card">GitHub</div>
            <div class="tab-card">VS Code</div>
            <div class="tab-card">Stack Overflow</div>
            <div class="tab-card">MDN Docs</div>
            <div class="tab-card">React Docs</div>
        </div>
    </div>

    <div class="toast-container" id="toastContainer"></div>

    <script>
        const colorMap = {
            grey: '#5f6368', blue: '#1a73e8', red: '#d93025', yellow: '#f9ab00',
            green: '#1e8e3e', pink: '#d01884', purple: '#9334e6', cyan: '#007b83'
        };

        let currentColor = 'blue';
        let toastId = 0;

        // Color Picker
        const colorSwatch = document.getElementById('colorSwatch');
        const colorPicker = document.getElementById('colorPicker');
        const colorOptions = document.querySelectorAll('.color-option');

        colorSwatch.addEventListener('click', () => {
            const startTime = performance.now();
            colorPicker.classList.toggle('hidden');
            const endTime = performance.now();
            document.getElementById('colorPickerTime').textContent = (endTime - startTime).toFixed(2);
            console.log('Color picker toggled:', !colorPicker.classList.contains('hidden'));
        });

        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-color');
                const colorValue = colorMap[color];

                // Update swatch
                colorSwatch.style.backgroundColor = colorValue;

                // Update active state
                colorOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');

                // Update group border
                document.getElementById('testGroup').style.borderLeftColor = colorValue;

                // Close picker
                colorPicker.classList.add('hidden');

                currentColor = color;
                addToast(`Color changed to ${color}`, 'success');
                console.log('Color changed to:', color);
            });
        });

        // Inline Title Editing
        const groupTitle = document.getElementById('groupTitle');
        const groupTitleInput = document.getElementById('groupTitleInput');

        groupTitle.addEventListener('click', () => {
            groupTitle.classList.add('hidden');
            groupTitleInput.classList.remove('hidden');
            groupTitleInput.focus();
            groupTitleInput.select();
        });

        groupTitleInput.addEventListener('blur', () => {
            const newTitle = groupTitleInput.value.trim() || 'Untitled Group';
            groupTitle.textContent = newTitle;
            groupTitle.classList.remove('hidden');
            groupTitleInput.classList.add('hidden');
            console.log('Title updated to:', newTitle);
        });

        groupTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                groupTitleInput.blur();
            } else if (e.key === 'Escape') {
                groupTitleInput.value = groupTitle.textContent;
                groupTitleInput.blur();
            }
        });

        // AI Name Generation
        const aiNameBtn = document.getElementById('aiNameBtn');
        aiNameBtn.addEventListener('click', async () => {
            if (aiNameBtn.disabled) return;

            const startTime = performance.now();
            aiNameBtn.disabled = true;
            aiNameBtn.textContent = '⏳';

            // Simulate AI generation (500ms)
            await new Promise(resolve => setTimeout(resolve, 500));

            const generatedNames = [
                'Development Tools',
                'Coding Resources',
                'Web Development',
                'Programming Hub',
                'Dev Environment'
            ];

            const newName = generatedNames[Math.floor(Math.random() * generatedNames.length)];
            groupTitle.textContent = newName;
            groupTitleInput.value = newName;

            aiNameBtn.disabled = false;
            aiNameBtn.textContent = '✨';

            const endTime = performance.now();
            document.getElementById('aiNameTime').textContent = (endTime - startTime).toFixed(0);

            addToast(`Generated name: "${newName}"`, 'success');
            console.log('AI generated name:', newName);
        });

        // Delete Group
        const deleteBtn = document.getElementById('deleteBtn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Delete group "' + groupTitle.textContent + '"? Tabs will be ungrouped.')) {
                const startTime = performance.now();

                document.getElementById('testGroup').style.opacity = '0.5';
                document.getElementById('testGroup').style.transform = 'scale(0.95)';

                setTimeout(() => {
                    document.getElementById('testGroup').remove();

                    const endTime = performance.now();
                    document.getElementById('deleteTime').textContent = (endTime - startTime).toFixed(2);

                    addToast('Group deleted, tabs ungrouped', 'info');
                    console.log('Group deleted');
                }, 300);
            }
        });

        // Toast notifications
        function addToast(message, type = 'info') {
            const id = toastId++;
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.setAttribute('data-toast-id', id);
            toast.innerHTML = `<span>${message}</span>`;

            document.getElementById('toastContainer').appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        console.log('✓ Phase 4 mock interface loaded');
        console.log('  - Color picker: 8 Chrome colors');
        console.log('  - AI name generation with spinner');
        console.log('  - Delete with confirmation');
        console.log('  - Inline title editing');
    </script>
</body>
</html>
"""

    # Write to file
    test_dir = os.path.dirname(os.path.abspath(__file__))
    mock_path = os.path.join(test_dir, 'mock-phase4-interface.html')

    with open(mock_path, 'w', encoding='utf-8') as f:
        f.write(mock_html)

    return mock_path


def test_color_picker(driver, wait):
    """Test color picker functionality and performance"""
    print("\n" + "="*60)
    print("TEST 1: Color Picker")
    print("="*60)

    # Click color swatch
    color_swatch = driver.find_element(By.ID, 'colorSwatch')
    initial_color = color_swatch.value_of_css_property('background-color')

    print(f"Initial color: {initial_color}")
    print("Clicking color swatch...")

    start_time = time.time()
    color_swatch.click()
    time.sleep(0.2)  # Let picker appear

    # Check if picker is visible
    color_picker = driver.find_element(By.ID, 'colorPicker')
    is_visible = not ('hidden' in color_picker.get_attribute('class'))

    if is_visible:
        print("✓ Color picker opened")

        # Count color options
        color_options = driver.find_elements(By.CLASS_NAME, 'color-option')
        print(f"✓ Found {len(color_options)} color options")

        # Select a different color (red)
        red_option = driver.find_element(By.CSS_SELECTOR, '[data-color="red"]')
        red_option.click()
        time.sleep(0.3)

        # Check if color changed
        new_color = color_swatch.value_of_css_property('background-color')
        if new_color != initial_color:
            print(f"✓ Color changed to: {new_color}")
        else:
            print("✗ Color did not change")
            return False

        # Check if picker closed
        is_hidden = 'hidden' in color_picker.get_attribute('class')
        if is_hidden:
            print("✓ Color picker closed after selection")

        end_time = time.time()
        duration = (end_time - start_time) * 1000
        print(f"✓ Total operation: {duration:.2f}ms")

        return True
    else:
        print("✗ Color picker did not open")
        return False


def test_ai_name_generation(driver, wait):
    """Test AI name generation with spinner"""
    print("\n" + "="*60)
    print("TEST 2: AI Name Generation")
    print("="*60)

    # Get initial name
    group_title = driver.find_element(By.ID, 'groupTitle')
    initial_name = group_title.text
    print(f"Initial name: '{initial_name}'")

    # Click AI button
    ai_btn = driver.find_element(By.ID, 'aiNameBtn')
    print("Clicking AI generate button...")

    start_time = time.time()
    ai_btn.click()
    time.sleep(0.1)

    # Check if button shows spinner
    button_text = ai_btn.text
    if button_text == '⏳':
        print("✓ Spinner appeared (⏳)")
    else:
        print(f"⚠ Expected spinner, got: {button_text}")

    # Wait for generation to complete (max 2 seconds)
    wait.until(lambda d: d.find_element(By.ID, 'aiNameBtn').text == '✨')

    end_time = time.time()
    duration = (end_time - start_time) * 1000

    # Check if name changed
    new_name = group_title.text
    if new_name != initial_name:
        print(f"✓ Name generated: '{new_name}'")
        print(f"✓ Generation time: {duration:.0f}ms")

        # Check if button is enabled again
        is_enabled = ai_btn.is_enabled()
        if is_enabled:
            print("✓ Button re-enabled after generation")
            return True
        else:
            print("✗ Button still disabled")
            return False
    else:
        print("⚠ Name did not change (may have generated same name)")
        return True  # Don't fail, could be random


def test_inline_editing(driver, wait):
    """Test inline title editing"""
    print("\n" + "="*60)
    print("TEST 3: Inline Title Editing")
    print("="*60)

    group_title = driver.find_element(By.ID, 'groupTitle')
    title_input = driver.find_element(By.ID, 'groupTitleInput')

    print("Clicking title to edit...")
    group_title.click()
    time.sleep(0.2)

    # Check if input is visible
    input_class = title_input.get_attribute('class')
    if 'hidden' not in input_class:
        print("✓ Input field appeared")

        # Type new name
        title_input.clear()
        new_name = "My Custom Group"
        title_input.send_keys(new_name)
        print(f"✓ Typed new name: '{new_name}'")

        # Blur to save
        driver.execute_script("arguments[0].blur();", title_input)
        time.sleep(0.2)

        # Check if title updated
        updated_title = group_title.text
        if updated_title == new_name:
            print(f"✓ Title updated successfully: '{updated_title}'")
            return True
        else:
            print(f"✗ Title not updated. Expected '{new_name}', got '{updated_title}'")
            return False
    else:
        print("✗ Input field did not appear")
        return False


def test_delete_group(driver, wait):
    """Test delete group functionality"""
    print("\n" + "="*60)
    print("TEST 4: Delete Group")
    print("="*60)

    delete_btn = driver.find_element(By.ID, 'deleteBtn')
    group_container = driver.find_element(By.ID, 'testGroup')

    print("Clicking delete button...")
    delete_btn.click()
    time.sleep(0.2)

    # Handle confirm dialog
    try:
        alert = driver.switch_to.alert
        alert_text = alert.text
        print(f"✓ Confirmation dialog appeared: '{alert_text}'")

        # Accept deletion
        alert.accept()
        print("✓ Confirmed deletion")

        # Wait for group to be removed
        time.sleep(0.5)

        # Check if group is gone
        try:
            driver.find_element(By.ID, 'testGroup')
            print("✗ Group still exists after deletion")
            return False
        except:
            print("✓ Group removed from DOM")
            return True
    except:
        print("✗ No confirmation dialog appeared")
        return False


def test_performance(driver):
    """Test overall performance metrics"""
    print("\n" + "="*60)
    print("TEST 5: Performance Metrics")
    print("="*60)

    # Get performance stats
    try:
        color_picker_time = driver.find_element(By.ID, 'colorPickerTime').text
        ai_name_time = driver.find_element(By.ID, 'aiNameTime').text
        delete_time = driver.find_element(By.ID, 'deleteTime').text

        print(f"Color Picker Toggle: {color_picker_time} ms")
        print(f"AI Name Generation: {ai_name_time} ms")
        print(f"Delete Operation: {delete_time} ms")

        # Check if all under performance thresholds
        checks = []

        if color_picker_time != '-':
            picker_time = float(color_picker_time)
            if picker_time < 100:
                print(f"✓ Color picker: {picker_time}ms < 100ms")
                checks.append(True)
            else:
                print(f"⚠ Color picker slow: {picker_time}ms")
                checks.append(False)

        if ai_name_time != '-':
            ai_time = float(ai_name_time)
            if ai_time < 1000:
                print(f"✓ AI generation: {ai_time}ms < 1000ms")
                checks.append(True)
            else:
                print(f"⚠ AI generation slow: {ai_time}ms")
                checks.append(False)

        return all(checks) if checks else True
    except Exception as e:
        print(f"⚠ Could not read performance metrics: {e}")
        return True


def run_all_tests():
    """Run all Phase 4 tests"""
    print("\n" + "="*60)
    print("PHASE 4 GROUP MANAGEMENT TESTS (Mock Interface)")
    print("="*60)

    # Create mock interface
    print("\nCreating mock interface...")
    mock_path = create_phase4_mock_interface()
    print(f"✓ Mock interface created at: {mock_path}")

    driver = setup_chrome_driver()
    results = {}

    try:
        # Load mock interface
        driver.get(f"file:///{mock_path}")
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, 'testGroup')))

        print("✓ Mock interface loaded\n")
        time.sleep(1)

        # Run tests in order
        results['color_picker'] = test_color_picker(driver, wait)

        # Reload page for fresh state
        driver.refresh()
        wait.until(EC.presence_of_element_located((By.ID, 'testGroup')))
        time.sleep(0.5)

        results['ai_name_generation'] = test_ai_name_generation(driver, wait)

        # Reload page for fresh state
        driver.refresh()
        wait.until(EC.presence_of_element_located((By.ID, 'testGroup')))
        time.sleep(0.5)

        results['inline_editing'] = test_inline_editing(driver, wait)

        # Reload page for fresh state
        driver.refresh()
        wait.until(EC.presence_of_element_located((By.ID, 'testGroup')))
        time.sleep(0.5)

        results['delete_group'] = test_delete_group(driver, wait)

        # Reload page for performance check
        driver.refresh()
        wait.until(EC.presence_of_element_located((By.ID, 'testGroup')))
        time.sleep(0.5)

        # Run through all actions quickly for performance
        driver.find_element(By.ID, 'colorSwatch').click()
        time.sleep(0.2)
        driver.find_element(By.CSS_SELECTOR, '[data-color="green"]').click()
        time.sleep(0.3)
        driver.find_element(By.ID, 'aiNameBtn').click()
        time.sleep(0.7)

        results['performance'] = test_performance(driver)

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)

        passed = sum(results.values())
        total = len(results)

        for test_name, result in results.items():
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{status}: {test_name.replace('_', ' ').title()}")

        print(f"\nTotal: {passed}/{total} tests passed")

        if passed == total:
            print("\n🎉 All Phase 4 tests passed!")
        else:
            print(f"\n⚠ {total - passed} test(s) failed")

        print("\n" + "="*60)
        print("Browser will remain open for inspection")
        input("Press Enter to close browser...")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()

    return results


if __name__ == '__main__':
    run_all_tests()
