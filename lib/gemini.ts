export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GenerateJsonResult = {
  data: any;
  model: string;
};

const DEFAULT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.7-flash",
];

function modelsToTry() {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (!configured) return DEFAULT_MODELS;
  return [configured, ...DEFAULT_MODELS.filter((model) => model !== configured)];
}

export async function generateGeminiJson(parts: GeminiPart[]): Promise<GenerateJsonResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  for (const model of modelsToTry()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.35,
            },
          }),
          signal: controller.signal,
          cache: "no-store",
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn(
          `Gemini ${model} indisponível; tentando alternativa.`,
          JSON.stringify({ status: response.status, error: payload?.error?.status, message: payload?.error?.message })
        );
        continue;
      }

      const raw = payload?.candidates?.[0]?.content?.parts?.find((part: any) => typeof part?.text === "string")?.text ?? "";
      if (!raw) continue;

      try {
        const data = JSON.parse(String(raw).replace(/```json|```/g, "").trim());
        return { data, model };
      } catch (error) {
        console.warn(`Resposta JSON inválida do Gemini ${model}.`, error);
      }
    } catch (error) {
      console.warn(`Falha ao chamar Gemini ${model}; tentando alternativa.`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
