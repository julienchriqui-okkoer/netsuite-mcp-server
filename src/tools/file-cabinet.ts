import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { withRetry } from "../lib/retry.js";
import { parseNetSuiteError } from "../lib/errors.js";
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
      description:
        "Upload a file to NetSuite File Cabinet (e.g. invoice PDF). Returns the file internal ID for use with netsuite_attach_file_to_record. Required: name, fileType (e.g. 'PDF'), content (base64), folder (folder internal ID from NS File Cabinet). Optional: description, isOnline.",
      inputSchema: z
        .object({
          name: z.string().describe("File name e.g. INV-12345-SupplierName.pdf"),
          fileType: z.string().describe("e.g. PDF"),
          content: z.string().describe("Base64-encoded file content"),
          folder: z.string().describe("NetSuite File Cabinet folder internal ID"),
          description: z.string().optional(),
          isOnline: z.boolean().optional(),
        })
        .strict() as any,
    },
    async ({ name, fileType, content, folder, description, isOnline }: any) => {
      try {
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

        const result = await withRetry(
          () => client.post<unknown>("/file", body),
          "upload_file"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(
          `Error uploading file to File Cabinet: ${parseNetSuiteError(error)}`
        );
      }
    }
  );

  server.registerTool(
    "netsuite_attach_file_to_record",
    {
      description:
        "Attach a File Cabinet file to a NetSuite record (e.g. vendor bill). Use after netsuite_upload_file. Required: recordType ('vendorBill', 'vendorCredit', etc.), recordId (internal ID), fileId (from upload).",
      inputSchema: z
        .object({
          recordType: z.string().describe("e.g. vendorBill, vendorCredit"),
          recordId: z.string().describe("Record internal ID"),
          fileId: z.string().describe("File internal ID from netsuite_upload_file"),
        })
        .strict() as any,
    },
    async ({ recordType, recordId, fileId }: any) => {
      try {
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
        const body = { file: { id: fileId } };

        const result = await withRetry(
          () => client.post<unknown>(path, body),
          "attach_file_to_record"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(
          `Error attaching file to record: ${parseNetSuiteError(error)}`
        );
      }
    }
  );
}
