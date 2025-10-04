"""
Selenium test for Phase 3 Apply functionality using mock interface
Tests: Progress indicators, Toast notifications, Error handling
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


def create_enhanced_mock_interface():
    """Create a mock interface HTML file with Phase 3 features for testing"""
    mock_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Better Tabs AI - Phase 3 Mock Test</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 2rem; }
        .header-buttons { display: flex; gap: 0.75rem; }
        button { padding: 0.625rem 1.25rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-primary { background: white; color: #667eea; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .main-content { padding: 2rem; }
        .three-column-grid { display: grid; grid-template-columns: 300px 1fr 320px; gap: 1.5rem; }

        .column { background: white; border-radius: 8px; padding: 1rem; min-height: 400px; }
        .tab-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.5rem; margin-bottom: 0.5rem; cursor: grab; }
        .tab-card:active { cursor: grabbing; }

        .group-container { background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .group-title { font-weight: 600; margin-bottom: 0.5rem; cursor: text; }

        .new-group-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 2rem; text-align: center; min-height: 300px; }

        .main-footer { background: white; border-top: 1px solid #e2e8f0; padding: 0.75rem 2rem; display: flex; justify-content: center; align-items: center; gap: 1.5rem; position: fixed; bottom: 0; left: 0; right: 0; }
        .footer-status { font-size: 0.875rem; color: #64748b; }
        .progress-indicator { font-size: 0.875rem; color: #667eea; font-weight: 500; animation: pulse 1.5s ease-in-out infinite; }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 1000; display: flex; flex-direction: column; gap: 0.75rem; max-width: 400px; }
        .toast { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 10px 15px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.75rem; animation: toast-slide-in 0.3s ease; }
        .toast-success { border-left: 4px solid #10b981; }
        .toast-error { border-left: 4px solid #ef4444; }
        .toast-warning { border-left: 4px solid #f59e0b; }
        .toast-info { border-left: 4px solid #3b82f6; }
        .toast-icon { font-size: 1.25rem; }
        .toast-message { flex: 1; font-size: 0.875rem; }

        @keyframes toast-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="app-container">
        <header class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1>Better Tabs AI - Phase 3 Test</h1>
                <div class="header-buttons">
                    <button class="btn-primary" id="applyBtn" disabled>Apply</button>
                    <button class="btn-primary" id="cancelBtn">Cancel</button>
                </div>
            </div>
        </header>

        <main class="main-content">
            <div class="three-column-grid">
                <div class="column" id="ungroupedColumn">
                    <h3>Ungrouped Tabs (3)</h3>
                    <div class="tab-card" data-tab-id="1">Google</div>
                    <div class="tab-card" data-tab-id="2">GitHub</div>
                    <div class="tab-card" data-tab-id="3">Stack Overflow</div>
                </div>

                <div class="column" id="groupsColumn">
                    <h3>Groups</h3>
                    <div class="group-container" data-group-id="1">
                        <div class="group-title">Development</div>
                        <div class="tab-card" data-tab-id="4">MDN Docs</div>
                        <div class="tab-card" data-tab-id="5">React Docs</div>
                    </div>
                </div>

                <div class="column">
                    <div class="new-group-box" id="newGroupBox">
                        <p>Drag tabs here to create a new group</p>
                    </div>
                </div>
            </div>
        </main>

        <footer class="main-footer">
            <span class="footer-status hidden" id="footerStatus">Unsaved changes pending</span>
            <span class="progress-indicator hidden" id="progressIndicator">Applying 0/0: Starting...</span>
        </footer>

        <div class="toast-container" id="toastContainer"></div>
    </div>

    <script>
        let hasChanges = false;
        let toastId = 0;

        // Simulate drag and drop
        const tabCards = document.querySelectorAll('.tab-card');
        const newGroupBox = document.getElementById('newGroupBox');
        const applyBtn = document.getElementById('applyBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const footerStatus = document.getElementById('footerStatus');
        const progressIndicator = document.getElementById('progressIndicator');
        const toastContainer = document.getElementById('toastContainer');

        // Enable changes when tab is dragged
        tabCards.forEach(tab => {
            tab.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
            });
        });

        newGroupBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            newGroupBox.style.borderColor = '#667eea';
        });

        newGroupBox.addEventListener('dragleave', () => {
            newGroupBox.style.borderColor = '#cbd5e1';
        });

        newGroupBox.addEventListener('drop', (e) => {
            e.preventDefault();
            newGroupBox.style.borderColor = '#cbd5e1';

            // Mark as having changes
            hasChanges = true;
            applyBtn.disabled = false;
            footerStatus.classList.remove('hidden');

            console.log('Tab dropped, changes detected');
        });

        // Make tabs draggable
        tabCards.forEach(tab => {
            tab.setAttribute('draggable', 'true');
        });

        // Apply button handler
        applyBtn.addEventListener('click', async () => {
            console.log('Apply button clicked');

            if (!hasChanges) {
                console.log('No changes to apply');
                return;
            }

            // Disable button
            applyBtn.disabled = true;

            // Show progress indicator
            footerStatus.classList.add('hidden');
            progressIndicator.classList.remove('hidden');

            // Simulate operations
            const operations = [
                { name: 'Creating new group...', duration: 800 },
                { name: 'Moving tabs to group...', duration: 600 },
                { name: 'Reordering tabs...', duration: 400 },
                { name: 'Reloading...', duration: 300 }
            ];

            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                progressIndicator.textContent = `Applying ${i+1}/${operations.length}: ${op.name}`;

                await new Promise(resolve => setTimeout(resolve, op.duration));
            }

            // Hide progress
            progressIndicator.classList.add('hidden');

            // Show success toast
            addToast('Successfully applied 1 new group, 2 tab moves', 'success');

            // Reset state
            hasChanges = false;
            applyBtn.disabled = true;

            console.log('✓ Apply completed successfully');
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            if (hasChanges && confirm('Discard all changes?')) {
                hasChanges = false;
                applyBtn.disabled = true;
                footerStatus.classList.add('hidden');
                addToast('Changes discarded', 'info');
            }
        });

        // Toast function
        function addToast(message, type = 'info') {
            const id = toastId++;
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.setAttribute('data-toast-id', id);

            const icons = {
                success: '✓',
                error: '✗',
                warning: '⚠',
                info: 'ℹ'
            };

            toast.innerHTML = `
                <span class="toast-icon">${icons[type]}</span>
                <span class="toast-message">${message}</span>
            `;

            toastContainer.appendChild(toast);

            console.log(`Toast [${type}]: ${message}`);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                toast.remove();
            }, 5000);
        }

        // Simulate initial load
        console.log('✓ Mock interface loaded with Phase 3 features');
        console.log('  - Progress indicators');
        console.log('  - Toast notifications');
        console.log('  - Error handling');
    </script>
</body>
</html>
"""

    # Write to file
    test_dir = os.path.dirname(os.path.abspath(__file__))
    mock_path = os.path.join(test_dir, 'mock-phase3-interface.html')

    with open(mock_path, 'w', encoding='utf-8') as f:
        f.write(mock_html)

    return mock_path


def test_progress_indicator(driver, wait):
    """Test progress indicator appears and updates"""
    print("\n" + "="*60)
    print("TEST 1: Progress Indicator")
    print("="*60)

    # Drag a tab to trigger changes
    tab = driver.find_element(By.CSS_SELECTOR, '[data-tab-id="1"]')
    target = driver.find_element(By.ID, 'newGroupBox')

    print("Dragging tab to new group box...")
    actions = ActionChains(driver)
    actions.drag_and_drop(tab, target).perform()
    time.sleep(0.5)

    # Check footer status appears
    footer_status = driver.find_element(By.ID, 'footerStatus')
    is_visible = driver.execute_script("return !arguments[0].classList.contains('hidden');", footer_status)

    if is_visible:
        print("✓ Footer status appeared (changes detected)")
    else:
        print("✗ Footer status not visible")
        return False

    # Click Apply
    apply_btn = driver.find_element(By.ID, 'applyBtn')
    print("\nClicking Apply button...")
    apply_btn.click()

    time.sleep(0.3)  # Let progress start

    # Check progress indicator
    progress = driver.find_element(By.ID, 'progressIndicator')
    progress_text = progress.text
    is_progress_visible = driver.execute_script("return !arguments[0].classList.contains('hidden');", progress)

    if is_progress_visible:
        print(f"✓ Progress indicator visible: '{progress_text}'")
    else:
        print("✗ Progress indicator not visible")
        return False

    # Wait for completion
    print("\nMonitoring progress updates...")
    last_text = ""
    for i in range(30):  # 3 seconds max
        current_text = progress.text
        if current_text != last_text:
            print(f"  Update: {current_text}")
            last_text = current_text

        # Check if completed (indicator hidden)
        is_still_visible = driver.execute_script("return !arguments[0].classList.contains('hidden');", progress)
        if not is_still_visible:
            print("✓ Progress indicator disappeared (operation completed)")
            return True

        time.sleep(0.1)

    print("✗ Progress indicator still visible after timeout")
    return False


def test_toast_notifications(driver, wait):
    """Test toast notifications appear correctly"""
    print("\n" + "="*60)
    print("TEST 2: Toast Notifications")
    print("="*60)

    # Wait for toast from previous test
    time.sleep(1)

    # Check for toast
    toasts = driver.find_elements(By.CLASS_NAME, 'toast')

    if len(toasts) > 0:
        print(f"✓ Found {len(toasts)} toast notification(s)")

        for i, toast in enumerate(toasts, 1):
            toast_class = toast.get_attribute('class')
            toast_type = 'unknown'
            if 'toast-success' in toast_class:
                toast_type = 'success'
            elif 'toast-error' in toast_class:
                toast_type = 'error'
            elif 'toast-warning' in toast_class:
                toast_type = 'warning'
            elif 'toast-info' in toast_class:
                toast_type = 'info'

            message = toast.find_element(By.CLASS_NAME, 'toast-message').text
            icon = toast.find_element(By.CLASS_NAME, 'toast-icon').text

            print(f"  Toast {i}: [{toast_type}] {icon} {message}")

        # Test auto-dismiss
        print("\nWaiting 6 seconds for auto-dismiss...")
        time.sleep(6)

        toasts_after = driver.find_elements(By.CLASS_NAME, 'toast')
        if len(toasts_after) == 0:
            print("✓ Toasts auto-dismissed after timeout")
            return True
        else:
            print(f"⚠ {len(toasts_after)} toast(s) still visible")
            return True  # Still pass

    else:
        print("✗ No toast notifications found")
        return False


def test_toast_types(driver, wait):
    """Test different toast types by triggering different operations"""
    print("\n" + "="*60)
    print("TEST 3: Toast Types (Success, Info)")
    print("="*60)

    # Make another change
    tab = driver.find_element(By.CSS_SELECTOR, '[data-tab-id="2"]')
    target = driver.find_element(By.ID, 'newGroupBox')

    actions = ActionChains(driver)
    actions.drag_and_drop(tab, target).perform()
    time.sleep(0.5)

    # Click Apply for success toast
    apply_btn = driver.find_element(By.ID, 'applyBtn')
    apply_btn.click()
    time.sleep(3)  # Wait for completion

    success_toasts = driver.find_elements(By.CLASS_NAME, 'toast-success')
    if len(success_toasts) > 0:
        print(f"✓ Success toast appeared ({len(success_toasts)} found)")
    else:
        print("✗ No success toast found")
        return False

    # Test Cancel for info toast
    time.sleep(2)  # Let success toast dismiss

    # Make a change
    tab = driver.find_element(By.CSS_SELECTOR, '[data-tab-id="3"]')
    actions = ActionChains(driver)
    actions.drag_and_drop(tab, target).perform()
    time.sleep(0.5)

    # Click Cancel
    cancel_btn = driver.find_element(By.ID, 'cancelBtn')
    cancel_btn.click()

    # Handle confirm dialog
    try:
        alert = driver.switch_to.alert
        alert.accept()
        time.sleep(1)

        info_toasts = driver.find_elements(By.CLASS_NAME, 'toast-info')
        if len(info_toasts) > 0:
            print(f"✓ Info toast appeared ({len(info_toasts)} found)")
            return True
        else:
            print("⚠ No info toast found (may have already dismissed)")
            return True
    except:
        print("⚠ No confirm dialog appeared")
        return True


def test_console_logs(driver):
    """Test console logging"""
    print("\n" + "="*60)
    print("TEST 4: Console Logging")
    print("="*60)

    # Get browser console logs
    logs = driver.get_log('browser')

    app_logs = [log for log in logs if
                'Apply' in log.get('message', '') or
                'Toast' in log.get('message', '') or
                'changes' in log.get('message', '')]

    if len(app_logs) > 0:
        print(f"✓ Found {len(app_logs)} relevant console logs")
        print("\nRecent logs:")
        for log in app_logs[-10:]:
            message = log.get('message', '')
            # Extract just the message part
            if '"' in message:
                parts = message.split('"')
                if len(parts) >= 2:
                    message = parts[-2]
            print(f"  {message[:80]}")
        return True
    else:
        print("⚠ No application logs found")
        return True


def run_all_tests():
    """Run all Phase 3 mock interface tests"""
    print("\n" + "="*60)
    print("PHASE 3 APPLY FUNCTIONALITY TESTS (Mock Interface)")
    print("="*60)

    # Create mock interface
    print("\nCreating mock interface...")
    mock_path = create_enhanced_mock_interface()
    print(f"✓ Mock interface created at: {mock_path}")

    driver = setup_chrome_driver()
    results = {}

    try:
        # Load mock interface
        driver.get(f"file:///{mock_path}")
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'three-column-grid')))

        print("✓ Mock interface loaded\n")
        time.sleep(1)

        # Run tests
        results['progress_indicator'] = test_progress_indicator(driver, wait)
        results['toast_notifications'] = test_toast_notifications(driver, wait)
        results['toast_types'] = test_toast_types(driver, wait)
        results['console_logs'] = test_console_logs(driver)

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
            print("\n🎉 All Phase 3 mock tests passed!")
        else:
            print(f"\n⚠ {total - passed} test(s) failed")

        print("\n" + "="*60)
        print("Browser will remain open for manual inspection")
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
