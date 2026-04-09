export async function streamMessage(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (e) {
    onError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    onError(`API error ${response.status}: ${body}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta'
        ) {
          onDelta(event.delta.text);
        } else if (event.type === 'message_stop') {
          onDone();
          return;
        } else if (event.type === 'error') {
          onError(event.error?.message ?? 'Unknown streaming error');
          return;
        }
      } catch {
        // skip malformed JSON lines
      }
    }
  }

  onDone();
}
