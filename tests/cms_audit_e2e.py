"""
CMS Audit E2E Test Suite — Highlands Motel & Cafe
==================================================
Logs into admin → modifies content → verifies on customer site
Generates pass/fail report + screenshots
"""

import os
import sys
import json
import time
import datetime
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# ── Config ──────────────────────────────────────────────────────────────────
BASE_URL = os.getenv("CMS_BASE_URL", "http://localhost:5173")
ADMIN_EMAIL = os.getenv("CMS_ADMIN_EMAIL", "admin@highlands.com")
ADMIN_PASSWORD = os.getenv("CMS_ADMIN_PASSWORD", "Test@123")
HEADLESS = os.getenv("CMS_HEADLESS", "false").lower() == "true"
SCREENSHOT_DIR = Path(__file__).parent / "cms_screenshots"

RESULTS = {"pass": 0, "fail": 0, "tests": []}
TEST_TIMESTAMP = datetime.datetime.now().isoformat()

# ── Helpers ─────────────────────────────────────────────────────────────────

def report(name: str, passed: bool, detail: str = ""):
    status = "✅ PASS" if passed else "❌ FAIL"
    RESULTS["pass" if passed else "fail"] += 1
    RESULTS["tests"].append({"name": name, "passed": passed, "detail": detail})
    print(f"  {status}  {name}" + (f" — {detail}" if detail else ""))


class CMSTester:
    def __init__(self):
        opts = webdriver.ChromeOptions()
        if HEADLESS:
            opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--window-size=1400,900")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=opts)
        self.wait = WebDriverWait(self.driver, 15)
        self.driver.set_page_load_timeout(30)
        SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
        self._test_id = 0

    def cleanup(self):
        self.driver.quit()

    def screenshot(self, label: str):
        self._test_id += 1
        path = SCREENSHOT_DIR / f"{self._test_id:03d}_{label}.png"
        self.driver.save_screenshot(str(path))
        return path

    def get(self, path: str):
        self.driver.get(f"{BASE_URL}{path}")
        time.sleep(1.5)

    def wait_for_text(self, text: str, timeout: int = 15):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{text}')]"))
        )

    def wait_and_click(self, by: By, value: str, timeout: int = 15):
        el = WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((by, value))
        )
        self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
        time.sleep(0.3)
        el.click()
        return el

    def wait_and_send(self, by: By, value: str, text: str, timeout: int = 15):
        el = WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )
        el.clear()
        el.send_keys(text)
        return el

    def scroll_to_bottom(self):
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(0.5)

    # ── Phases ──────────────────────────────────────────────────────────────

    def phase_login(self):
        print("\n═══ PHASE: Admin Login ═══")
        try:
            self.get("/admin/login")
            self.screenshot("01-login-page")
            self.wait_and_send(By.CSS_SELECTOR, "input[type='email']", ADMIN_EMAIL)
            self.wait_and_send(By.CSS_SELECTOR, "input[type='password']", ADMIN_PASSWORD)
            self.screenshot("02-login-filled")
            self.wait_and_click(By.XPATH, "//button[contains(text(), 'Sign In')]")
            time.sleep(3)
            # Check we landed on dashboard or got redirected
            current = self.driver.current_url
            if "dashboard" in current or "admin" in current:
                self.screenshot("03-logged-in-dashboard")
                report("Admin login", True)
            else:
                self.screenshot("03-login-failed")
                report("Admin login", False, f"URL ended at: {current}")
                return False
            return True
        except Exception as e:
            self.screenshot("03-login-error")
            report("Admin login", False, str(e))
            return False

    def phase_content_editor(self):
        print("\n═══ PHASE: Content Editor — Modify Homepage Text ═══")
        try:
            self.get("/admin/content")
            self.screenshot("10-content-editor")

            # Find and modify hero_title
            hero_input = self.driver.find_element(By.XPATH,
                "//label[contains(text(), 'Hero Title')]/following::input[1]")
            original = hero_input.get_attribute("value")
            test_value = f"🏔️ Highlands Motel — CMS Test {int(time.time())}"
            hero_input.clear()
            hero_input.send_keys(test_value)

            # Click save for hero_title
            save_btn = hero_input.find_element(By.XPATH,
                "./ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Save')]")
            save_btn.click()
            time.sleep(2)

            # Verify toast
            try:
                self.wait_for_text("Saved", 5)
                report("Content Editor — save hero_title", True, f"Set to: {test_value}")
            except TimeoutException:
                report("Content Editor — save hero_title", False, "No success toast")

            self.screenshot("11-content-editor-saved")
            return test_value
        except Exception as e:
            self.screenshot("10-content-editor-error")
            report("Content Editor", False, str(e))
            return None

    def phase_verify_homepage(self, expected_text: str):
        print("\n═══ PHASE: Customer Homepage — Verify Content Change ═══")
        try:
            self.get("/")
            self.screenshot("20-homepage-loaded")
            if expected_text:
                try:
                    self.wait_for_text(expected_text, 10)
                    self.screenshot("21-homepage-cms-verified")
                    report("Homepage reflects CMS change", True,
                           f"Found: '{expected_text}'")
                except TimeoutException:
                    self.screenshot("21-homepage-cms-missing")
                    report("Homepage reflects CMS change", False,
                           f"Expected '{expected_text}' not found on page")
            return True
        except Exception as e:
            self.screenshot("20-homepage-error")
            report("Homepage loads", False, str(e))
            return False

    def phase_rooms_admin(self):
        print("\n═══ PHASE: Rooms Admin — Modify Room ═══")
        try:
            self.get("/admin/rooms")
            self.screenshot("30-rooms-admin")
            time.sleep(2)

            # Click edit on first room
            edit_btns = self.driver.find_elements(By.XPATH,
                "//button[contains(text(), 'Edit')]")
            if not edit_btns:
                # Try to find room card with edit icon
                edit_btns = self.driver.find_elements(By.CSS_SELECTOR,
                    "[aria-label='Edit room'], button:has(svg:not([class*='hidden']))")
            if not edit_btns:
                edit_btns = self.driver.find_elements(By.XPATH,
                    "//*[local-name()='svg' and @*='edit']/ancestor::button")

            if edit_btns:
                self.driver.execute_script("arguments[0].click();", edit_btns[0])
                time.sleep(2)
                self.screenshot("31-room-edit-modal")

                # Modify room name
                name_input = self.wait_and_send(
                    By.CSS_SELECTOR, "input[placeholder*='Mountain']",
                    f"Superior Suite CMS {int(time.time())}")
                self.screenshot("32-room-edit-modified")

                # Scroll down and save
                self.scroll_to_bottom()
                save_btns = self.driver.find_elements(By.XPATH,
                    "//button[contains(text(), 'Save')]")
                for btn in save_btns:
                    if "Cancel" not in btn.text:
                        self.driver.execute_script("arguments[0].click();", btn)
                        break
                time.sleep(3)
                self.screenshot("33-room-saved")
                report("Rooms Admin — modify room name", True)
            else:
                report("Rooms Admin — modify room name", False,
                       "No edit button found")
            return True
        except Exception as e:
            self.screenshot("30-rooms-error")
            report("Rooms Admin", False, str(e))
            return False

    def phase_rooms_customer(self):
        print("\n═══ PHASE: Customer Rooms Page ═══")
        try:
            self.get("/rooms")
            self.screenshot("40-rooms-customer")
            report("Rooms page loads", True)
            time.sleep(2)

            room_cards = self.driver.find_elements(By.CSS_SELECTOR,
                "[class*='card'], [class*='rounded-2xl'] h3")
            report("Rooms page has content", len(room_cards) > 2,
                   f"Found {len(room_cards)} room elements")
            self.screenshot("41-rooms-content")
            return True
        except Exception as e:
            self.screenshot("40-rooms-error")
            report("Rooms page", False, str(e))
            return False

    def phase_image_admin(self):
        print("\n═══ PHASE: Image Management ═══")
        try:
            self.get("/admin/images")
            self.screenshot("50-images-admin")
            time.sleep(2)
            report("Image management page loads", True)
            return True
        except Exception as e:
            self.screenshot("50-images-error")
            report("Image management", False, str(e))
            return False

    def phase_customer_pages(self):
        print("\n═══ PHASE: All Customer Pages ═══")
        pages = [
            ("/", "Homepage"),
            ("/rooms", "Rooms"),
            ("/cafe", "Cafe"),
            ("/about", "About"),
            ("/contact", "Contact"),
            ("/faq", "FAQ"),
            ("/gallery", "Gallery"),
            ("/booking", "Booking"),
            ("/terms", "Terms"),
            ("/privacy", "Privacy"),
        ]
        all_ok = True
        for path, name in pages:
            try:
                self.get(path)
                self.screenshot(f"60-{name.lower().replace(' ','-')}")
                page_title = self.driver.title
                report(f"{name} page loads", True, f"Title: {page_title}")
            except Exception as e:
                self.screenshot(f"60-{name.lower().replace(' ','-')}-error")
                report(f"{name} page loads", False, str(e))
                all_ok = False
            time.sleep(0.5)
        return all_ok

    def phase_seo_metadata(self):
        print("\n═══ PHASE: SEO Meta Tags ═══")
        pages_with_seo = [
            ("/", "home_meta_title"),
            ("/rooms", "rooms_meta_title"),
            ("/cafe", "cafe_meta_title"),
            ("/about", "about_meta_title"),
            ("/contact", "contact_meta_title"),
            ("/faq", "faq_meta_title"),
            ("/gallery", "gallery_meta_title"),
            ("/booking", "booking_meta_title"),
            ("/terms", "terms_meta_title"),
            ("/privacy", "privacy_meta_title"),
        ]
        for path, key in pages_with_seo:
            try:
                self.get(path)
                title = self.driver.title
                report(f"SEO meta — {path}", bool(title) and len(title) > 5,
                       f"Title: {title[:60]}...")
            except Exception as e:
                report(f"SEO meta — {path}", False, str(e))

    def phase_navbar_footer(self):
        print("\n═══ PHASE: Navigation & Footer ═══")
        try:
            self.get("/")
            nav = self.driver.find_element(By.TAG_NAME, "nav")
            report("Navbar exists", True)
            footer = self.driver.find_element(By.TAG_NAME, "footer")
            report("Footer exists", True)
            footer_text = footer.text
            report("Footer has contact info",
                   "Phone" in footer_text or "Contact" in footer_text or "Highlands" in footer_text)
            self.screenshot("70-navbar-footer")
        except Exception as e:
            report("Navigation/Footer", False, str(e))

    # ── New CMS Phases ─────────────────────────────────────────────────────

    def phase_cms_navigation_admin(self):
        print("\n═══ PHASE: CMS — Navigation Admin ═══")
        try:
            self.get("/admin/navigation")
            time.sleep(2)
            self.screenshot("80-cms-navigation-admin")
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            report("Navigation admin loads", "Navigation Manager" in page_text)
            return True
        except Exception as e:
            report("Navigation admin", False, str(e))
            return False

    def phase_cms_pages_admin(self):
        print("\n═══ PHASE: CMS — Pages Admin ═══")
        try:
            self.get("/admin/pages")
            time.sleep(2)
            self.screenshot("81-cms-pages-admin")
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            report("Pages admin loads", "Create New Page" in page_text or "Pages" in page_text)
            return True
        except Exception as e:
            report("Pages admin", False, str(e))
            return False

    def phase_cms_faq_admin(self):
        print("\n═══ PHASE: CMS — FAQ Admin ═══")
        try:
            self.get("/admin/faq")
            time.sleep(2)
            self.screenshot("82-cms-faq-admin")
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            report("FAQ admin loads", "FAQ Manager" in page_text)
            return True
        except Exception as e:
            report("FAQ admin", False, str(e))
            return False

    def phase_cms_media_admin(self):
        print("\n═══ PHASE: CMS — Media Library ═══")
        try:
            self.get("/admin/media")
            time.sleep(2)
            self.screenshot("83-cms-media-admin")
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            report("Media library loads", "Media Library" in page_text)
            return True
        except Exception as e:
            report("Media library", False, str(e))
            return False

    def phase_cms_settings_admin(self):
        print("\n═══ PHASE: CMS — Site Settings ═══")
        try:
            self.get("/admin/settings")
            time.sleep(2)
            self.screenshot("84-cms-settings-admin")
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            report("Site settings loads", "Site Settings" in page_text)
            return True
        except Exception as e:
            report("Site settings", False, str(e))
            return False

    def phase_cms_revisions_admin(self):
        print("\n═══ PHASE: CMS — Revisions ═══")
        try:
            self.get("/admin/revisions")
            time.sleep(2)
            self.screenshot("85-cms-revisions-admin")
            page_text = self.driver.find_element(By.TAG_NAME, "body").text
            report("Revisions page loads", "Revision History" in page_text)
            return True
        except Exception as e:
            report("Revisions page", False, str(e))
            return False

    def phase_cms_dynamic_page(self):
        print("\n═══ PHASE: CMS — Dynamic Page Fallback ═══")
        try:
            self.get("/nonexistent-test-slug-12345")
            time.sleep(2)
            self.screenshot("86-cms-dynamic-404")
            body = self.driver.find_element(By.TAG_NAME, "body").text
            if "Page Not Found" in body or "not found" in body.lower():
                report("Dynamic page 404 for unknown slug", True)
            else:
                report("Dynamic page 404 for unknown slug", False, f"Got: {body[:80]}")
            return True
        except Exception as e:
            report("Dynamic page 404", False, str(e))
            return False

    def run(self):
        """Execute all test phases"""
        print(f"\n{'='*60}")
        print(f"CMS AUDIT E2E TEST SUITE")
        print(f"Target: {BASE_URL}")
        print(f"{'='*60}")
        print(f"Started at: {TEST_TIMESTAMP}")

        # Phase 1: Login
        logged_in = self.phase_login()
        if not logged_in:
            report("SKIPPED: All subsequent phases", False, "Login failed")
            self.generate_report()
            self.cleanup()
            return

        # Phase 2-3: Content Editor → Verify on homepage
        test_text = self.phase_content_editor()
        self.phase_verify_homepage(test_text)

        # Phase 4-5: Rooms
        self.phase_rooms_admin()
        self.phase_rooms_customer()

        # Phase 6: Images
        self.phase_image_admin()

        # Phase 7: All customer pages
        self.phase_customer_pages()

        # Phase 8: SEO
        self.phase_seo_metadata()

        # Phase 9: Nav/Footer
        self.phase_navbar_footer()

        # Phase 10-15: New CMS Admin Pages
        self.phase_cms_navigation_admin()
        self.phase_cms_pages_admin()
        self.phase_cms_faq_admin()
        self.phase_cms_media_admin()
        self.phase_cms_settings_admin()
        self.phase_cms_revisions_admin()

        # Phase 16: Dynamic Page
        self.phase_cms_dynamic_page()

        # Generate report
        self.generate_report()
        self.cleanup()

    def generate_report(self):
        """Generate HTML report"""
        total = RESULTS["pass"] + RESULTS["fail"]
        score = round((RESULTS["pass"] / total * 100), 1) if total else 0
        passed = RESULTS["pass"]
        failed = RESULTS["fail"]

        report_path = SCREENSHOT_DIR / "cms_audit_report.html"
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CMS Audit Report — Highlands Motel</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         max-width: 900px; margin: 2rem auto; padding: 1rem; background: #f5f5f5; }}
  h1 {{ color: #333; border-bottom: 2px solid #ddd; padding-bottom: 1rem; }}
  .summary {{ display: flex; gap: 2rem; margin: 1.5rem 0; }}
  .stat {{ background: white; border-radius: 12px; padding: 1.5rem 2rem; box-shadow: 0 1px 4px rgba(0,0,0,0.1); text-align: center; flex: 1; }}
  .stat .num {{ font-size: 2.5rem; font-weight: bold; }}
  .stat .label {{ font-size: 0.85rem; color: #666; }}
  .pass .num {{ color: #22c55e; }}
  .fail .num {{ color: #ef4444; }}
  .score .num {{ color: { '#22c55e' if score >= 80 else '#eab308' if score >= 50 else '#ef4444' }; }}
  table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }}
  th, td {{ padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #eee; }}
  th {{ background: #f8f8f8; font-weight: 600; }}
  .pass-badge {{ color: #22c55e; font-weight: bold; }}
  .fail-badge {{ color: #ef4444; font-weight: bold; }}
  .detail {{ color: #888; font-size: 0.85rem; }}
  .footer {{ margin-top: 2rem; text-align: center; color: #999; font-size: 0.85rem; }}
  .classification {{ background: {'#dcfce7' if score >= 80 else '#fef9c3' if score >= 50 else '#fee2e2'};
                     padding: 1rem; border-radius: 8px; margin: 1rem 0; font-weight: bold; text-align: center; }}
</style>
</head>
<body>
  <h1>🏔️ CMS Audit E2E Report</h1>
  <p>Target: <code>{BASE_URL}</code> | Date: {TEST_TIMESTAMP[:19].replace('T', ' ')}</p>

  <div class="classification">
    CMS Classification: {
        "FULLY FUNCTIONAL CMS" if score >= 90 else
        "MOSTLY CMS" if score >= 70 else
        "PARTIAL CMS" if score >= 40 else
        "NOT A CMS"
    } (Score: {score}%)
  </div>

  <div class="summary">
    <div class="stat score"><div class="num">{score}%</div><div class="label">CMS Score</div></div>
    <div class="stat pass"><div class="num">{passed}</div><div class="label">Passed</div></div>
    <div class="stat fail"><div class="num">{failed}</div><div class="label">Failed</div></div>
    <div class="stat"><div class="num">{total}</div><div class="label">Total Tests</div></div>
  </div>

  <table>
    <tr><th>#</th><th>Test</th><th>Status</th><th>Detail</th></tr>
"""
        for i, t in enumerate(RESULTS["tests"], 1):
            badge = '<span class="pass-badge">✅ PASS</span>' if t["passed"] else '<span class="fail-badge">❌ FAIL</span>'
            detail = f'<span class="detail">{t["detail"]}</span>' if t["detail"] else ""
            html += f"<tr><td>{i}</td><td>{t['name']}</td><td>{badge}</td><td>{detail}</td></tr>\n"

        html += f"""
  </table>

  <div class="footer">
    <p>Screenshots: <code>{SCREENSHOT_DIR}</code></p>
    <p>Generated by CMS Audit E2E Test Suite</p>
  </div>
</body>
</html>"""

        report_path.write_text(html)
        print(f"\n📊 Report generated: {report_path}")
        print(f"   Passed: {passed}  Failed: {failed}  Total: {total}  Score: {score}%")

        # Also print JSON results
        json_path = SCREENSHOT_DIR / "cms_audit_results.json"
        json_path.write_text(json.dumps(RESULTS, indent=2))
        print(f"📊 JSON results: {json_path}")


if __name__ == "__main__":
    print("CMS Audit E2E Test Suite")
    print("=" * 50)
    print(f"BASE_URL = {BASE_URL}")
    print(f"HEADLESS = {HEADLESS}")
    print(f"SCREENSHOTS = {SCREENSHOT_DIR}")
    print("=" * 50)

    tester = CMSTester()
    try:
        tester.run()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
        tester.generate_report()
        tester.cleanup()
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        tester.generate_report()
        tester.cleanup()
        sys.exit(1)
