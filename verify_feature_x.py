import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(record_video_dir="/home/jules/verification/video")
        page = await context.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        await page.goto("http://localhost:5173/")
        await asyncio.sleep(2)

        # 1. Click Import PCF
        await page.click("text=/Import PCF/i")
        file_input = page.locator("input[type='file']")
        await file_input.set_input_files("tests/benchmarks/BM1_Gaps_Overlaps.pcf")
        await asyncio.sleep(2)

        # Go to Stage 2
        await page.click("text=/Stage 2/i")
        await asyncio.sleep(1)

        # Pull from Stage 1
        await page.click("button:has-text('Pull Data from Stage 1')")
        await asyncio.sleep(1)
        try:
             await page.click("button:has-text('Yes')", timeout=1000)
             await asyncio.sleep(1)
        except Exception: pass
        try:
            await page.click("text=/Close/i", timeout=1000)
        except: pass
        await asyncio.sleep(1)

        # Try to scroll the table to the right
        await page.evaluate("() => { const table = document.querySelector('.overflow-x-auto'); if(table) table.scrollLeft = 2000; }")

        # Click Run Phase 1 Validator
        await page.click("button:has-text('Run Phase 1 Validator')")
        await asyncio.sleep(2)
        try:
            await page.click("button:has-text('Run Engine')", timeout=1000)
            await asyncio.sleep(2)
        except Exception: pass

        # Click Smart Fix
        try:
            await page.wait_for_selector("button:has-text('Smart Fix'):not([disabled])", timeout=5000)
            await page.click("button:has-text('Smart Fix')")
            await asyncio.sleep(2)
        except Exception: pass

        await page.evaluate("() => { const table = document.querySelector('.overflow-x-auto'); if(table) table.scrollLeft = 2000; }")

        # View 1st pass pending state
        await page.screenshot(path="/home/jules/verification/pass1_pending.png")

        # Find reject button and click it
        try:
            reject_btn = page.locator("button:has-text('✗ Reject')").first
            await reject_btn.click(timeout=2000)
            await asyncio.sleep(1)
            await page.screenshot(path="/home/jules/verification/pass1_rejected.png")
        except Exception: pass

        try:
            approve_btn = page.locator("button:has-text('✓ Approve')").first
            await approve_btn.click(timeout=2000)
            await asyncio.sleep(1)
        except Exception: pass

        await page.click("button:has-text('Apply Fixes')")
        await asyncio.sleep(1)
        try:
            await page.click("button:has-text('Confirm Apply')", timeout=1000)
        except:
            try: await page.click("button:has-text('Apply')", timeout=1000)
            except: pass

        await asyncio.sleep(2)

        # Run Pass 2
        await page.click("button:has-text('Run Second Pass')")
        await asyncio.sleep(2)
        await page.evaluate("() => { const table = document.querySelector('.overflow-x-auto'); if(table) table.scrollLeft = 2000; }")

        await page.screenshot(path="/home/jules/verification/pass2_results.png")

        # Go to Config Tab to check the score text addition
        await page.click("text=/Config/i")
        await asyncio.sleep(1)
        await page.screenshot(path="/home/jules/verification/config_tab.png")

        await context.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
