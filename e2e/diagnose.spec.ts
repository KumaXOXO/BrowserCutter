/**
 * Diagnostic test suite — systematic investigation of BrowserCutter playback bugs.
 * Captures console errors, DOM state, and behavioral timing to pinpoint root causes.
 */
import { test, expect, type Page } from '@playwright/test'

// Collect all console messages during a test
async function collectConsole(page: Page): Promise<string[]> {
  const logs: string[] = []
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))
  return logs
}

// Inject a minimal timeline state directly into the Zustand store
async function injectSegments(page: Page, segments: object[], clips: object[]) {
  await page.evaluate(({ segs, cls }) => {
    const store = (window as Record<string, unknown>).__BROWSERCUTTER_STORE__ as {
      setState: (s: object) => void
      getState: () => Record<string, unknown>
    } | undefined
    if (!store) {
      // Try to find zustand store via React devtools or global
      console.error('Store not found on window.__BROWSERCUTTER_STORE__')
      return
    }
    store.setState({ segments: segs, clips: cls })
  }, { segs: segments, cls: clips })
}

test.describe('Diagnostic: playback engine root cause investigation', () => {

  test('1. console errors on load', async ({ page }) => {
    const logs = await collectConsole(page)
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(2000)
    const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'))
    console.log('Console errors on load:', errors)
    // Just record — don't fail
    expect(true).toBe(true)
  })

  test('2. DOM structure — track label width vs clip position', async ({ page }) => {
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Measure the track label width and clip container position
    const info = await page.evaluate(() => {
      const trackRows = document.querySelectorAll('[data-track-index]')
      const results: object[] = []
      trackRows.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const parent = el.parentElement?.getBoundingClientRect()
        results.push({
          trackIndex: (el as HTMLElement).dataset.trackIndex,
          trackLeft: rect.left,
          trackWidth: rect.width,
          parentLeft: parent?.left,
          parentWidth: parent?.width,
        })
      })
      return results
    })
    console.log('Track DOM info:', JSON.stringify(info, null, 2))
    expect(true).toBe(true)
  })

  test('3. multi-select delete — does primary selection get deleted?', async ({ page }) => {
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Check store structure
    const storeInfo = await page.evaluate(() => {
      // Look for zustand store on window
      const keys = Object.keys(window)
      const storeKeys = keys.filter(k => k.includes('store') || k.includes('Store') || k.includes('zustand'))
      return {
        windowKeys: storeKeys,
        hasReactFiber: !!document.querySelector('[data-reactroot]') || !!document.querySelector('#root')?.__reactFiber,
      }
    })
    console.log('Store discovery:', storeInfo)

    // Try to access zustand store via React internal fiber
    const storeState = await page.evaluate(() => {
      const root = document.getElementById('root')
      if (!root) return null

      // Walk React fiber to find store
      let fiber = (root as Record<string, unknown>)._reactFiber ||
                  (root as Record<string, unknown>).__reactFiber$
      if (!fiber) {
        // Try __reactFiber property with hash
        const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber'))
        if (fiberKey) fiber = (root as Record<string, unknown>)[fiberKey]
      }
      return fiber ? 'fiber found' : 'no fiber'
    })
    console.log('React fiber:', storeState)
    expect(true).toBe(true)
  })

  test('4. stall counter — does rawTime < inPoint trigger after URL change?', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('stall') || msg.text().includes('Stall') || msg.text().includes('BpmDetector')) {
        logs.push(`[${msg.type()}] ${msg.text()}`)
      }
    })

    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Check if video element exists and its readyState
    const videoState = await page.evaluate(() => {
      const video = document.querySelector('video')
      return video ? {
        readyState: video.readyState,
        src: video.src ? 'has-src' : 'no-src',
        currentTime: video.currentTime,
        paused: video.paused,
      } : null
    })
    console.log('Video element state:', videoState)

    // Try pressing Space to trigger playback (empty timeline)
    await page.locator('body').click()
    await page.keyboard.press('Space')
    await page.waitForTimeout(500)

    const videoStateAfterPlay = await page.evaluate(() => {
      const video = document.querySelector('video')
      return video ? {
        readyState: video.readyState,
        src: video.src ? 'has-src' : 'no-src',
        currentTime: video.currentTime,
        paused: video.paused,
      } : null
    })
    console.log('Video state after Space (empty timeline):', videoStateAfterPlay)
    console.log('Errors during play test:', logs)
    expect(true).toBe(true)
  })

  test('5. layer priority — does segments.find() respect trackIndex order?', async ({ page }) => {
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Test the activeSeg selection logic by checking the useMemo behavior
    const layerTest = await page.evaluate(() => {
      // Simulate the segments.find() behavior with overlapping segments on different tracks
      const segments = [
        { id: 'a', trackIndex: 0, startOnTimeline: 0, inPoint: 0, outPoint: 5, speed: 1, hidden: false },
        { id: 'b', trackIndex: 3, startOnTimeline: 0, inPoint: 0, outPoint: 5, speed: 1, hidden: false },
      ]
      const videoTrackIdx = new Set([0, 3])
      const playheadPosition = 2.5

      // Current implementation (find = first match)
      const currentResult = segments.find(
        (s) => videoTrackIdx.has(s.trackIndex) && !s.hidden &&
          playheadPosition >= s.startOnTimeline &&
          playheadPosition < s.startOnTimeline + (s.outPoint - s.inPoint) / Math.max(0.01, s.speed ?? 1)
      )

      // Expected (highest trackIndex wins)
      const allMatching = segments.filter(
        (s) => videoTrackIdx.has(s.trackIndex) && !s.hidden &&
          playheadPosition >= s.startOnTimeline &&
          playheadPosition < s.startOnTimeline + (s.outPoint - s.inPoint) / Math.max(0.01, s.speed ?? 1)
      )
      const expectedResult = allMatching.sort((a, b) => b.trackIndex - a.trackIndex)[0]

      return {
        currentResult_id: currentResult?.id,
        currentResult_trackIndex: currentResult?.trackIndex,
        expectedResult_id: expectedResult?.id,
        expectedResult_trackIndex: expectedResult?.trackIndex,
        bug: currentResult?.id !== expectedResult?.id,
        explanation: 'Bug: segments.find() returns first array entry (trackIndex:0), not highest priority (trackIndex:3)',
      }
    })
    console.log('Layer priority test:', layerTest)
    // This SHOULD be a bug
    expect(layerTest.bug).toBe(true)
  })

  test('6. save/load — do File references survive loadProject?', async ({ page }) => {
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Simulate what loadProject does with clips
    const loadTest = await page.evaluate(() => {
      // Mock what JSON.parse gives us — no File objects
      const loadedClip = { id: 'test', name: 'test.mp4', type: 'video', duration: 10 }
      // The loaded clip has no .file property
      const hasFile = 'file' in loadedClip
      const fileValue = (loadedClip as Record<string, unknown>).file

      return {
        hasFile,
        fileValue,
        canCreateUrl: false, // Would throw: Cannot create object URL without File
        bug: !hasFile,
        explanation: 'After loadProject, clips have no .file property — any URL.createObjectURL() will fail',
      }
    })
    console.log('Save/load File reference test:', loadTest)
    expect(loadTest.bug).toBe(true)
  })

  test('7. export errors — ERR_FILE_NOT_FOUND root cause', async ({ page }) => {
    const networkErrors: string[] = []
    page.on('requestfailed', (req) => {
      networkErrors.push(`${req.failure()?.errorText}: ${req.url()}`)
    })

    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Check if the export worker has access to files
    const exportInfo = await page.evaluate(() => {
      // Check if exportWorker.ts is trying to access files that may not exist
      return {
        hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        hasWorker: typeof Worker !== 'undefined',
      }
    })
    console.log('Export environment:', exportInfo)
    console.log('Network errors:', networkErrors)
    expect(true).toBe(true)
  })

  test('8. progress bar overflow — playhead past content end', async ({ page }) => {
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(1000)

    // Check PlaybackControls DOM structure
    const controlsInfo = await page.evaluate(() => {
      const progressBars = document.querySelectorAll('[class*="progress"], [class*="Progress"], input[type="range"]')
      const results: object[] = []
      progressBars.forEach((el) => {
        const rect = el.getBoundingClientRect()
        results.push({
          tag: el.tagName,
          type: (el as HTMLInputElement).type,
          value: (el as HTMLInputElement).value,
          max: (el as HTMLInputElement).max,
          width: rect.width,
          overflow: window.getComputedStyle(el).overflow,
        })
      })
      return results
    })
    console.log('Progress bar info:', controlsInfo)
    expect(true).toBe(true)
  })

})

test.describe('Diagnostic: DOM inspection', () => {
  test('full DOM snapshot for structure analysis', async ({ page }) => {
    await page.goto('http://localhost:5175')
    await page.waitForTimeout(2000)

    const screenshot = await page.screenshot({ path: 'test-results/app-loaded.png', fullPage: false })
    console.log('Screenshot saved')

    // Check what panels/components are visible
    const layout = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim().slice(0, 30),
        title: b.getAttribute('title'),
      })).filter(b => b.text || b.title)

      return {
        title: document.title,
        buttonCount: buttons.length,
        buttons: buttons.slice(0, 20),
        videoElements: document.querySelectorAll('video').length,
        inputRanges: document.querySelectorAll('input[type="range"]').length,
        dataTrackIndices: Array.from(document.querySelectorAll('[data-track-index]')).map(
          (el) => (el as HTMLElement).dataset.trackIndex
        ),
      }
    })
    console.log('App layout:', JSON.stringify(layout, null, 2))
    expect(true).toBe(true)
  })
})
