import { Actor, log } from 'apify';
import type { ProxyConfigurationOptions } from 'apify';
import { sleep, PuppeteerCrawler } from 'crawlee';

import { testForBlocks } from './check-captchas.js';
import { MAX_ATTACHMENT_SIZE_BYTES } from './consts.js';
import { handleFailedAndThrow, screenshotDOMElement, validateInput, createSlackMessage } from './utils.js';

export interface Input {
    url: string;
    contentSelector: string;
    sendNotificationTo: string;
    screenshotSelector?: string;
    sendNotificationText?: string;
    proxy?: ProxyConfigurationOptions
    navigationTimeout?: number;
    informOnError: string;
    maxRetries?: number;
    retryStrategy?: 'on-block' | 'on-all-errors' | 'never-retry';
}

await Actor.init();

const input = await Actor.getInput() as Input;
validateInput(input);

const {
    url,
    contentSelector,
    sendNotificationTo,
    // if screenshotSelector is not defined, use contentSelector for screenshot
    screenshotSelector = contentSelector,
    sendNotificationText,
    proxy = {
        useApifyProxy: false,
    },
    navigationTimeout = 30000,
    informOnError,
    maxRetries = 5,
    retryStrategy = 'on-block', // 'on-block', 'on-all-errors', 'never-retry'
} = input;

// define name for a key-value store based on task ID or actor ID
// (to be able to have more content checkers under one Apify account)
let storeName = 'content-checker-store-';
storeName += !process.env.APIFY_ACTOR_TASK_ID ? process.env.APIFY_ACT_ID : process.env.APIFY_ACTOR_TASK_ID;

// use or create a named key-value store
const store = await Actor.openKeyValueStore(storeName);

// get data from previous run
const previousScreenshot = await store.getValue('currentScreenshot.png') as Buffer | undefined;
const previousData = await store.getValue('currentData') as string | undefined;

// RESIDENTIAL proxy would be useful, but we don't want everyone to bother us with those
const proxyConfiguration = await Actor.createProxyConfiguration(proxy);

const requestQueue = await Actor.openRequestQueue();
await requestQueue.addRequest({ url });

// We gather these in the crawler and then process them later
let screenshotBuffer: Buffer | undefined;
let fullPageScreenshot: Buffer | undefined;
let content: string | undefined;

const crawler = new PuppeteerCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries: retryStrategy === 'never-retry' ? 0 : maxRetries,
    launchContext: {
        launchOptions: {
            defaultViewport: { width: 1920, height: 1080 },
        },
    },
    preNavigationHooks: [async (_crawlingContext, gotoOptions) => {
        gotoOptions!.waitUntil = 'networkidle2';
        gotoOptions!.timeout = navigationTimeout;
    }],
    requestHandler: async ({ page, response, injectJQuery }) => {
        if (response!.status() === 404 && response!.status()) {
            log.warning(`404 Status - Page not found! Please change the URL`);
            return;
        }
        if (response!.status() >= 400) {
            throw new Error(`Response status: ${response!.status()}. Probably got blocked, trying again!`);
        }
        log.info(`Page loaded with title: ${await page.title()} on URL: ${url}`);
        // wait 5 seconds (if there is some dynamic content)
        // TODO: this should wait for the selector to be available
        log.info('Sleeping 5s ...');
        await sleep(5_000);

        try {
            await injectJQuery();
        } catch (e) {
            // TODO: Rewrite selectors to non-JQuery
            log.warning('Could not inject JQuery so cannot test captcha presence');
        }

        try {
            await testForBlocks(page);
        } catch (e) {
            fullPageScreenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 30 }) as Buffer;
            throw e;
        }

        log.info('Saving screenshot...');

        let errorHappened = false;
        let errorMessage;

        try {
            content = await page.$eval(contentSelector, (el) => el.textContent) as string;
        } catch (e) {
            errorHappened = true;
            errorMessage = `Failed to extract the content, either the content `
                + `selector is wrong or page layout changed. Check the full screenshot.`;
        }

        if (!errorHappened) {
            try {
                screenshotBuffer = await screenshotDOMElement(page, screenshotSelector, 10) as Buffer;
            } catch (e) {
                errorHappened = true;
                errorMessage = `Failed to capture the screenshot, either the screenshot or `
                    + `content selector is wrong or page layout changed. Check the full screenshot.`;
            }
        }

        if (errorHappened) {
            fullPageScreenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 30 }) as Buffer;
            if (retryStrategy === 'on-all-errors') {
                const updatedMessage = `${errorMessage} Will retry...`;
                throw updatedMessage;
            } else {
                log.warning(errorMessage as string);
            }
        }
    },
});

await crawler.run();

// All retries to get screenshot failed
if (!screenshotBuffer) {
    await handleFailedAndThrow({
        type: 'screenshot',
        fullPageScreenshot,
        informOnError,
        sendNotificationTo,
        url,
    });
}

if (!content) {
    await handleFailedAndThrow({
        type: 'screenshot',
        fullPageScreenshot,
        informOnError,
        sendNotificationTo,
        url,
    });
}

// We got the screenshot
await store.setValue('currentScreenshot.png', screenshotBuffer, { contentType: 'image/png' });

log.info(`Previous data: ${previousData}`);
log.info(`Current data: ${content}`);
await store.setValue('currentData', content);

log.info('Done.');

if (previousScreenshot === null) {
    log.warning('Running for the first time, no check');
} else {
    // store data from this run
    await store.setValue('previousScreenshot.png', previousScreenshot, { contentType: 'image/png' });
    await store.setValue('previousData', previousData);

    // check data
    if (previousData === content) {
        log.warning('No change');
    } else {
        log.warning('Content changed');

        const notificationNote = sendNotificationText ? `Note: ${sendNotificationText}\n\n` : '';

        // create Slack message used by Apify slack integration
        const message = createSlackMessage({ url, previousData: previousData!, content: content!, kvStoreId: store.id });
        await Actor.setValue('SLACK_MESSAGE', message);

        // send mail
        log.info('Sending mail...');

        const previousScreenshotBase64 = previousScreenshot!.toString('base64');
        const currentScreenshotBase64 = screenshotBuffer!.toString('base64');

        let text = `URL: ${url}\n\n${notificationNote}Previous data: ${previousData}\n\nCurrent data: ${content}`;
        const attachments = [];
        if (previousScreenshotBase64.length + currentScreenshotBase64.length < MAX_ATTACHMENT_SIZE_BYTES) {
            attachments.push({
                filename: 'previousScreenshot.png',
                data: previousScreenshotBase64,
            });
            attachments.push({
                filename: 'currentScreenshot.png',
                data: currentScreenshotBase64,
            });
        } else {
            log.warning(`Screenshots are bigger than ${MAX_ATTACHMENT_SIZE_BYTES}, not sending them as part of email attachment.`);
            text += `\n\nScreenshots are bigger than ${MAX_ATTACHMENT_SIZE_BYTES}, not sending them as part of email attachment.`;
        }

        await Actor.call('apify/send-mail', {
            to: sendNotificationTo,
            subject: 'Apify content checker - page changed!',
            text,
            attachments,
        });
    }
}
log.info('You can check the output in the named key-value store on the following URLs:');
log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/currentScreenshot.png`);
log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/currentData`);

if (previousScreenshot !== null) {
    log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/previousScreenshot.png`);
    log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/previousData`);
}

await Actor.exit();
