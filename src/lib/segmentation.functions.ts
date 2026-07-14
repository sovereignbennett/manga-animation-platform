import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BodyPartKind } from "@/types/segmentation";

const BODY_PART_KINDS = [
  "hair_front",
  "hair_back",
  "head",
  "face",
  "eyes",
  "mouth",
  "torso",
  "arm_left_upper",
  "arm_left_lower",
  "hand_left",
  "arm_right_upper",
  "arm_right_lower",
  "hand_right",
  "leg_left_upper",
  "leg_left_lower",
  "foot_left",
  "leg_right_upper",
  "leg_right_lower",
  "foot_right",
  "accessory",
  "background",
  "foreground",
  "unknown",
] as const;

const InputSchema = z.object({
  imageDataUrl: z.string().min(20),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
});

const PartSchema = z.object({
  kind: z.enum(BODY_PART_KINDS),
  label: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  suggestedPivot: z.object({ x: z.number(), y: z.number() }).optional(),
});

const ModelResponseSchema = z.object({
  parts: z.array(PartSchema),
});

const MODEL_ID = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a computer-vision assistant that analyzes a single character illustration
(anime, manga or edit-style artwork) and returns anatomically-labelled bounding boxes
suitable for rigging the character in an animation editor.

Rules:
- Output ONLY valid JSON matching the provided schema, no prose, no markdown fences.
- Coordinates are absolute pixel values with origin at the TOP-LEFT of the image.
- (x, y) is the top-left corner of the bbox. width/height are positive.
- Every bbox MUST be fully inside the image.
- Only include body parts you can clearly see. It is fine to return fewer parts.
- Use the "kind" enum. Pick the most specific value that applies.
- "confidence" is your subjective certainty (0..1).
- "suggestedPivot" is optional: the natural rotation joint for that part in image coords
  (shoulder for upper arm, elbow for forearm, wrist for hand, hip for thigh, knee for shin, ankle for foot,
  base of neck for head/hair, center for torso).`;

export const detectBodyParts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY is not configured");

    const jsonSchema = {
      type: "object",
      properties: {
        parts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: BODY_PART_KINDS as unknown as string[] },
              label: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              bbox: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" },
                },
                required: ["x", "y", "width", "height"],
                additionalProperties: false,
              },
              suggestedPivot: {
                type: "object",
                properties: { x: { type: "number" }, y: { type: "number" } },
                required: ["x", "y"],
                additionalProperties: false,
              },
            },
            required: ["kind", "label", "confidence", "bbox"],
            additionalProperties: false,
          },
        },
      },
      required: ["parts"],
      additionalProperties: false,
    };

    const body = {
      model: MODEL_ID,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this ${data.imageWidth}x${data.imageHeight} character and return part bboxes.`,
            },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "body_parts", schema: jsonSchema, strict: true },
      },
    };

    const res = await fetch("", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI gateway error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("AI returned an unexpected response shape");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI response was not valid JSON");
    }

    const validated = ModelResponseSchema.parse(parsed);

    // Clamp bboxes to image bounds defensively
    const parts = validated.parts.map((p) => ({
      ...p,
      kind: p.kind as BodyPartKind,
      bbox: {
        x: Math.max(0, Math.min(data.imageWidth - 1, p.bbox.x)),
        y: Math.max(0, Math.min(data.imageHeight - 1, p.bbox.y)),
        width: Math.max(1, Math.min(data.imageWidth - p.bbox.x, p.bbox.width)),
        height: Math.max(1, Math.min(data.imageHeight - p.bbox.y, p.bbox.height)),
      },
    }));

    return { parts, modelTag: MODEL_ID };
  });
