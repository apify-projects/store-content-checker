# Content Checker

## What does Content Checker do?

This actor lets you monitor specific content on any web page and sends an email notification with before and after screenshots whenever that content changes. You can use this to create your own watchdog for prices, product updates, sales, competitors, or to track changes in any content that you want to keep an eye on.

Technically, it extracts text by selector and compares it with the previous run. If there is any change, it runs another actor to send an email notification, save, and send screenshots.

## How to use Content Checker
Watch our [video guide](https://www.youtube.com/watch?v=89k9JzWfS_U) or read our [blog post](https://blog.apify.com/how-to-set-up-a-content-change-watchdog-for-any-website-in-5-minutes-460843b12271) for a step-by-step tutorial to get you started.

[![Watch the video](https://img.youtube.com/vi/89k9JzWfS_U/0.jpg)](https://youtu.be/89k9JzWfS_U)

## Input

The actor needs a URL, content selector, and an email address. A screenshot selector can also be defined or, if not defined, the content selector is used for the screenshot. 

For detailed input description please see the [Input page](https://apify.com/jakubbalada/content-checker/input-schema).

## Output

Once the actor finishes, it will update content and screenshot in a named key-value store associated with the actor/task.

If the content changed, another actor is called to send an email notification.

Here's an example of an email notification with previous data, changed data, and two screenshots:
<img src="https://apify-uploads-prod.s3.amazonaws.com/XMuiubsWzSFbcQEhs-Screen_Shot_2019-01-02_at_23.23.51.png" style="max-width: 100%" />

## Integrations and Content Checker

Content Checker can be connected with almost any cloud service or web app thanks to [integrations on the Apify platform]([https://apify.com/integrations](https://apify.com/integrations)). Integrate with Make, Zapier, Slack, Airbyte, GitHub, Google Sheets, Google Drive, and more. Or you can use webhooks to carry out an action whenever an event occurs, e.g. get a notification whenever Content Checker successfully finishes a run.

## Using Content Checker with the Apify API

The Apify API gives you programmatic access to the Apify platform. The API is organized around RESTful HTTP endpoints that enable you to manage, schedule, and run Apify actors. The API also lets you access any datasets, monitor actor performance, fetch results, create and update versions, and more. To access the API using Node.js, use the apify-client NPM package. To access the API using Python, use the apify-client PyPI package.Check out the [Apify API reference]([https://docs.apify.com/api/v2](https://docs.apify.com/api/v2)) docs for full details or click on the [API tab](https://apify.com/jakubbalada/content-checker/api) for code examples.

## Not your cup of tea? Build your own scraper.

Content checker doesn’t exactly do what you need? You can always build your own! We have various [scraper templates](https://apify.com/templates) in Python, JavaScript, and TypeScript to get you started. Alternatively, you can write it from scratch using our [open-source library Crawlee](https://crawlee.dev/). You can keep the scraper to yourself or make it public by adding it to Apify Store (and [find users](https://blog.apify.com/make-regular-passive-income-developing-web-automation-actors-b0392278d085/) for it). 

Or let us know if you need a [custom scraping solution](https://apify.com/custom-solutions).

## Your feedback

We’re always working on improving the performance of our Actors. So if you’ve got any technical feedback for Facebook Hashtag Scraper or simply found a bug, please create an issue on the Actor’s [Issues tab](https://console.apify.com/actors/ctMjXHGFjGPwBzCrq/issues) in Apify Console.
## Changelog

Keep up with recent fixes and new features by reading the [Changelog](https://github.com/apify/actor-content-checker/blob/master/CHANGELOG.md). 
