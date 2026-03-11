import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";

export function registerFileCabinetTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_upload_file",
    {
      description: "Upload a file to NetSuite File Cabinet. Returns the file internal ID.",
    },
    async ({ name, fileType, content, folder, description, isOnline }: any) => {
      try {
        const body: any = {
          name,
          fileType,
          content,
          folder: { id: folder },
        };

        if (description) body.description = description;
        if (typeof isOnline === "boolean") body.isOnline = isOnline;

        const result = await client.post<unknown>("/file", body);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error uploading file.";
        return {
          content: [
            {
              type: "text",
              text: `Error uploading file to NetSuite: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_attach_file_to_record",
    {
      description: "Attach a file (from File Cabinet) to a NetSuite record (vendor bill, expense report, vendor credit).",
    },
    async ({ recordType, recordId, fileId }: any) => {
      try {
        if (!recordType || !recordId || !fileId) {
          return {
            content: [
              {
                type: "text",
                text: "Error: recordType, recordId, and fileId are required.",
              },
            ],
            isError: true,
          };
        }

        const path = `/${recordType}/${recordId}/files`;
        const body = {
          file: { id: fileId },
        };

        const result = await client.post<unknown>(path, body);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error attaching file.";
        return {
          content: [
            {
              type: "text",
              text: `Error attaching file to NetSuite record: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
