## 2024-03-26
*Features*
- Push info item to the dataset on changed content. This can be used to trigger monitoring notifications.
- `sendNotificationTo` email is now optional because you can use monitoring to send notifications.

## 2021-06-09
*Features*
- Added "smart" retrying logic when being blocked
- Added `maxRetries` and `retryStrategy` to the input

## 2021-06-04
*Fixes*
- implemented logic about sending mail with the info about error (and screenshot of the full page) in case of issues with selectors during the actor run;
- Implemented snapshot of the whole page if content selector is not found (issue #18).
- Added option to switch on/off notifying on error via mail;

## 2021-06-03
*Fixes*
- Updated SDK to 1.2.0;
- Implemented snapshot of the whole page if screenshot selector is not found +  improved the error message with a link to the snapshot (issue #11).
