import { Button, Group, Text } from "@mantine/core";
import { getAuthToken, signOut } from "../../../services/google-auth";
import { usePipelineStore } from "../../store/pipeline-store";

export function GoogleSignIn() {
  const authenticated = usePipelineStore((s) => s.authenticated);
  const setAuthenticated = usePipelineStore((s) => s.setAuthenticated);

  const handleSignIn = async () => {
    try {
      await getAuthToken(true);
      setAuthenticated(true);
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthenticated(false);
  };

  if (authenticated) {
    return (
      <Group>
        <Text size="sm" c="green">Signed in</Text>
        <Button size="xs" variant="subtle" onClick={handleSignOut}>
          Sign out
        </Button>
      </Group>
    );
  }

  return (
    <Button onClick={handleSignIn}>
      Sign in with Google
    </Button>
  );
}
