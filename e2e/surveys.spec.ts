import { expect, test } from '@playwright/test';
import {
  assertNoHorizontalOverflow,
  attachZeroErrorGuards,
  setupCoachPin,
} from './helpers.ts';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe('Noova-Surveys E2E Suite', () => {
  test('1. Default Estonian (et) startup and live switching across et/en/ru/es with zero broken keys', async ({
    page,
  }) => {
    const guard = await attachZeroErrorGuards(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/#/coach');

    // Default language must be Estonian (et)
    await expect(page.locator('html')).toHaveAttribute('lang', 'et');
    await expect(page.locator('h1.page-title')).toHaveText('Määra 4-kohaline PIN');
    await assertNoHorizontalOverflow(page, 'PIN gate (et)');

    const checks: { code: 'EN' | 'RU' | 'ES' | 'ET'; lang: string; heading: string; cta: string }[] =
      [
        {
          code: 'EN',
          lang: 'en',
          heading: 'Set 4-digit PIN',
          cta: 'Save PIN & open',
        },
        {
          code: 'RU',
          lang: 'ru',
          heading: 'Задайте 4-значный PIN',
          cta: 'Сохранить PIN и открыть',
        },
        {
          code: 'ES',
          lang: 'es',
          heading: 'Configura tu PIN de 4 dígitos',
          cta: 'Guardar PIN y entrar',
        },
        {
          code: 'ET',
          lang: 'et',
          heading: 'Määra 4-kohaline PIN',
          cta: 'Salvesta PIN ja ava',
        },
      ];

    for (const item of checks) {
      await page.locator('.lang-switcher button', { hasText: item.code }).click();
      await expect(page.locator('html')).toHaveAttribute('lang', item.lang);
      await expect(page.locator('h1.page-title')).toHaveText(item.heading);
      await expect(page.locator('form.pin-card button[type="submit"]')).toHaveText(item.cta);

      // Verify no raw dotted translation keys leaked into visible text
      const visibleText = await page.locator('body').innerText();
      expect(visibleText).not.toMatch(/\b(pin|nav|dashboard|editor|player|results|settings)\.[a-zA-Z]+\b/);
    }

    guard.assertClean();
  });

  test('2. Coach PIN protection, survey creation from template, and Share/QR/Viber modal', async ({
    page,
  }) => {
    const guard = await attachZeroErrorGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/#/coach');

    // Switch to Spanish for readability & verify PIN setup
    await page.locator('.lang-switcher button', { hasText: 'ES' }).click();
    await setupCoachPin(page, '1234');

    // Lock coach panel and test wrong PIN -> must block and display error
    await page.locator('.coach-topbar button[aria-label="Bloquear"]').click();
    await expect(page.locator('h1.page-title')).toHaveText('Panel del entrenador');

    await page.locator('#coach-pin').fill('9999');
    await page.locator('form.pin-card button[type="submit"]').click();
    await expect(page.locator('.field-error')).toHaveText('PIN incorrecto.');
    await expect(page.locator('.bottom-dock')).toHaveCount(0);

    // Unlock with correct PIN
    await page.locator('#coach-pin').fill('1234');
    await page.locator('form.pin-card button[type="submit"]').click();
    await expect(page.locator('.bottom-dock')).toBeVisible();

    // Create a survey from the first starter template ("Treeningu tagasiside")
    await page.locator('.workbench-pane button', { hasText: 'Usar plantilla' }).first().click();
    await expect(page).toHaveURL(/#\/coach\/edit\//);
    await expect(page.locator('#srv-title')).toBeVisible();

    // Activate & share -> verify direct link, QR image, and Viber share link
    await page.locator('.editor-sticky-footer button.btn-primary').click();
    await expect(page.locator('.modal-panel')).toBeVisible();

    const shareUrl = await page.locator('#share-url').inputValue();
    expect(shareUrl).toContain('#/s/');

    const qrImg = page.locator('.qr-box img');
    await expect(qrImg).toBeVisible();
    await expect(qrImg).toHaveAttribute('src', /^data:image\/png;base64,/);

    const viberLink = page.locator('a.btn-viber');
    await expect(viberLink).toBeVisible();
    await expect(viberLink).toHaveAttribute('href', /^viber:\/\/forward\?text=/);

    guard.assertClean();
  });

  test('3 & 5. Full mobile player flow (all question types + BodyMap SVG sync) and Live Coach Results', async ({
    page,
  }) => {
    const guard = await attachZeroErrorGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/#/coach');
    await page.locator('.lang-switcher button', { hasText: 'ES' }).click();
    await setupCoachPin(page, '1234');

    // Create a custom survey containing ALL 6 question types:
    // 1. Emoji 1-5, 2. Scale 1-10, 3. Slider, 4. Choice, 5. Body map, 6. Open text
    await page.locator('button', { hasText: '+ Nueva encuesta' }).first().click();
    await expect(page).toHaveURL(/#\/coach\/edit\/new/);

    await page.locator('#srv-title').fill('Control completo E2E');

    const questionSpecs: { typeText: string; prompt: string; isChoice?: boolean }[] = [
      { typeText: 'Emojis 1–5', prompt: '¿Cómo te sientes hoy?' },
      { typeText: 'Escala 1–10', prompt: '¿Qué intensidad tuvo el entreno?' },
      { typeText: 'Slider', prompt: 'Nivel de energía al terminar' },
      { typeText: 'Opción múltiple', prompt: '¿Dormiste bien anoche?', isChoice: true },
      { typeText: 'Mapa corporal', prompt: '¿Dónde notas alguna molestia?' },
      { typeText: 'Texto', prompt: 'Comentario final para el míster' },
    ];

    for (let i = 0; i < questionSpecs.length; i += 1) {
      if (i > 0) {
        await page.locator('button.editor-add-btn').click();
      }
      const card = page.locator('.carousel-card').nth(i);
      await card.scrollIntoViewIfNeeded();
      await card.locator('.type-pill-btn', { hasText: questionSpecs[i].typeText }).click();
      await card.locator('.inline-question-input').fill(questionSpecs[i].prompt);
    }

    // Activate & grab share URL
    await page.locator('.editor-sticky-footer button.btn-primary').click();
    await expect(page.locator('.modal-panel')).toBeVisible();
    const shareUrl = await page.locator('#share-url').inputValue();
    const surveyId = shareUrl.split('#/s/')[1];
    expect(surveyId).toBeTruthy();

    // Switch to real mobile viewport (390x844) for player Stories experience
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/#/s/${surveyId}`);

    // Welcome screen: verify privacy notice, zero horizontal overflow, and name validation
    await expect(page.locator('.privacy-banner')).toContainText(
      'Tus respuestas solo las verá el entrenador, nunca los demás jugadores.'
    );
    await assertNoHorizontalOverflow(page, 'Player welcome');

    const startBtn = page.locator('.story-cta-btn');
    await expect(startBtn).toBeDisabled();

    await page.locator('#player-real-name').fill('Lucas Gómez');
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Q1: Emoji 1-5 — manual Continue must stay disabled until answered
    const continueBtn = page.locator('.story-cta-btn');
    await expect(continueBtn).toBeDisabled();
    await assertNoHorizontalOverflow(page, 'Player Q1 emoji5');
    await page.locator('.emoji5-btn').nth(3).click(); // 4 / 5
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Q2: Scale 1-10 (SemicircularDial)
    await expect(continueBtn).toBeDisabled();
    await assertNoHorizontalOverflow(page, 'Player Q2 rating10');
    await page.locator('.dial-step-btn[aria-label="+1"]').click();
    await page.locator('.dial-step-btn[aria-label="+1"]').click();
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Q3: Slider (SemicircularDial)
    await expect(continueBtn).toBeDisabled();
    await assertNoHorizontalOverflow(page, 'Player Q3 slider');
    await page.locator('.dial-step-btn[aria-label="+1"]').click();
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Q4: Choice (Yes / No)
    await expect(continueBtn).toBeDisabled();
    await assertNoHorizontalOverflow(page, 'Player Q4 choice');
    await page.locator('.choice-btn').first().click();
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Q5: Interactive Dual BodyMap SVG (select knee_r, shoulder_l, ankle_r & verify front/back sync)
    await expect(continueBtn).toBeDisabled();
    await assertNoHorizontalOverflow(page, 'Player Q5 bodymap');

    for (const zone of ['knee_r', 'shoulder_l', 'ankle_r'] as const) {
      const zonePaths = page.locator(`.bodymap-svg path.body-zone[data-zone="${zone}"]`);
      await expect(zonePaths).toHaveCount(2); // present on both front and back views
      await zonePaths.first().click();
      // Both front and back SVG paths must reflect selected state simultaneously
      await expect(zonePaths.nth(0)).toHaveClass(/\bselected\b/);
      await expect(zonePaths.nth(1)).toHaveClass(/\bselected\b/);
    }

    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Q6: Open text (last screen shows privacy reminder & Submit)
    await expect(continueBtn).toBeDisabled();
    await assertNoHorizontalOverflow(page, 'Player Q6 text');
    await expect(page.locator('.privacy-subtle')).toContainText(
      'Tus respuestas solo las verá el entrenador'
    );
    await page.locator('.story-card input.input, .story-card textarea.textarea').fill('Gran sesión de tiros');
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Final confirmation screen
    await expect(page.locator('.done-check-badge')).toBeVisible();
    await expect(page.locator('h1.player-question-title')).toContainText('Lucas Gómez');
    await assertNoHorizontalOverflow(page, 'Player done screen');

    // Return to Coach Results view (desktop + mobile check)
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`/#/coach/results/${surveyId}`);
    await expect(page.locator('.bento-ring-card')).toBeVisible();
    await expect(page.locator('.bento-ring-card')).toContainText('1');

    // Verify independent numeric KPI cards rendered
    await expect(page.locator('.kpi-mini-card')).toHaveCount(3);

    // Verify histogram bar click reveals respondent name
    const filledBar = page.locator('.histogram-cols .hist-col-btn').filter({ hasText: '1' }).first();
    await filledBar.click();
    await expect(page.locator('.voter-pill', { hasText: 'Lucas Gómez' }).first()).toBeVisible();

    // Verify BodyMap heatmap reflects reported zones and clicking highlights with .inspected
    const heatKnee = page.locator('.heatmap-layout .bodymap-svg path.body-zone[data-zone="knee_r"]');
    await expect(heatKnee.first()).toHaveClass(/\bheat-[1-4]\b/);
    await heatKnee.first().click();
    await expect(heatKnee.first()).toHaveClass(/\binspected\b/);
    await expect(heatKnee.nth(1)).toHaveClass(/\binspected\b/);

    // Verify Individual responses tab lists Lucas Gómez and his text answer
    await page.locator('.tabs .tab-btn').nth(1).click();
    await page.locator('button', { hasText: 'Lucas Gómez' }).click();
    await expect(page.locator('body')).toContainText('Gran sesión de tiros');

    // Also verify Results page has no horizontal overflow on mobile
    await page.setViewportSize(MOBILE_VIEWPORT);
    await assertNoHorizontalOverflow(page, 'Coach Results mobile');

    guard.assertClean();
  });

  test('4. Shared-device mode resets cleanly for the next player without duplicate blocking', async ({
    page,
  }) => {
    const guard = await attachZeroErrorGuards(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/#/coach');
    await page.locator('.lang-switcher button', { hasText: 'ES' }).click();
    await setupCoachPin(page, '1234');

    // Create a quick 1-question survey with Shared-device mode enabled
    await page.locator('button', { hasText: '+ Nueva encuesta' }).first().click();
    await page.locator('#srv-title').fill('Encuesta móvil compartido');

    // Expand Advanced options and toggle "allowMultipleFromSameDevice"
    await page.locator('.accordion-trigger').click();
    await page.locator('.accordion-body .toggle-row input[type="checkbox"]').check();

    // Fill first question (Emoji 1-5)
    await page.locator('.carousel-card .inline-question-input').first().fill('¿Qué tal el partido?');

    // Activate & get public survey URL
    await page.locator('.editor-sticky-footer button.btn-primary').click();
    const shareUrl = await page.locator('#share-url').inputValue();
    const surveyId = shareUrl.split('#/s/')[1];

    // Mobile player flow — Player 1
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/#/s/${surveyId}`);
    await assertNoHorizontalOverflow(page, 'Shared device P1 welcome');

    await page.locator('#player-real-name').fill('Jugador Uno');
    await page.locator('.story-cta-btn').click();
    await page.locator('.emoji5-btn').nth(4).click();
    await page.locator('.story-cta-btn').click();

    await expect(page.locator('h1.player-question-title')).toContainText('Jugador Uno');

    // Click "Answer again (next player)" and verify completely clean reset
    const againBtn = page.locator('.story-cta-btn');
    await expect(againBtn).toBeVisible();
    await againBtn.click();

    await expect(page.locator('#player-real-name')).toHaveValue('');
    await expect(page.locator('.story-cta-btn')).toBeDisabled();

    // Player 2 submits without being blocked and without carrying over Player 1's answer
    await page.locator('#player-real-name').fill('Jugador Dos');
    await page.locator('.story-cta-btn').click();

    // Continue/Submit button must be disabled again (answer was cleared)
    await expect(page.locator('.story-cta-btn')).toBeDisabled();
    await page.locator('.emoji5-btn').nth(1).click();
    await page.locator('.story-cta-btn').click();

    await expect(page.locator('h1.player-question-title')).toContainText('Jugador Dos');

    // Confirm both responses were stored in Results
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`/#/coach/results/${surveyId}`);
    await expect(page.locator('.bento-ring-card')).toContainText('2');

    guard.assertClean();
  });
});
