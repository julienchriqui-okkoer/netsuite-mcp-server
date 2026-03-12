#!/usr/bin/env node
import "dotenv/config";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001/mcp";

/**
 * Parse SSE response from MCP server
 */
async function parseSseResponse(response) {
  const text = await response.text();
  const lines = text.split("\n");
  const messages = [];
  let currentMessage = "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      currentMessage += line.slice(6);
    } else if (line === "") {
      if (currentMessage) {
        try {
          messages.push(JSON.parse(currentMessage));
        } catch {
          // ignore
        }
        currentMessage = "";
      }
    }
  }

  return messages.length > 0 ? messages[messages.length - 1] : null;
}

/**
 * Call a MCP tool
 */
export async function callTool(toolName, args) {
  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await parseSseResponse(response);
}

/**
 * Test result structure
 */
export class TestResult {
  constructor(name, passed, message = "", actual = null) {
    this.name = name;
    this.passed = passed;
    this.message = message;
    this.actual = actual;
  }
}

/**
 * Test runner for a single tool
 */
export async function runToolTests(toolName, tests) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🧪 Testing: ${toolName}`);
  console.log("=".repeat(70));

  const results = [];

  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `);
    
    try {
      const result = await callTool(toolName, test.args);
      
      // Check if result matches expected
      let passed = false;
      let message = "";
      
      if (test.expectedStatus === "success") {
        passed = result?.result && !result.result.isError;
        message = passed ? "✅" : `❌ Expected success, got error: ${result?.result?.content?.[0]?.text}`;
      } else if (test.expectedStatus === "error") {
        passed = result?.result?.isError === true;
        const errorText = result?.result?.content?.[0]?.text || "";
        
        if (test.expectedMessage) {
          passed = passed && errorText.includes(test.expectedMessage);
          message = passed ? "✅" : `❌ Expected message containing "${test.expectedMessage}", got: ${errorText}`;
        } else {
          message = passed ? "✅" : "❌ Expected error but got success";
        }
      }
      
      console.log(message);
      results.push(new TestResult(test.name, passed, message, result));
      
    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
      results.push(new TestResult(test.name, false, error.message));
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`\n📊 Results: ${passed}/${total} passed (${passRate}%)`);
  
  if (passed === total) {
    console.log("✅ All tests passed!");
  } else {
    console.log(`❌ ${total - passed} test(s) failed`);
  }

  return { toolName, passed, total, passRate: parseFloat(passRate), results };
}

/**
 * Run multiple tool test suites
 */
export async function runAllToolTests(toolTestSuites) {
  console.log("\n🚀 NetSuite MCP - Tool Validation Suite");
  console.log("=".repeat(70));
  console.log(`Server: ${MCP_SERVER_URL}`);
  console.log(`Total Tool Suites: ${toolTestSuites.length}\n`);

  const allResults = [];

  for (const suite of toolTestSuites) {
    const result = await runToolTests(suite.toolName, suite.tests);
    allResults.push(result);
  }

  // Overall summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 OVERALL SUMMARY");
  console.log("=".repeat(70));

  let totalPassed = 0;
  let totalTests = 0;

  allResults.forEach(result => {
    const icon = result.passRate === 100 ? "✅" : "⚠️";
    console.log(`${icon} ${result.toolName}: ${result.passed}/${result.total} (${result.passRate}%)`);
    totalPassed += result.passed;
    totalTests += result.total;
  });

  const overallPassRate = ((totalPassed / totalTests) * 100).toFixed(1);
  console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed (${overallPassRate}%)`);

  return { allResults, totalPassed, totalTests, overallPassRate: parseFloat(overallPassRate) };
}
