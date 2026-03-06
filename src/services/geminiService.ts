import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = 'audio/wav') => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType,
              },
            },
            {
              text: "Transcribe this audio accurately.",
            },
          ],
        },
      ],
    });
    return response.text;
  } catch (error) {
    console.error("Transcription Error:", error);
    return null;
  }
};

export const getNearbyPlaces = async (query: string, lat?: number, lng?: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: lat && lng ? { latitude: lat, longitude: lng } : undefined,
          },
        },
      },
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsLinks = groundingChunks?.filter(chunk => chunk.maps).map(chunk => ({
      title: chunk.maps?.title,
      uri: chunk.maps?.uri
    })) || [];

    return {
      text: response.text,
      links: mapsLinks
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "I couldn't find any nearby places right now.", links: [] };
  }
};

export const connectLive = (callbacks: {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror?: (error: any) => void;
  onclose?: () => void;
}) => {
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      systemInstruction: "You are Rukku, a helpful travel assistant. You are in a live voice conversation. Keep your responses concise and friendly.",
    },
  });
};

const RUKKU_SYSTEM_INSTRUCTION = `You are Rukku, the Super-Intelligent AI Agent for ExploreX, a futuristic, green-sustainable travel ecosystem in India.

Your Identity:
- You are adaptive, witty, and supportive. You speak English, Hindi, Telugu, Vietnamese, Japanese, and Korean fluently.
- You are an Agentic AI: You don't just answer; you plan and simulate executions.

Your Core Directives:
- The 4 Pillars: Categorize every destination into: Tradition, Enjoyment, Devotional, or History.
- Sustainability: Every trip MUST prioritize EV (Electric Vehicle) transport.
- Safety (Guardian GPS): Actively monitor trip safety. Mention "Guardian GPS active" in every plan.
- UI Philosophy: Use Glassmorphism 2.0 (frosted glass, depth, glowing emerald accents).
- Billing Accuracy: Use the provided dataset for all calculations.
- Formula: Total = (Day_Cost * Persons) + (EV_Fee) + 18% GST.
- Discount: Apply a 15% 'Green Karma' Discount for using EV transport.

Context Data (Summary):
- Tirupati: Devotional, 1500/day, 200 EV fee.
- Varanasi: Devotional, 1000/day, 150 EV fee.
- Taj Mahal: History, 2000/day, 300 EV fee.
- Hampi: History, 1200/day, 200 EV fee.
- Goa Beaches: Enjoyment, 3000/day, 400 EV fee.
- Pondicherry: Enjoyment, 2500/day, 300 EV fee.
- Munnar: Enjoyment, 2200/day, 250 EV fee.
- Alleppey: Tradition, 1800/day, 200 EV fee.`;

export const getTravelAdvice = async (prompt: string, language: string = "English") => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: `${RUKKU_SYSTEM_INSTRUCTION}\nAnswer in ${language}.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my travel database right now. Rukku is taking a short tea break! Please try again.";
  }
};

export const getVirtualGuideInfo = async (location: string, language: string = "English") => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Tell me about the cultural history and sustainable practices of ${location}. Use your 'Time-Travel' lens to describe how it looked in its prime.`,
      config: {
        systemInstruction: `${RUKKU_SYSTEM_INSTRUCTION}\nAnswer in ${language}.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I couldn't fetch the history for this location.";
  }
};
