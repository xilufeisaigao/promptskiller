import { describe, expect, it } from "vitest";

import { extractChatCompletionsOutputText, extractOpenAIOutputText } from "./extract";

describe("extractOpenAIOutputText", () => {
  it("extracts output_text chunks from a Responses API JSON", () => {
    const json = {
      id: "resp_123",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [
            { type: "output_text", text: "{\"ok\":true}" },
            { type: "output_text", text: "{\"more\":true}" },
          ],
        },
      ],
    };

    expect(extractOpenAIOutputText(json)).toBe("{\"ok\":true}\n{\"more\":true}");
  });

  it("returns empty string for unexpected shapes", () => {
    expect(extractOpenAIOutputText(null)).toBe("");
    expect(extractOpenAIOutputText({})).toBe("");
  });
});

describe("extractChatCompletionsOutputText", () => {
  it("extracts message.content from chat completions JSON", () => {
    const json = {
      choices: [
        {
          message: {
            content: "{\"ok\":true}",
          },
        },
      ],
    };

    expect(extractChatCompletionsOutputText(json)).toBe("{\"ok\":true}");
  });

  it("supports array content chunks", () => {
    const json = {
      choices: [
        {
          message: {
            content: [{ type: "text", text: "{\"ok\":true}" }],
          },
        },
      ],
    };

    expect(extractChatCompletionsOutputText(json)).toBe("{\"ok\":true}");
  });
});
