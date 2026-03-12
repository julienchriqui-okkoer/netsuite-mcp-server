import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerFileCabinetTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_list_files",
    {
      description: "List files from NetSuite File Cabinet with optional pagination. Optional parameters: limit (number), offset (number)",
    },
    async ({ limit, offset }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const result = await client.get<unknown>("/file", pagination);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing files from File Cabinet: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_upload_file",
    {
      description: "Upload a file to NetSuite File Cabinet. Returns the file internal ID. Required parameters: name (string), fileType (string), content (base64 string), folder (string, folder ID). Optional: description, isOnline (boolean)",
    },
    async ({ name, fileType, content, folder, description, isOnline }: any) => {
      try {
        // Validate required parameters
        if (!name || typeof name !== "string") {
          return errorResponse("Missing required parameter: name (string)");
        }
        if (!fileType || typeof fileType !== "string") {
          return errorResponse("Missing required parameter: fileType (string)");
        }
        if (!content || typeof content !== "string") {
          return errorResponse("Missing required parameter: content (base64 string)");
        }
        if (!folder || typeof folder !== "string") {
          return errorResponse("Missing required parameter: folder (string, folder ID)");
        }

        const body: any = {
          name,
          fileType,
          content,
          folder: { id: folder },
        };

        if (description) body.description = description;
        if (typeof isOnline === "boolean") body.isOnline = isOnline;

        const result = await client.post<unknown>("/file", body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error uploading file to File Cabinet: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_attach_file_to_record",
    {
      description: "Attach a file (from File Cabinet) to a NetSuite record (vendor bill, expense report, vendor credit). Required parameters: recordType (string, e.g. 'vendorBill'), recordId (string), fileId (string)",
    },
    async ({ recordType, recordId, fileId }: any) => {
      try {
        // Validate required parameters
        if (!recordType || typeof recordType !== "string") {
          return errorResponse("Missing required parameter: recordType (string, e.g. 'vendorBill')");
        }
        if (!recordId || typeof recordId !== "string") {
          return errorResponse("Missing required parameter: recordId (string)");
        }
        if (!fileId || typeof fileId !== "string") {
          return errorResponse("Missing required parameter: fileId (string)");
        }

        const path = `/${recordType}/${recordId}/files`;
        const body = {
          file: { id: fileId },
        };

        const result = await client.post<unknown>(path, body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error attaching file to record: ${error.message}`);
      }
    }
  );
}
