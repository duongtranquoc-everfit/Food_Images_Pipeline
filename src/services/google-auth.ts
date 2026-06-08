export async function getAuthToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!token) {
        reject(new Error("No token received"));
      } else {
        resolve(token);
      }
    });
  });
}

export async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

export async function signOut(): Promise<void> {
  try {
    const token = await getAuthToken(false);
    await removeCachedToken(token);
  } catch {
    // No cached token, already signed out
  }
}
