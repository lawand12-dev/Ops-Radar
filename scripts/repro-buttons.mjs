import { chromium, firefox } from 'playwright'

const URL = 'https://www.opsradar.co/results?id=7e767f21-9e54-4973-9654-9759ec07c108&token=lP8otUhtlSaFgOt1tt4uZJkrAMRzX4sT6MMw-2lB9Ok'

async function testBrowser(browserType, name) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`TESTING: ${name}`)
  console.log('='.repeat(60))

  const browser = await browserType.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  // Collect ALL console messages
  const consoleMsgs = []
  page.on('console', (msg) => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() })
  })

  // Collect page errors
  const pageErrors = []
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  // Collect unhandled rejections via console 'error' type
  // (pageerror also catches these)

  console.log(`\n--- Navigating to results page ---`)
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
  } catch (e) {
    console.log(`Navigation warning: ${e.message}`)
  }

  // Wait for hydration — look for a client-side rendered element
  console.log(`--- Waiting for hydration ---`)
  try {
    // Wait for any interactive element that requires JS
    await page.waitForSelector('button', { timeout: 10000 })
    console.log('Buttons found in DOM')
  } catch {
    console.log('WARNING: No buttons found after 10s!')
  }

  // Extra wait for React hydration
  await page.waitForTimeout(3000)

  // Report initial page load errors
  console.log(`\n--- Initial page load console (errors/warnings only) ---`)
  const errorMsgs = consoleMsgs.filter(m => m.type === 'error' || m.type === 'warning')
  if (errorMsgs.length === 0) {
    console.log('(no errors or warnings)')
  } else {
    for (const m of errorMsgs) {
      console.log(`  [${m.type}] ${m.text}`)
    }
  }

  if (pageErrors.length > 0) {
    console.log(`\n--- Page errors on load ---`)
    for (const e of pageErrors) {
      console.log(`  ERROR: ${e}`)
    }
  } else {
    console.log(`(no page errors on load)`)
  }

  // Clear collected messages for per-button tracking
  const preClickConsoleCount = consoleMsgs.length
  const preClickErrorCount = pageErrors.length

  // Test 1: Download PDF button
  console.log(`\n--- Test: Download PDF button ---`)
  const pdfBtn = page.locator('button:has-text("Download PDF")')
  const pdfBtnCount = await pdfBtn.count()
  console.log(`  Found ${pdfBtnCount} "Download PDF" button(s)`)
  if (pdfBtnCount > 0) {
    const networkRequests = []
    page.on('request', (req) => networkRequests.push(req.url()))

    consoleMsgs.length = 0
    pageErrors.length = 0

    try {
      await pdfBtn.first().click({ timeout: 5000 })
      console.log('  Click executed successfully')
      await page.waitForTimeout(3000) // wait for any async handlers

      const newConsole = consoleMsgs.filter(m => m.type === 'error' || m.type === 'warning')
      if (newConsole.length > 0) {
        console.log('  Console after click:')
        for (const m of newConsole) console.log(`    [${m.type}] ${m.text}`)
      } else {
        console.log('  No new console errors after click')
      }

      if (pageErrors.length > 0) {
        console.log('  Page errors after click:')
        for (const e of pageErrors) console.log(`    ERROR: ${e}`)
      }

      if (networkRequests.length > 0) {
        console.log(`  Network requests triggered: ${networkRequests.length}`)
        for (const u of networkRequests.slice(0, 5)) console.log(`    ${u}`)
      } else {
        console.log('  No network requests triggered')
      }
    } catch (e) {
      console.log(`  Click failed: ${e.message}`)
    }
    page.removeAllListeners('request')
  }

  // Test 2: Strategy Call (Calendly) link
  console.log(`\n--- Test: Book Strategy Call ---`)
  const callLink = page.locator('a:has-text("Book")')
  const callCount = await callLink.count()
  console.log(`  Found ${callCount} "Book" link(s)`)
  if (callCount > 0) {
    const href = await callLink.first().getAttribute('href')
    console.log(`  href: ${href}`)
    const target = await callLink.first().getAttribute('target')
    console.log(`  target: ${target}`)
  }

  // Test 3: Request a Build Quote button
  console.log(`\n--- Test: Request a Build Quote ---`)
  const quoteBtn = page.locator('button:has-text("Request a Build Quote")')
  const quoteCount = await quoteBtn.count()
  console.log(`  Found ${quoteCount} "Request a Build Quote" button(s)`)
  if (quoteCount > 0) {
    consoleMsgs.length = 0
    pageErrors.length = 0

    try {
      await quoteBtn.first().click({ timeout: 5000 })
      console.log('  Click executed successfully')
      await page.waitForTimeout(2000)

      // Check if modal appeared
      const modal = page.locator('[role="dialog"], .fixed.inset-0')
      const modalCount = await modal.count()
      console.log(`  Modal visible after click: ${modalCount > 0}`)

      if (pageErrors.length > 0) {
        console.log('  Page errors after click:')
        for (const e of pageErrors) console.log(`    ERROR: ${e}`)
      }
    } catch (e) {
      console.log(`  Click failed: ${e.message}`)
    }
  }

  // Test 4: Tab navigation
  console.log(`\n--- Test: Tab Navigation ---`)
  const tabs = page.locator('button[type="button"]').filter({ hasText: /VERDICT|OPPORTUNITIES|BENCHMARKS|TOOLS|LABOR/i })
  const tabCount = await tabs.count()
  console.log(`  Found ${tabCount} tab button(s)`)

  // Alternative: look for buttons in the sticky report map area
  const reportMapBtns = page.locator('.sticky button[type="button"]')
  const reportMapCount = await reportMapBtns.count()
  console.log(`  Found ${reportMapCount} buttons in sticky report map`)

  if (reportMapCount > 0) {
    consoleMsgs.length = 0
    pageErrors.length = 0

    try {
      await reportMapBtns.first().click({ timeout: 5000 })
      console.log('  Tab click executed successfully')
      await page.waitForTimeout(1000)

      if (pageErrors.length > 0) {
        console.log('  Page errors after tab click:')
        for (const e of pageErrors) console.log(`    ERROR: ${e}`)
      }
    } catch (e) {
      console.log(`  Tab click failed: ${e.message}`)
    }
  }

  // Test 5: Mobile dock
  console.log(`\n--- Test: Mobile Dock ---`)
  // Resize to mobile viewport
  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(1000)

  const dockBtns = page.locator('.md\\:hidden a, .md\\:hidden button')
  const dockCount = await dockBtns.count()
  console.log(`  Found ${dockCount} mobile dock interactive elements`)

  // Check if pointer-events are blocked
  const allButtons = await page.locator('button, a[href]').count()
  console.log(`  Total clickable elements on page: ${allButtons}`)

  // Check for overlay elements blocking clicks
  console.log(`\n--- Checking for overlays blocking clicks ---`)
  const overlayCheck = await page.evaluate(() => {
    const results = []

    // Check what element is at the center of each button
    const buttons = document.querySelectorAll('button, a[href]')
    let blocked = 0
    let total = 0

    for (const btn of Array.from(buttons).slice(0, 20)) {
      const rect = btn.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue

      total++
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const topEl = document.elementFromPoint(centerX, centerY)

      if (topEl && !btn.contains(topEl) && topEl !== btn) {
        blocked++
        results.push({
          button: btn.textContent?.trim().slice(0, 40),
          blockedBy: `<${topEl.tagName.toLowerCase()} class="${topEl.className?.toString().slice(0, 60)}">`,
          zIndex: window.getComputedStyle(topEl).zIndex,
        })
      }
    }

    return { total, blocked, details: results }
  })

  console.log(`  Buttons checked: ${overlayCheck.total}`)
  console.log(`  Buttons BLOCKED by overlay: ${overlayCheck.blocked}`)
  if (overlayCheck.details.length > 0) {
    for (const d of overlayCheck.details) {
      console.log(`    "${d.button}" blocked by ${d.blockedBy} (z-index: ${d.zIndex})`)
    }
  }

  // Reset viewport and check desktop too
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForTimeout(500)

  console.log(`\n--- Checking desktop overlay blocking ---`)
  const desktopOverlay = await page.evaluate(() => {
    const results = []
    const buttons = document.querySelectorAll('button, a[href]')
    let blocked = 0
    let total = 0

    for (const btn of Array.from(buttons).slice(0, 20)) {
      const rect = btn.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue

      total++
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const topEl = document.elementFromPoint(centerX, centerY)

      if (topEl && !btn.contains(topEl) && topEl !== btn) {
        blocked++
        results.push({
          button: btn.textContent?.trim().slice(0, 40),
          buttonRect: { top: Math.round(rect.top), left: Math.round(rect.left) },
          blockedBy: `<${topEl.tagName.toLowerCase()} class="${topEl.className?.toString().slice(0, 80)}">`,
          blockerZIndex: window.getComputedStyle(topEl).zIndex,
          buttonZIndex: window.getComputedStyle(btn).zIndex || window.getComputedStyle(btn.closest('[style*="z-index"], [class*="z-"]') || btn).zIndex,
        })
      }
    }

    return { total, blocked, details: results }
  })

  console.log(`  Buttons checked: ${desktopOverlay.total}`)
  console.log(`  Buttons BLOCKED by overlay: ${desktopOverlay.blocked}`)
  if (desktopOverlay.details.length > 0) {
    for (const d of desktopOverlay.details) {
      console.log(`    "${d.button}" at (${d.buttonRect.top}, ${d.buttonRect.left}) blocked by ${d.blockedBy} (blocker z: ${d.blockerZIndex}, btn z: ${d.buttonZIndex})`)
    }
  }

  // Check if event listeners are attached (hydration check)
  console.log(`\n--- Hydration check ---`)
  const hydrationCheck = await page.evaluate(() => {
    // Check if React has hydrated by looking for __reactFiber
    const body = document.body
    const hasReactFiber = Object.keys(body).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'))

    // Check a button for React event handlers
    const btn = document.querySelector('button')
    const btnHasReact = btn ? Object.keys(btn).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactEvents') || k.startsWith('__reactProps')) : false

    // Check for Next.js hydration
    const nextData = document.getElementById('__NEXT_DATA__')

    return {
      bodyHasReactFiber: hasReactFiber,
      buttonHasReactProps: btnHasReact,
      hasNextData: !!nextData,
      reactKeys: btn ? Object.keys(btn).filter(k => k.startsWith('__react')).join(', ') : 'no button found',
    }
  })
  console.log(`  Body has React fiber: ${hydrationCheck.bodyHasReactFiber}`)
  console.log(`  Button has React props: ${hydrationCheck.buttonHasReactProps}`)
  console.log(`  Has __NEXT_DATA__: ${hydrationCheck.hasNextData}`)
  console.log(`  React keys on button: ${hydrationCheck.reactKeys}`)

  await page.waitForTimeout(2000)
  await browser.close()
  console.log(`\n${name} test complete.\n`)
}

async function main() {
  try {
    await testBrowser(chromium, 'Chromium')
  } catch (e) {
    console.error('Chromium test failed:', e.message)
  }

  try {
    await testBrowser(firefox, 'Firefox')
  } catch (e) {
    console.error('Firefox test failed:', e.message)
  }
}

main()
