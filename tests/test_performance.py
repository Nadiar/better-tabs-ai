"""
Performance testing for Better Tabs AI drag & drop interface
Uses the mock HTML interface for consistent testing
"""
import time
import statistics
import sys
from pathlib import Path
from selenium import webdriver

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def setup_chrome_driver():
    """Setup Chrome for performance testing"""
    options = Options()
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--start-maximized')

    # Enable performance logging
    options.set_capability('goog:loggingPrefs', {'performance': 'ALL', 'browser': 'ALL'})

    driver = webdriver.Chrome(options=options)
    return driver


def measure_drag_performance(driver, iterations=20):
    """Measure drag operation performance"""
    print("\n" + "="*60)
    print("DRAG PERFORMANCE TEST")
    print("="*60)

    # Find draggable elements
    tab_cards = driver.find_elements(By.CLASS_NAME, 'tab-card')

    if len(tab_cards) < 2:
        print("ERROR: Not enough tab cards found")
        return

    print(f"Found {len(tab_cards)} tab cards")

    drag_times = []
    render_times = []

    for i in range(iterations):
        # Select random source and target
        source_idx = i % len(tab_cards)
        target_idx = (i + 1) % len(tab_cards)

        source = tab_cards[source_idx]
        target = tab_cards[target_idx]

        # Measure drag operation time
        start_time = time.time()

        actions = ActionChains(driver)
        actions.click_and_hold(source).perform()

        # Small movements to trigger drag
        for j in range(5):
            actions.move_by_offset(10, 10 * j).perform()
            time.sleep(0.01)

        actions.release().perform()

        drag_time = time.time() - start_time
        drag_times.append(drag_time)

        # Measure render time after drag
        render_start = time.time()
        time.sleep(0.05)  # Wait for render
        render_time = time.time() - render_start
        render_times.append(render_time)

        # Check for layout thrashing
        layout_info = driver.execute_script("""
            return {
                reflows: performance.getEntriesByType('measure').length,
                timestamp: performance.now()
            };
        """)

        if i % 5 == 0:
            print(f"  Iteration {i+1}/{iterations}: Drag={drag_time*1000:.2f}ms, Reflows={layout_info['reflows']}")

        time.sleep(0.1)  # Cooldown between drags

    print("\n" + "-"*60)
    print("DRAG PERFORMANCE STATISTICS:")
    print("-"*60)
    print(f"Average drag time: {statistics.mean(drag_times)*1000:.2f}ms")
    print(f"Median drag time: {statistics.median(drag_times)*1000:.2f}ms")
    print(f"Min drag time: {min(drag_times)*1000:.2f}ms")
    print(f"Max drag time: {max(drag_times)*1000:.2f}ms")
    print(f"Std deviation: {statistics.stdev(drag_times)*1000:.2f}ms")

    # Check for performance degradation
    first_half = drag_times[:len(drag_times)//2]
    second_half = drag_times[len(drag_times)//2:]

    first_avg = statistics.mean(first_half) * 1000
    second_avg = statistics.mean(second_half) * 1000
    degradation = ((second_avg - first_avg) / first_avg) * 100

    print(f"\nFirst half avg: {first_avg:.2f}ms")
    print(f"Second half avg: {second_avg:.2f}ms")
    print(f"Degradation: {degradation:+.1f}%")

    if degradation > 20:
        print("⚠️  WARNING: Significant performance degradation detected!")
    elif degradation > 0:
        print("⚠️  Slight performance degradation detected")
    else:
        print("✓ No performance degradation")


def measure_scroll_performance(driver):
    """Measure scrolling performance in columns"""
    print("\n" + "="*60)
    print("SCROLL PERFORMANCE TEST")
    print("="*60)

    # Find scrollable columns
    columns = driver.find_elements(By.CLASS_NAME, 'column-content')

    if not columns:
        print("ERROR: No scrollable columns found")
        return

    print(f"Found {len(columns)} scrollable columns")

    scroll_times = []

    for col_idx, column in enumerate(columns):
        print(f"\nTesting column {col_idx + 1}...")

        # Scroll down
        for i in range(10):
            start_time = time.time()

            driver.execute_script("""
                arguments[0].scrollTop += 50;
            """, column)

            scroll_time = time.time() - start_time
            scroll_times.append(scroll_time)

            time.sleep(0.02)

        # Scroll back up
        driver.execute_script("arguments[0].scrollTop = 0;", column)

    print("\n" + "-"*60)
    print("SCROLL PERFORMANCE STATISTICS:")
    print("-"*60)
    print(f"Average scroll time: {statistics.mean(scroll_times)*1000:.2f}ms")
    print(f"Max scroll time: {max(scroll_times)*1000:.2f}ms")

    if statistics.mean(scroll_times) * 1000 > 16:  # 60fps threshold
        print("⚠️  WARNING: Scrolling slower than 60fps")
    else:
        print("✓ Scrolling at 60fps or better")


def measure_memory_usage(driver):
    """Check for memory leaks"""
    print("\n" + "="*60)
    print("MEMORY USAGE TEST")
    print("="*60)

    memory_samples = []

    for i in range(10):
        memory_info = driver.execute_script("""
            if (performance.memory) {
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        """)

        if memory_info:
            memory_samples.append(memory_info['usedJSHeapSize'])
            print(f"Sample {i+1}: {memory_info['usedJSHeapSize'] / 1024 / 1024:.2f} MB used")

        # Perform some operations
        tab_cards = driver.find_elements(By.CLASS_NAME, 'tab-card')
        if tab_cards:
            actions = ActionChains(driver)
            actions.move_to_element(tab_cards[0]).perform()

        time.sleep(0.5)

    if memory_samples:
        print("\n" + "-"*60)
        print("MEMORY STATISTICS:")
        print("-"*60)
        print(f"Initial memory: {memory_samples[0] / 1024 / 1024:.2f} MB")
        print(f"Final memory: {memory_samples[-1] / 1024 / 1024:.2f} MB")
        print(f"Memory growth: {(memory_samples[-1] - memory_samples[0]) / 1024 / 1024:.2f} MB")

        growth_percent = ((memory_samples[-1] - memory_samples[0]) / memory_samples[0]) * 100
        print(f"Growth percentage: {growth_percent:.1f}%")

        if growth_percent > 50:
            print("⚠️  WARNING: Significant memory growth - possible leak!")
        elif growth_percent > 20:
            print("⚠️  Moderate memory growth detected")
        else:
            print("✓ Memory usage stable")


def measure_dom_complexity(driver):
    """Analyze DOM complexity and potential bottlenecks"""
    print("\n" + "="*60)
    print("DOM COMPLEXITY ANALYSIS")
    print("="*60)

    dom_stats = driver.execute_script("""
        return {
            totalElements: document.querySelectorAll('*').length,
            tabCards: document.querySelectorAll('.tab-card').length,
            groupContainers: document.querySelectorAll('.group-container').length,
            depth: (function getMaxDepth(element) {
                if (!element.children.length) return 1;
                return 1 + Math.max(...Array.from(element.children).map(getMaxDepth));
            })(document.body)
        };
    """)

    print(f"Total DOM elements: {dom_stats['totalElements']}")
    print(f"Tab cards: {dom_stats['tabCards']}")
    print(f"Group containers: {dom_stats['groupContainers']}")
    print(f"DOM depth: {dom_stats['depth']}")

    if dom_stats['totalElements'] > 1500:
        print("⚠️  WARNING: High DOM element count - consider virtualization")
    else:
        print("✓ DOM element count acceptable")


def check_css_performance(driver):
    """Check for CSS performance issues"""
    print("\n" + "="*60)
    print("CSS PERFORMANCE CHECK")
    print("="*60)

    css_stats = driver.execute_script("""
        const styles = Array.from(document.styleSheets);
        let totalRules = 0;

        styles.forEach(sheet => {
            try {
                totalRules += sheet.cssRules.length;
            } catch(e) {
                // CORS blocked
            }
        });

        return {
            stylesheets: styles.length,
            totalRules: totalRules
        };
    """)

    print(f"Stylesheets loaded: {css_stats['stylesheets']}")
    print(f"Total CSS rules: {css_stats['totalRules']}")

    # Check for expensive selectors
    expensive_selectors = driver.execute_script("""
        const selectors = [];
        try {
            const rules = Array.from(document.styleSheets[0].cssRules);
            rules.forEach(rule => {
                if (rule.selectorText && (
                    rule.selectorText.includes('*') ||
                    rule.selectorText.includes(':not(') ||
                    rule.selectorText.split(' ').length > 4
                )) {
                    selectors.push(rule.selectorText);
                }
            });
        } catch(e) {}
        return selectors.slice(0, 5);
    """)

    if expensive_selectors:
        print(f"\n⚠️  Found {len(expensive_selectors)} potentially expensive CSS selectors:")
        for sel in expensive_selectors[:5]:
            print(f"  - {sel}")


def run_performance_tests():
    """Run all performance tests"""
    driver = setup_chrome_driver()

    try:
        # Get path to mock HTML
        test_dir = Path(__file__).parent
        mock_html = test_dir / 'mock-interface.html'

        if not mock_html.exists():
            print(f"ERROR: Mock HTML not found at {mock_html}")
            return

        print(f"Loading mock interface from: {mock_html}")
        driver.get(f"file:///{mock_html.as_posix()}")

        # Wait for page load
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'three-column-grid')))

        print("✓ Mock interface loaded successfully")
        time.sleep(2)  # Let everything settle

        # Run all tests
        measure_dom_complexity(driver)
        check_css_performance(driver)
        measure_memory_usage(driver)
        measure_scroll_performance(driver)
        measure_drag_performance(driver)

        # Final summary
        print("\n" + "="*60)
        print("PERFORMANCE TEST SUMMARY")
        print("="*60)
        print("\nRecommendations:")
        print("1. Monitor drag performance degradation over time")
        print("2. Consider React.memo() for TabCard components")
        print("3. Use CSS containment for better paint performance")
        print("4. Consider virtualization if tab count exceeds 100")
        print("5. Debounce drag events if performance degrades")

        print("\n✓ All performance tests completed")
        print("\nBrowser window will remain open for manual inspection.")
        input("Press Enter to close browser and exit...")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()


if __name__ == '__main__':
    print("Starting Performance Tests for Better Tabs AI")
    print("="*60)
    run_performance_tests()
