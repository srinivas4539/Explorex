import { GoogleGenAI } from "@google/genai";

export const generateLogoConcept = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: "A professional, modern, and scalable logo for a travel brand named 'ExploreX'. The logo should incorporate elements of green tourism (a leaf or sprout), cultural heritage (a subtle temple silhouette or traditional pattern), and safety (a shield or guardian symbol). The color palette should be emerald green, gold, and white. Minimalist, clean lines, vector style, suitable for a mobile app icon and website header. High contrast, white background.",
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
