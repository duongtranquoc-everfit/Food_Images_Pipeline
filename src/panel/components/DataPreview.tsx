import { Table, Text, ScrollArea } from "@mantine/core";
import type { ParsedData } from "../../shared/types";

interface DataPreviewProps {
  data: ParsedData;
  urlColumn: number | null;
  nameColumn: number | null;
}

const MAX_PREVIEW_ROWS = 5;

export function DataPreview({ data, urlColumn, nameColumn }: DataPreviewProps) {
  const previewRows = data.rows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <div>
      <Text size="sm" fw={500} mb="xs">
        Preview ({data.rows.length} rows)
      </Text>
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs">
          <Table.Thead>
            <Table.Tr>
              {data.headers.map((h, i) => (
                <Table.Th
                  key={i}
                  style={{
                    backgroundColor:
                      i === urlColumn
                        ? "var(--mantine-color-blue-1)"
                        : i === nameColumn
                          ? "var(--mantine-color-green-1)"
                          : undefined,
                  }}
                >
                  {h}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {previewRows.map((row, ri) => (
              <Table.Tr key={ri}>
                {row.map((cell, ci) => (
                  <Table.Td
                    key={ci}
                    style={{
                      backgroundColor:
                        ci === urlColumn
                          ? "var(--mantine-color-blue-0)"
                          : ci === nameColumn
                            ? "var(--mantine-color-green-0)"
                            : undefined,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </div>
  );
}
