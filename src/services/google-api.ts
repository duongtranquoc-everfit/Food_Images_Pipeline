import { getAuthToken, removeCachedToken } from "./google-auth";

export async function googleFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = await getAuthToken();

  const doFetch = async (t: string) => {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${t}`);
    return fetch(url, { ...options, headers });
  };

  let response = await doFetch(token);

  // Retry on 401 with fresh token
  if (response.status === 401) {
    await removeCachedToken(token);
    token = await getAuthToken();
    response = await doFetch(token);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google API error ${response.status}: ${text}`);
  }

  return response;
}
