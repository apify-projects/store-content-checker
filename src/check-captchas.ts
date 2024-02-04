/* global $ */
import { log } from 'apify';
import type { Page } from 'puppeteer';

const distilCaptcha = async (page: Page) => {
    return page.evaluate(() => {
        return $('#distilCaptchaForm').length > 0 || $('[action*="distil_r_captcha.html"]').length > 0;
    });
};

const accessDenied = async (page: Page) => {
    return page.evaluate(() => {
        return $('title').text().includes('Access Denied');
    });
};

const recaptcha = async (page: Page) => {
    const { blocked, isCaptchaDisabled } = await page.evaluate(() => {
        const backGroundCaptchaEl = $('iframe[src*="/recaptcha/"]');
        const isCaptchaDisabledInEval = backGroundCaptchaEl.attr('style')
            && backGroundCaptchaEl.attr('style')!.includes('display: none');
        // const isCaptchaActive = backGroundCaptchaEl.length > 0 && !isCaptchaDisabledInEval;
        return {
            blocked: $('#recaptcha').length > 0,
            // blocked: $('#recaptcha').length > 0 || isCaptchaActive,
            isCaptchaDisabled: isCaptchaDisabledInEval,
        };
    });

    if (isCaptchaDisabled) {
        log.warning(`Captcha is on the page but it is not activated`);
    }

    return blocked;
};

export const testForBlocks = async (page: Page) => {
    if (await accessDenied(page)) {
        throw new Error('[BLOCKED]: Got access denied');
    }
    if (await distilCaptcha(page)) {
        throw new Error('[BLOCKED]: Found Distil Captcha');
    }
    if (await recaptcha(page)) {
        throw new Error('[BLOCKED]: Found Google ReCaptcha');
    }
};
