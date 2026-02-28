type OpenAIResponseJson = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export function extractOpenAIOutputText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const j = json as OpenAIResponseJson;
  const output = Array.isArray(j.output) ? j.output : [];

  const chunks: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (c?.type === "output_text" && typeof c.text === "string") {
        chunks.push(c.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

type ChatCompletionsJson = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

export function extractChatCompletionsOutputText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const j = json as ChatCompletionsJson;
  const first = Array.isArray(j.choices) ? j.choices[0] : undefined;
  const content = first?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const chunks = content
      .map((item) => (item?.type === "text" && typeof item.text === "string" ? item.text : ""))
      .filter(Boolean);
    return chunks.join("\n").trim();
  }

  return "";
}
