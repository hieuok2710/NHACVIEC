import { GoogleGenAI, Type } from "@google/genai";
import { EventType, Priority } from "../types";

// Initialize Gemini Client
// Note: In a real production environment, ensure process.env.API_KEY is set.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Define the expected output schema for the schedule
const scheduleSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Nội dung cuộc họp hoặc sự kiện" },
      day: { type: Type.STRING, description: "Ngày diễn ra (định dạng YYYY-MM-DD hoặc DD/MM/YYYY)" },
      time: { type: Type.STRING, description: "Giờ bắt đầu (định dạng HH:MM)" },
      durationMinutes: { type: Type.NUMBER, description: "Thời lượng dự kiến tính bằng phút (mặc định 90 nếu không rõ)" },
      location: { type: Type.STRING, description: "Địa điểm tổ chức" },
      type: { type: Type.STRING, description: "Loại sự kiện (Họp, Công tác, Sự kiện, Xử lý văn bản)" },
      priority: { type: Type.STRING, description: "Mức độ ưu tiên (Khẩn cấp, Cao, Bình thường)" }
    },
    required: ["title", "day", "time"]
  }
};

export const extractScheduleFromImage = async (base64Data: string, mimeType: string) => {
  if (!process.env.API_KEY) {
    throw new Error("Chưa cấu hình API Key cho Gemini.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Bạn là trợ lý ảo hỗ trợ Lãnh đạo. Hãy phân tích hình ảnh Lịch Công Tác (thường là bảng) và trích xuất danh sách các sự kiện.
            
            Quy tắc xử lý:
            1. Tìm ngày tháng, giờ, nội dung, địa điểm và người chủ trì (nếu có thì đưa vào nội dung).
            2. Nếu không có giờ cụ thể: "Sáng" mặc định là 08:00, "Chiều" mặc định là 14:00.
            3. Xác định 'type' dựa trên từ khóa: 'Họp' -> Meeting, 'Đi'/'Công tác' -> Business Trip, còn lại là Event.
            4. Xác định 'priority': Nếu có từ 'Khẩn', 'Gấp', 'Quan trọng' -> High/Urgent.
            5. Trả về định dạng JSON thuần túy theo schema.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: scheduleSchema,
        temperature: 0.1 // Low temperature for factual extraction
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};

export const parseScheduleFromText = async () => null;
export const generateDailyBriefing = async () => "";
