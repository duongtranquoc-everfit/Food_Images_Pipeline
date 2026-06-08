import { useState } from "react";
import { Container, Tabs, Title } from "@mantine/core";
import { PipelineMode } from "./modes/PipelineMode";
import { LocalMode } from "./modes/LocalMode";
import { RemoveBgTest } from "./components/pipeline/RemoveBgTest";

export function App() {
  const [mode, setMode] = useState<string | null>("pipeline");

  return (
    <Container size="sm" p="md">
      <Title order={3} mb="md">
        Food Image Pipeline
      </Title>

      <Tabs value={mode} onChange={setMode} mb="md">
        <Tabs.List>
          <Tabs.Tab value="pipeline">Google Sheets Pipeline</Tabs.Tab>
          <Tabs.Tab value="local">Local CSV/XLSX</Tabs.Tab>
          <Tabs.Tab value="test-bg">Test BG Removal</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pipeline" pt="md">
          <PipelineMode />
        </Tabs.Panel>

        <Tabs.Panel value="local" pt="md">
          <LocalMode />
        </Tabs.Panel>

        <Tabs.Panel value="test-bg" pt="md">
          <RemoveBgTest />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
