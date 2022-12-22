import { log, Actor } from 'apify';

import type { Page } from 'puppeteer';

import { MAX_ATTACHMENT_SIZE_BYTES } from './consts.js';
import type { Input } from './main.js';

const sendMailOnError = async (sendNotificationTo: string, url: string, fullPageScreenshot: Buffer | undefined, errorMessage: string) => {
    log.info('Sending mail with the info about Error on the page...');
    await Actor.call('apify/send-mail', {
        to: sendNotificationTo,
        subject: 'Apify content checker - Error!',
        text: `URL: ${url}\n ${errorMessage}`,
        attachments: fullPageScreenshot && fullPageScreenshot.toString('base64').length < MAX_ATTACHMENT_SIZE_BYTES
            ? [
                {
                    filename: 'fullpageScreenshot.png',
                    data: fullPageScreenshot.toString('base64'),
                },
            ]
            : undefined,

    });
};

export const screenshotDOMElement = async (page: Page, selector: string, padding = 0) => {
    const rect = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        const { x, y, width, height } = element!.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element!.id };
    }, selector);

    return page.screenshot({
        clip: {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        },
        type: 'jpeg',
        quality: 30,
    });
};

export const validateInput = (input: Input) => {
    // check inputs
    if (!input || !input.url || !input.contentSelector || !input.sendNotificationTo) {
        throw new Error('Invalid input, must be a JSON object with the '
            + '"url", "contentSelector", "screenshotSelector" and "sendNotificationTo" field!');
    }
};

interface HandleFailedAndThrowOptions {
    type: string;
    fullPageScreenshot?: Buffer;
    informOnError: string;
    sendNotificationTo: string;
    url: string;
}

export const handleFailedAndThrow = async ({ type, fullPageScreenshot, informOnError, sendNotificationTo, url }: HandleFailedAndThrowOptions) => {
    let errorMessage = `Cannot get ${type} (${type} selector is probably wrong).`;
    if (fullPageScreenshot) {
        await Actor.setValue('fullpageScreenshot.png', fullPageScreenshot, { contentType: 'image/png' });
        // SENDING EMAIL WITH THE INFO ABOUT ERROR AND FULL PAGE SCREENSHOT
        const storeId = Actor.getEnv().defaultKeyValueStoreId;
        errorMessage = `${errorMessage}`
            + `\nMade screenshot of the full page instead: `
            + `\nhttps://api.apify.com/v2/key-value-stores/${storeId}/records/fullpageScreenshot.png`;
    }
    if (informOnError === 'true') {
        await sendMailOnError(sendNotificationTo, url, fullPageScreenshot, errorMessage);
    }

    // We use simple string throw deliberately so users are not bothered with stack traces
    throw errorMessage;
};

interface CreateSlackMessageOptions {
    url: string;
    previousData: string;
    content: string;
    kvStoreId: string;
}

export const createSlackMessage = ({ url, previousData, content, kvStoreId }: CreateSlackMessageOptions) => {
    return {
        text: '',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:loudspeaker: Apify content checker :loudspeaker:\n Page ${url} changed!`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Previous data:* ${previousData}\n\n*Current data:* ${content}`,
                },
            },
            {
                type: 'image',
                title: {
                    type: 'plain_text',
                    text: 'image1',
                    emoji: true,
                },
                image_url: `https://api.apify.com/v2/key-value-stores/${kvStoreId}/records/currentScreenshot.png`,
                alt_text: 'image1',
            },
            {
                type: 'divider',
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: ':question: The message was generated using Apify app. '
                            + 'You can unsubscribe these messages from the channel with "/apify list subscribe" command.',
                    },
                ],
            },
        ],
    };
};
