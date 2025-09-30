"""
Selenium test for drag & drop functionality in Better Tabs AI full interface
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def setup_chrome_driver():
    """Setup Chrome with the Better Tabs AI extension loaded"""
    options = Options()

    # Load unpacked extension
    extension_path = r"c:\Users\nadiar\Code\better-tabs-ai"
    options.add_argument(f'--load-extension={extension_path}')
    options.add_argument('--disable-blink-features=AutomationControlled')

    driver = webdriver.Chrome(options=options)
    return driver


def test_drag_performance():
    """Test drag performance and visual behavior"""
    driver = setup_chrome_driver()

    try:
        # Open some test tabs
        driver.get('https://www.google.com')
        time.sleep(1)

        driver.execute_script("window.open('https://www.github.com', '_blank');")
        time.sleep(1)

        driver.execute_script("window.open('https://www.stackoverflow.com', '_blank');")
        time.sleep(1)

        # Get extension ID
        driver.get('chrome://extensions/')
        time.sleep(2)

        # Find Better Tabs AI extension ID
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
        print(f"Extension ID: {extension_id}")

        if not extension_id:
            print("ERROR: Could not find Better Tabs AI extension")
            return

        # Open full interface
        full_interface_url = f"chrome-extension://{extension_id}/full-interface/dist/index.html"
        driver.get(full_interface_url)

        # Wait for interface to load
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'three-column-grid')))

        print("✓ Full interface loaded")
        time.sleep(2)

        # Find first tab card
        tab_cards = driver.find_elements(By.CLASS_NAME, 'tab-card')

        if not tab_cards:
            print("ERROR: No tab cards found")
            return

        print(f"Found {len(tab_cards)} tab cards")

        # Test 1: Drag within same column (check for overflow constraints)
        print("\n=== Test 1: Drag within same column ===")
        first_tab = tab_cards[0]

        # Get initial position
        initial_rect = driver.execute_script("""
            const el = arguments[0];
            const rect = el.getBoundingClientRect();
            return {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
        """, first_tab)

        print(f"Initial position: x={initial_rect['x']}, y={initial_rect['y']}")

        # Perform drag
        actions = ActionChains(driver)
        actions.click_and_hold(first_tab).perform()
        time.sleep(0.5)

        # Measure performance during drag
        start_time = time.time()

        for i in range(10):
            offset_x = 50 * (i % 2)  # Move back and forth
            offset_y = 20 * i

            actions.move_by_offset(offset_x, offset_y).perform()

            # Check if element is still within parent bounds
            current_pos = driver.execute_script("""
                const el = arguments[0];
                const rect = el.getBoundingClientRect();
                const parent = el.closest('.column, .group-tabs');
                const parentRect = parent ? parent.getBoundingClientRect() : null;

                return {
                    element: {x: rect.x, y: rect.y},
                    parent: parentRect ? {x: parentRect.x, y: parentRect.y, right: parentRect.right, bottom: parentRect.bottom} : null,
                    isOverflowing: parentRect ? (rect.x < parentRect.x || rect.x > parentRect.right) : false
                };
            """, first_tab)

            print(f"  Move {i+1}: Element at ({current_pos['element']['x']}, {current_pos['element']['y']}), Overflow: {current_pos['isOverflowing']}")

            time.sleep(0.1)

        end_time = time.time()
        duration = end_time - start_time

        print(f"Drag duration: {duration:.2f}s for 10 moves ({duration/10:.3f}s per move)")

        actions.release().perform()
        time.sleep(1)

        # Test 2: Drag to different columns (check drop zone detection)
        print("\n=== Test 2: Drag to different columns ===")

        if len(tab_cards) > 0:
            tab_to_drag = tab_cards[0]

            # Find group container
            groups = driver.find_elements(By.CLASS_NAME, 'group-container')
            new_group_box = driver.find_element(By.CLASS_NAME, 'new-group-box')

            if groups:
                print(f"Found {len(groups)} groups")
                target_group = groups[0]

                actions = ActionChains(driver)
                actions.drag_and_drop(tab_to_drag, target_group).perform()

                time.sleep(1)

                # Check if drag-over class was applied
                has_drag_over = driver.execute_script("""
                    return arguments[0].classList.contains('drag-over');
                """, target_group)

                print(f"  Group had drag-over class during hover: {has_drag_over}")

            # Test drag to new group box
            print("\n  Testing drag to New Group Box")

            if len(tab_cards) > 1:
                actions = ActionChains(driver)
                actions.drag_and_drop(tab_cards[1], new_group_box).perform()
                time.sleep(1)

        # Test 3: Performance metrics
        print("\n=== Test 3: Performance Metrics ===")

        perf_metrics = driver.execute_script("""
            const metrics = performance.getEntriesByType('measure');
            const memory = performance.memory;

            return {
                usedJSHeapSize: memory ? memory.usedJSHeapSize : null,
                totalJSHeapSize: memory ? memory.totalJSHeapSize : null,
                measureCount: metrics.length
            };
        """)

        print(f"JS Heap Used: {perf_metrics['usedJSHeapSize'] / 1024 / 1024:.2f} MB" if perf_metrics['usedJSHeapSize'] else "Memory metrics not available")

        # Test 4: Check CSS overflow properties
        print("\n=== Test 4: CSS Overflow Check ===")

        overflow_info = driver.execute_script("""
            const column = document.querySelector('.column-content');
            const groupTabs = document.querySelector('.group-tabs');

            const getStyles = (el) => {
                if (!el) return null;
                const styles = window.getComputedStyle(el);
                return {
                    overflow: styles.overflow,
                    overflowX: styles.overflowX,
                    overflowY: styles.overflowY,
                    position: styles.position
                };
            };

            return {
                columnContent: getStyles(column),
                groupTabs: getStyles(groupTabs)
            };
        """)

        print(f"Column content overflow: {overflow_info['columnContent']}")
        print(f"Group tabs overflow: {overflow_info['groupTabs']}")

        print("\n=== Test Complete ===")
        print("Check the browser window for visual inspection")
        input("Press Enter to close the browser...")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()


if __name__ == '__main__':
    print("Starting Drag & Drop Test for Better Tabs AI")
    print("=" * 60)
    test_drag_performance()
