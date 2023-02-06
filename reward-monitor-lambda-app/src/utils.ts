import fetch from 'node-fetch';
import pRetry from 'p-retry';

/**
 * Send a PagerDuty event via PagerDuty Event v2 API
 * @param message message to send to PagerDuty
 * @param severity severity of the event. Can be one of: 'info', 'warning', 'error', 'critical'
 */
export async function sendPagerDutyEvent(message: string, severity: string) {
    // Create a PagerDuty Event API payload
    const payload = {
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        payload: {
            summary: message,
            severity: severity,
            source: 'reward-monitor-lambda-app',
        },
    };

    // Send the payload to PagerDuty Event API
    // Use pRetry to retry the request 3 times
    const response = await pRetry(
        () =>
            fetch('https://events.pagerduty.com/v2/enqueue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }),
        {
            retries: 3,
        },
    ).catch((err) => {
        console.error(`Failed to send PagerDuty event. Error: ${err}`);
        throw err;
    });

    // Log the response from PagerDuty Event API
    console.log(`PagerDuty Event API response: ${response.status} ${response.statusText}`);
}
