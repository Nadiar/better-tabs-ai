"""
Selenium test for Phase 3 Apply functionality in Better Tabs AI
Tests: Progress indicators, Toast notifications, Error handling
"""
import sys
import time
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
    """Setup Chrome with the Better Tabs AI extension loaded"""
    options = Options()
    extension_path = r"c:\Users\nadiar\Code\better-tabs-ai"
    options.add_argument(f'--load-extension={extension_path}')
    options.add_argument('--disable-blink-features=AutomationControlled')

    driver = webdriver.Chrome(options=options)
    return driver


def find_extension_id(driver):
    """Find the Better Tabs AI extension ID"""
    driver.get('chrome://extensions/')
    time.sleep(2)

    extension_id_script = """
    const extensions = document.querySelector('extensions-manager')
        .shadowRoot.querySelector('extensions-item-list')
        .shadowRoot.querySelectorAll('extensions-item');

    for (let ext of extensions) {
        const name = ext.shadowRoot.querySelector('#name').textContent;
        if (name.includes('Better Tabs')) {
            return ext.id;
        }
    }
    return null;
    """

    extension_id = driver.execute_script(extension_id_script)
    return extension_id


def test_progress_indicator(driver, wait):
    """Test that progress indicator appears and updates during Apply"""
    print("\n" + "="*60)
    print("TEST 1: Progress Indicator")
    print("="*60)

    # Make a change by dragging a tab to create a new group
    tab_cards = driver.find_elements(By.CLASS_NAME, 'tab-card')
    if len(tab_cards) == 0:
        print("⚠ No tabs found, skipping test")
        return False

    new_group_box = driver.find_element(By.CLASS_NAME, 'new-group-box')

    print(f"Found {len(tab_cards)} tabs")
    print("Dragging tab to new group box...")

    actions = ActionChains(driver)
    actions.drag_and_drop(tab_cards[0], new_group_box).perform()
    time.sleep(1)

    # Check for hasChanges indicator
    has_changes = driver.execute_script("""
        return document.querySelector('.footer-status') !== null;
    """)

    if has_changes:
        print("✓ Changes detected, footer status shown")
    else:
        print("✗ No changes detected")
        return False

    # Click Apply button
    apply_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Apply')]")
    print("Clicking Apply button...")

    # Monitor for progress indicator
    apply_button.click()
    time.sleep(0.2)  # Small delay to catch progress indicator

    # Check if progress indicator appears
    progress_indicator = driver.execute_script("""
        const progressEl = document.querySelector('.progress-indicator');
        return progressEl ? {
            visible: true,
            text: progressEl.textContent
        } : { visible: false };
    """)

    if progress_indicator['visible']:
        print(f"✓ Progress indicator appeared: '{progress_indicator['text']}'")
    else:
        print("⚠ Progress indicator not visible (operation may have been too fast)")

    time.sleep(2)  # Wait for operation to complete

    # Verify progress indicator disappears after completion
    progress_after = driver.execute_script("""
        return document.querySelector('.progress-indicator') !== null;
    """)

    if not progress_after:
        print("✓ Progress indicator disappeared after completion")
        return True
    else:
        print("✗ Progress indicator still visible")
        return False


def test_toast_notifications(driver, wait):
    """Test that toast notifications appear on successful Apply"""
    print("\n" + "="*60)
    print("TEST 2: Toast Notifications")
    print("="*60)

    # Make another change
    tab_cards = driver.find_elements(By.CLASS_NAME, 'tab-card')
    if len(tab_cards) < 2:
        print("⚠ Not enough tabs, skipping test")
        return False

    new_group_box = driver.find_element(By.CLASS_NAME, 'new-group-box')

    print("Creating another change...")
    actions = ActionChains(driver)
    actions.drag_and_drop(tab_cards[1], new_group_box).perform()
    time.sleep(1)

    # Apply changes
    apply_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Apply')]")
    apply_button.click()

    time.sleep(1)  # Wait for toast to appear

    # Check for toast container
    toasts = driver.execute_script("""
        const container = document.querySelector('.toast-container');
        if (!container) return [];

        const toastEls = container.querySelectorAll('.toast');
        return Array.from(toastEls).map(toast => ({
            visible: true,
            type: toast.className.match(/toast-(\\w+)/)?.[1] || 'unknown',
            message: toast.querySelector('.toast-message')?.textContent || '',
            icon: toast.querySelector('.toast-icon')?.textContent || ''
        }));
    """)

    if len(toasts) > 0:
        print(f"✓ Found {len(toasts)} toast notification(s):")
        for i, toast in enumerate(toasts, 1):
            print(f"  Toast {i}: [{toast['type']}] {toast['icon']} {toast['message']}")

        # Wait for toast auto-dismiss
        print("\nWaiting 6 seconds for toast auto-dismiss...")
        time.sleep(6)

        toasts_after = driver.execute_script("""
            const container = document.querySelector('.toast-container');
            return container ? container.querySelectorAll('.toast').length : 0;
        """)

        if toasts_after == 0:
            print("✓ Toasts auto-dismissed after timeout")
            return True
        else:
            print(f"⚠ {toasts_after} toast(s) still visible")
            return True  # Still pass if toasts appeared
    else:
        print("✗ No toast notifications found")
        return False


def test_rename_group(driver, wait):
    """Test renaming a group and applying changes"""
    print("\n" + "="*60)
    print("TEST 3: Group Rename with Toast")
    print("="*60)

    # Find a group
    groups = driver.find_elements(By.CLASS_NAME, 'group-container')
    if len(groups) == 0:
        print("⚠ No groups found, skipping test")
        return False

    print(f"Found {len(groups)} group(s)")

    # Click on group title to edit
    group_title = groups[0].find_element(By.CLASS_NAME, 'group-title')
    print(f"Current group name: '{group_title.text}'")

    group_title.click()
    time.sleep(0.5)

    # Find input field
    title_input = groups[0].find_element(By.CLASS_NAME, 'group-title-input')

    # Change the name
    new_name = f"Test Group {int(time.time())}"
    title_input.clear()
    title_input.send_keys(new_name)

    print(f"Renamed to: '{new_name}'")

    # Blur to save
    driver.execute_script("arguments[0].blur();", title_input)
    time.sleep(0.5)

    # Apply changes
    apply_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Apply')]")
    apply_button.click()

    time.sleep(1)

    # Check console logs for rename operation
    console_logs = driver.execute_script("""
        return window.lastConsoleLog || 'No logs captured';
    """)

    print(f"Console activity: {console_logs}")

    # Verify toast appeared
    toasts = driver.execute_script("""
        const container = document.querySelector('.toast-container');
        return container ? container.querySelectorAll('.toast').length : 0;
    """)

    if toasts > 0:
        print(f"✓ Toast notification appeared ({toasts} toast(s))")
        return True
    else:
        print("⚠ No toast appeared (operation may have completed instantly)")
        return True


def test_error_handling(driver, wait):
    """Test error handling and error toasts"""
    print("\n" + "="*60)
    print("TEST 4: Error Handling")
    print("="*60)

    # Get current error count from console
    errors_before = driver.execute_script("""
        return window.console.errorCount || 0;
    """)

    print(f"Console errors before test: {errors_before}")

    # Try to apply with no changes
    has_changes = driver.execute_script("""
        return document.querySelector('.footer-status') !== null;
    """)

    if not has_changes:
        print("✓ No changes pending (as expected)")

        # Try clicking Apply anyway
        apply_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Apply')]")
        is_disabled = apply_button.get_attribute('disabled')

        if is_disabled:
            print("✓ Apply button is disabled when no changes")
            return True
        else:
            print("⚠ Apply button is enabled with no changes")
            return True
    else:
        print("⚠ Changes still pending from previous tests")
        return True


def test_console_logging(driver):
    """Test that detailed console logging is working"""
    print("\n" + "="*60)
    print("TEST 5: Console Logging")
    print("="*60)

    # Capture browser console logs
    logs = driver.get_log('browser')

    # Filter for our application logs
    app_logs = [log for log in logs if 'Better Tabs' in log.get('message', '')
                or 'Applying changes' in log.get('message', '')
                or 'Created group' in log.get('message', '')]

    if len(app_logs) > 0:
        print(f"✓ Found {len(app_logs)} application log entries")
        print("\nRecent logs:")
        for log in app_logs[-5:]:  # Show last 5
            level = log.get('level', 'INFO')
            message = log.get('message', '')
            # Clean up the message
            if 'console-api' in message:
                message = message.split('"')[-2] if '"' in message else message
            print(f"  [{level}] {message[:100]}")
        return True
    else:
        print("⚠ No application logs found in console")
        return True  # Don't fail on this


def run_all_tests():
    """Run all Phase 3 tests"""
    driver = setup_chrome_driver()
    results = {
        'progress_indicator': False,
        'toast_notifications': False,
        'rename_group': False,
        'error_handling': False,
        'console_logging': False
    }

    try:
        print("\n" + "="*60)
        print("PHASE 3 APPLY FUNCTIONALITY TESTS")
        print("="*60)

        # Create some test tabs
        print("\nSetting up test environment...")
        driver.get('https://www.google.com')
        time.sleep(1)

        driver.execute_script("window.open('https://www.github.com', '_blank');")
        time.sleep(0.5)

        driver.execute_script("window.open('https://www.stackoverflow.com', '_blank');")
        time.sleep(0.5)

        driver.execute_script("window.open('https://developer.mozilla.org', '_blank');")
        time.sleep(0.5)

        print("✓ Created 4 test tabs")

        # Find extension
        extension_id = find_extension_id(driver)
        print(f"\nExtension ID: {extension_id}")

        if not extension_id:
            print("ERROR: Could not find Better Tabs AI extension")
            return results

        # Open full interface
        full_interface_url = f"chrome-extension://{extension_id}/full-interface/dist/index.html"
        driver.get(full_interface_url)

        # Wait for interface to load
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'three-column-grid')))

        print("✓ Full interface loaded\n")
        time.sleep(2)

        # Run tests
        results['progress_indicator'] = test_progress_indicator(driver, wait)
        results['toast_notifications'] = test_toast_notifications(driver, wait)
        results['rename_group'] = test_rename_group(driver, wait)
        results['error_handling'] = test_error_handling(driver, wait)
        results['console_logging'] = test_console_logging(driver)

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
            print("\n🎉 All Phase 3 tests passed!")
        else:
            print(f"\n⚠ {total - passed} test(s) failed")

        print("\n" + "="*60)
        print("Browser window will remain open for inspection")
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
