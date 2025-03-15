import type {Probot} from 'probot'

/**
 * Utility function to simulate a GitHub webhook event
 * @param probot Probot instance
 * @param event Event name
 * @param payload Event payload
 */
export async function simulateWebhook(probot: Probot, event: string, payload: Record<string, any>): Promise<void> {
  await probot.receive({
    name: event as any,
    id: 'test-id',
    payload: payload as any,
  })
}
