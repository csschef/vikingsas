const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]); // a Set has a fast has() check
const MAX_ATTEMPTS = 3;

type FetchJsonOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export async function fetchJson(
  url: string,
  { headers = {}, timeoutMs = 5000 }: FetchJsonOptions = {},
): Promise<unknown> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs), // Timeout when response is to slow
      });
    } catch (err) {
      // fetch throws when we get no response at all. Say what happened, in plain words.
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new Error(`No response from ${url} within ${timeoutMs} ms (timeout)`);
      }
      throw new Error(`Could not reach ${url} (network error)`, { cause: err });
    }

    if (response.ok) {
      return response.json();
    }
    // Not worth retrying, or out of attempts: throw
    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw new Error(`${url} responded with status ${response.status} ${response.statusText}`);
    }
    // Otherwise: log, wait one second, and let the loop make the next attempt
    console.warn(`Status ${response.status}, attempt ${attempt} of ${MAX_ATTEMPTS}. Trying again in 1 second.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
