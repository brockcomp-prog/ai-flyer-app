
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { FlyerInputs, CleanFlyerOutput, LogoInput, SubjectTransform, ImageInput, AnalyzedImageData, AnalyzedLogoElement } from '../types';

// FIX: Update GoogleGenAI initialization to follow API guidelines.
// The API key is assumed to be available in process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const compositeImages = (
    subjectBase64: string,
    logos: LogoInput[],
    subjectTransform: SubjectTransform,
    targetWidth: number,
    targetHeight: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context for compositing.'));

        const imagePromises: Promise<void>[] = [];
        
        // Subject Image
        const subjectPromise = new Promise<void>((res, rej) => {
            const subjectImg = new Image();
            subjectImg.onload = () => {
                // FIX: Corrected typo from `subject.height` to `subjectImg.height`.
                const imgAspectRatio = subjectImg.width / subjectImg.height;
                const canvasAspectRatio = targetWidth / targetHeight;

                let renderWidth, renderHeight;

                if (imgAspectRatio > canvasAspectRatio) {
                    renderWidth = targetWidth;
                    renderHeight = targetWidth / imgAspectRatio;
                } else {
                    renderHeight = targetHeight;
                    renderWidth = targetHeight * imgAspectRatio;
                }
                
                const scale = subjectTransform.scale / 100;
                const scaledWidth = renderWidth * scale;
                const scaledHeight = renderHeight * scale;
                const x = (subjectTransform.x / 100) * targetWidth - scaledWidth / 2;
                const y = (subjectTransform.y / 100) * targetHeight - scaledHeight / 2;
                ctx.drawImage(subjectImg, x, y, scaledWidth, scaledHeight);
                res();
            };
            subjectImg.onerror = () => rej(new Error('Failed to load subject image for compositing.'));
            subjectImg.src = `data:image/png;base64,${subjectBase64}`;
        });
        imagePromises.push(subjectPromise);

        // Logo Images
        logos.forEach(logo => {
            const logoPromise = new Promise<void>((res, rej) => {
                const logoImg = new Image();
                logoImg.onload = () => {
                    const logoMaxWidth = targetWidth * 0.25; // max 25% of canvas width
                    const logoMaxHeight = targetHeight * 0.25; // max 25% of canvas height
                    
                    const logoScale = Math.min(logoMaxWidth / logoImg.width, logoMaxHeight / logoImg.height, 1);
                    const logoWidth = logoImg.width * logoScale;
                    const logoHeight = logoImg.height * logoScale;
                    
                    const logoX = (logo.position.left / 100) * targetWidth - logoWidth / 2;
                    const logoY = (logo.position.top / 100) * targetHeight - logoHeight / 2;

                    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                    res();
                };
                logoImg.onerror = () => rej(new Error(`Failed to load logo "${logo.name}" for compositing.`));
                logoImg.src = `data:${logo.mimeType};base64,${logo.base64}`;
            });
            imagePromises.push(logoPromise);
        });

        Promise.all(imagePromises)
            .then(() => {
                resolve(canvas.toDataURL('image/png').split(',')[1]);
            })
            .catch(reject);
    });
};


export const removeImageBackground = async (
    subjectImageBase64: string,
    subjectImageMimeType: string
): Promise<{ base64: string; mimeType: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: subjectImageBase64,
                            mimeType: subjectImageMimeType,
                        },
                    },
                    {
                        text: `
Your task is to act as a professional photo editor. You will be given an image and you must perform a perfect background removal.

1.  **Identify the main subject(s)** of the image (e.g., person, product, animal).
2.  **Precisely isolate the subject(s).** Create a clean, sharp, and accurate cutout. Pay meticulous attention to fine details like hair, fur, semi-transparent areas, and complex edges.
3.  **Completely and cleanly delete the entire background.** Leave no artifacts, shadows, or remnants of the original background.
4.  **The output must be a PNG image with a true, transparent alpha channel.** Do not fill the background with any color (not white, not black, not anything). It must be transparent.
5.  **Do not alter the subject itself.** The subject's colors, lighting, and details must be preserved.
                        `,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (!response.candidates?.[0]?.content?.parts) {
            console.error("Invalid response from background removal API:", JSON.stringify(response, null, 2));
            throw new Error('AI returned an invalid or empty response during background removal. This might be due to a safety policy violation.');
        }

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                return {
                    base64: part.inlineData.data,
                    mimeType: 'image/png',
                };
            }
        }
        throw new Error('AI failed to return an image with the background removed.');
    } catch (error) {
        console.error("Error during image background removal:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to process subject image: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while communicating with the AI model for background removal.");
    }
};

export const analyzeInspirationImage = async (
    imageBase64: string,
    imageMimeType: string
): Promise<AnalyzedImageData> => {
    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                headline: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        position: {
                            type: Type.OBJECT,
                            properties: {
                                top: { type: Type.NUMBER },
                                left: { type: Type.NUMBER },
                            },
                        },
                    },
                },
                subheading: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        position: {
                            type: Type.OBJECT,
                            properties: {
                                top: { type: Type.NUMBER },
                                left: { type: Type.NUMBER },
                            },
                        },
                    },
                },
                body: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        position: {
                            type: Type.OBJECT,
                            properties: {
                                top: { type: Type.NUMBER },
                                left: { type: Type.NUMBER },
                            },
                        },
                    },
                },
                contactInfo: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        position: {
                            type: Type.OBJECT,
                            properties: {
                                top: { type: Type.NUMBER },
                                left: { type: Type.NUMBER },
                            },
                        },
                    },
                },
                logos: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      position: {
                        type: Type.OBJECT,
                        properties: {
                          top: { type: Type.NUMBER },
                          left: { type: Type.NUMBER },
                        },
                      },
                      size: {
                        type: Type.OBJECT,
                        properties: {
                          width: { type: Type.NUMBER },
                          height: { type: Type.NUMBER },
                        },
                      }
                    }
                  }
                }
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageBase64,
                            mimeType: imageMimeType,
                        },
                    },
                    {
                        text: `
Analyze the provided image, which is a flyer or poster. Identify the main text elements, their hierarchical roles (headline, subheading, body, contact info), and any logos present.

Your task is to:
1.  Extract the text content for each element.
2.  Determine the **center coordinates** for each text block.
3.  Identify all logos. For each logo, determine its **center coordinates** and its **bounding box size** (width and height).

All coordinates and sizes must be provided as percentages relative to the image's total dimensions.

Return the data in a JSON object that strictly adheres to the provided schema.

- **Text Elements**: If a specific text element (e.g., subheading) is not present, return an empty string for its 'text' field and position it at { top: 0, left: 0 }.
- **Logos**: If no logos are found, return an empty array for the 'logos' field.
                        `,
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonStr = response.text.trim();
        const parsedJson = JSON.parse(jsonStr);
        return parsedJson as AnalyzedImageData;

    } catch (error) {
        console.error("Error during image text analysis:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to analyze inspiration image: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while analyzing the image with the AI model.");
    }
};

const createGenerationPrompt = (inputs: FlyerInputs, aspectRatio: 'portrait' | 'square'): string => {
    const layoutInstructions = `
*   Headline Block: Centered at Top ${inputs.layoutPositions.headline.top.toFixed(1)}%, Left ${inputs.layoutPositions.headline.left.toFixed(1)}%.
*   Subheading Block: Centered at Top ${inputs.layoutPositions.subheading.top.toFixed(1)}%, Left ${inputs.layoutPositions.subheading.left.toFixed(1)}%.
*   Body Block: Centered at Top ${inputs.layoutPositions.body.top.toFixed(1)}%, Left ${inputs.layoutPositions.body.left.toFixed(1)}%.
*   Contact Info Block: Centered at Top ${inputs.layoutPositions.contactInfo.top.toFixed(1)}%, Left ${inputs.layoutPositions.contactInfo.left.toFixed(1)}%.
`;
    
    const styleDescriptionParts = [];
    if (inputs.venue && inputs.venue !== 'None') styleDescriptionParts.push(`The flyer is for a '${inputs.venue}'.`);
    if (inputs.event && inputs.event !== 'None') styleDescriptionParts.push(`It's promoting a '${inputs.event}' event.`);
    if (inputs.season && inputs.season !== 'None') styleDescriptionParts.push(`The seasonal theme is '${inputs.season}'.`);
    if (inputs.style && inputs.style !== 'Auto') styleDescriptionParts.push(`The core aesthetic is '${inputs.style}'.`);

    const themeDescription = styleDescriptionParts.length > 0
        ? styleDescriptionParts.join(' ')
        : `The AI should auto-detect a fitting theme based on the headline: "${inputs.headline}".`;


    const commonInstructions = `
**Mission: Create an Award-Winning, Production-Ready Social Media Flyer with a "Wow" Factor.**
You are a world-class art director and master typographer at a premier design agency. Your work is known for its cinematic quality, emotional depth, and impeccable execution. Your task is to create a visually arresting, high-end flyer that stops people scrolling and demands attention. The final result must look expensive, polished, and be of magazine-cover quality.

**CORE ART DIRECTION PRINCIPLES (NON-NEGOTIABLE)**

1.  **Cinematic Quality & "The Wow Factor":** The primary goal is to create a stunning image that evokes a powerful emotional response. It must feel dynamic and professionally produced. Think of it as a movie poster or a high-fashion ad.
2.  **Compositional Mastery:** Go beyond basic rules. Use dynamic tension, sophisticated color theory (e.g., analogous, triadic, complementary), and a strong, clear focal point to create a composition that is both balanced and exciting. Every element must have a purpose and guide the viewer's eye intentionally.
3.  **Sophisticated Lighting:** Light is your most powerful tool. Use it to create mood, depth, and drama. Implement cinematic lighting techniques: volumetric light, subtle glows, lens flares (used tastefully and motivated by a light source), and realistic, soft shadows. The lighting must feel intentional and enhance the overall theme.
4.  **Rich Textures & Detail:** The flyer must have a sense of tactility and depth. Where appropriate for the style, incorporate subtle textures, film grain, material details (e.g., brushed metal, reflective glass, fabric), and atmospheric effects (e.g., haze, dust motes). Avoid flat, sterile, digital-looking surfaces unless the style is explicitly minimalist.
5.  **Professional Color Grading:** Apply a final, cohesive, professional color grade across the entire image. The colors should be rich, harmonious, and carefully chosen to support the theme and headline. Ensure deep blacks and clean whites.

**1. THE CREATIVE BRIEF**
*   **Headline**: "${inputs.headline}"
*   **Core Theme & Subject**: ${themeDescription}
*   **Art Style**: "${inputs.artStyle === 'Auto' ? `Auto-detect based on the Core Theme.` : inputs.artStyle}"
*   **Font Style for Headline**: "${inputs.fontStyle === 'Auto' ? `Auto-detect based on the Core Theme.` : inputs.fontStyle}"

**2. TECHNICAL SPECIFICATIONS**
*   **Aspect Ratio**: The final image MUST be **${aspectRatio}** (${aspectRatio === 'portrait' ? '1080x1350' : '1080x1080'}).
*   **Output Format**: Deliver only a single, finished PNG image. Nothing else.

**3. TYPOGRAPHY HIERARCHY & INTEGRATION (CRITICAL)**
Your typography must be world-class. Treat it with the same importance as the main image. The goal is premium, magazine-quality typesetting that establishes a clear, impactful hierarchy.

*   **Strict Two-Font Rule**: This is the foundation of professional design.
    *   **Headline Font**: For the headline ONLY, use a powerful, high-impact display font that is either custom-lettered to fit the style or is a premium, expressive font appropriate for the theme.
    *   **Supporting Font**: For ALL other text (Subheading, Body, Contact), you MUST use a single, versatile, and highly legible professional sans-serif font family (e.g., Helvetica Neue, Inter, Akzidenz-Grotesk, Roboto Condensed). This contrast between the expressive headline and the clean supporting text is non-negotiable.

*   **Meticulous Typesetting**: Pay obsessive attention to kerning, tracking, and leading for all text. Text should feel balanced, airy, and effortless to read. No cramped or uneven text.

*   **Seamless Environmental Integration**: Text is not an overlay; it is part of the scene. It must react to the scene's lighting, casting soft, realistic shadows and catching highlights.

*   **Text Block Content & Style Hierarchy**:

    *   **1. Primary (Headline - The Artistic Centerpiece)**: "${inputs.headline}"
        *   **Role**: The main visual hook.
        *   **Execution**: This is your typographic masterpiece. Apply the chosen Font Style ("${inputs.fontStyle}") with incredible artistry and detail. It must be visually stunning and perfectly integrated.

    *   **2. Secondary (Subheading - The Secondary Hero)**: "${inputs.subheading}"
        *   **Role**: To feature key information like artists, DJs, or a main tagline. It's the second most important text.
        *   **Execution**: Use the clean, professional sans-serif font. It should be significantly smaller than the headline but larger than the body text. Often rendered in **ALL CAPS** with a bold or condensed weight to make a strong statement. Give it a clean, contrasting color (e.g., crisp white or a complementary color from the palette).

    *   **3. Tertiary (Body - The Essential Details)**: "${inputs.body}"
        *   **Role**: To clearly communicate vital information like date, time, and special offers.
        *   **Execution**: Use the same clean sans-serif font family, but at a smaller size and regular or medium weight. Group the text logically. For extra impact and readability against a complex background, consider placing this text within a subtle, clean graphic element like a box with low opacity or giving it a very thin stroke. Readability is paramount.

    *   **4. Quaternary (Contact Info - The Fine Print)**: "${inputs.contactInfo}"
        *   **Role**: For venue name, address, website, or social media handles.
        *   **Execution**: Use the same clean sans-serif font family at its smallest, most utilitarian size. It must still be perfectly legible, cleanly typeset, and typically placed at the bottom of the flyer.

**4. LAYOUT PLACEMENT GUIDE (TEXT BLOCKS):**
Use the following percentages (top, left) as the CENTER point for each text *block*. You are responsible for the layout of text *within* each block. Adhere to these block placements closely.
${layoutInstructions}

**5. STYLE INTERPRETATION GUIDES:**
*   **Auto-detect Logic**: If a style is set to 'Auto-detect', you MUST analyze the Core Theme & Subject and generate a unique, fitting style from scratch. Do not just pick a generic option.
*   **Art Styles**: 'Photorealistic' (realism), 'Cinematic' (dramatic, filmic), 'Minimalist' (clean, negative space), 'Retro Funk' (70s/80s disco), 'Vibrant Gradient' (modern, energetic), 'Grunge' (distressed, edgy), 'Art Deco' (geometric, elegant), 'Vaporwave' (80s retro-futurism), 'Gouache' (painterly), 'Holographic' (iridescent, futuristic), 'Street Art' (urban, spray-paint).
*   **Font Styles**: 'Gold' (reflective metal), 'Neon' (glowing tubes), 'Graffiti' (spray-paint), 'Retro' (70s/80s groovy), 'Comic' (cartoonish), 'Fire' (burning), 'Metal' (chrome/steel), '3D' (extruded), 'Tattoo' (ink script), 'Glitter' (sparkly), 'Chrome' (hyper-realistic liquid chrome with environmental reflections), 'Glass' (translucent, see-through glass with caustics and refractions), 'Holographic' (shimmering, semi-transparent, glitchy digital projection), 'Water' (clear liquid with caustics and ripples), 'Ice' (frozen, crystalline, with frost).
    `;

    if (inputs.imageInput?.type === 'subject') {
        return `
${commonInstructions}

**6. SCENARIO: SUBJECT & SCENE INTEGRATION**
*   **Your Canvas**: You are given a pre-composited image containing the main subject and logos on a transparent background. The subject is the star of the show. Your task is to design and build a breathtaking world *around* them, making them the undeniable focal point.
*   **Masterful Composition & Integration (CRITICAL)**: The final image must look like a unified, professional photoshoot, not a composite. The subject must be perfectly and artistically integrated into the scene.
    *   **Aesthetic Placement & Grounding**: While the subject's position is pre-defined, you must build the world to make their placement feel intentional and aesthetically pleasing. Ground the subject by creating a believable surface for them to interact with (e.g., a floor, stage, stylized platform). They should not look like they are floating.
    *   **Create Depth Through Layering**: Generate foreground, mid-ground, and background elements that create a sense of immersion. Elements like atmospheric effects (smoke, fog, light rays), environmental details (blowing leaves, sparks), or abstract shapes should partially overlap with the subject to place them *within* the scene.
    *   **Seamless Fading & Blending**: This is key. Artfully blend the lower portion of the subject into the generated environment. Use a soft linear gradient to fade their legs/lower body into the background, or integrate them into generated smoke, clouds, or graphic elements at their base. This eliminates hard cutout lines and creates a polished, high-end look.
    *   **Wrap-around Lighting**: The lighting you create for the scene must wrap around the subject realistically. Light from the environment should cast color and highlights onto the subject. The subject must cast realistic, soft shadows onto the background and elements behind them.
    *   **Edge Refinement**: Pay special attention to the edges of the subject. Use subtle rim lighting or bloom to further blend them into the environment.
*   **Subject Enhancement**: Make the subject look heroic and aspirational using only light and color. **DO NOT alter their physical characteristics.**
    *   **Unified Color Grade**: Apply a final, unifying color grade to the entire image (subject and background) to make them feel like part of the same photograph. Ensure skin tones remain natural and flattering.
*   **Build an Immersive World**: Create a complete, three-dimensional environment that complements the subject and theme. Apply all the Core Art Direction Principles to make this world feel real and atmospheric.
`;
    }

    if (inputs.imageInput?.type === 'inspiration') {
        const logoDeletionInstructions = (inputs.logosToDelete && inputs.logosToDelete.length > 0) ? `
3.  **LOGO REMOVAL (IMPORTANT):**
    *   In addition to the text, the following logos must be completely removed. Flawlessly inpaint the background where they were located, matching the original's texture, lighting, and style.
${inputs.logosToDelete.map((logo: AnalyzedLogoElement) => `    *   Logo centered at: Top ${logo.position.top.toFixed(1)}%, Left ${logo.position.left.toFixed(1)}% (Size: ${logo.size.width.toFixed(1)}% wide, ${logo.size.height.toFixed(1)}% high)`).join('\n')}
` : '';

        const styleAdjustmentsInstruction = (inputs.styleAdjustments && inputs.styleAdjustments.trim() !== '') ? `
5.  **CREATIVE STYLE ADJUSTMENTS (POST-INTEGRATION):**
    After completing the precise text and layout integration, apply the following creative modifications to the flyer's overall aesthetic. These changes should alter the style while respecting the core composition.
    *   **User's Request:** "${inputs.styleAdjustments}"
    *   **Execution**: Interpret this request creatively. This might involve changing the color palette, font styles (while keeping them in the same location/hierarchy), background imagery, or adding stylistic effects. The goal is a professional "remix" of the original.
` : '';

        const finalVerificationStepNumber = (inputs.styleAdjustments && inputs.styleAdjustments.trim() !== '') ? '6' : '5';

        return `
${commonInstructions}

**6. SCENARIO: TYPOGRAPHIC REPLICATION & COMPOSITIONAL INTEGRATION**
Your mission is to function as a master typographer and layout artist. You will be given a "Template Image" (which may have user-provided replacement logos already composited on it) and new text content. Your goal is to replace the original text with the new text so seamlessly that it looks like it was part of the original design. This requires precision, artistic sensitivity, and a deep understanding of typography.

**Step-by-Step Process:**

1.  **DECONSTRUCT THE ORIGINAL TYPOGRAPHY (CRITICAL ANALYSIS):**
    Before you do anything else, perform a deep analysis of the text in the Template Image. For each text element (headline, subheading, etc.), identify:
    *   **Font DNA**: Font family (e.g., clean sans-serif, elegant serif, bold display), weight (bold, regular), and **letter case (e.g., ALL UPPERCASE, Title Case, lowercase)**.
    *   **Visual Styling**: The exact color or gradient used.
    *   **Text Effects**: Precisely replicate any effects like drop shadows, glows, strokes, bevels, or textures. Note their color, opacity, distance, and softness.
    *   **Layout & Alignment**: Observe the placement, line breaks, alignment (left, center, or right), and **the precise bounding box (safe area)** of the original text blocks.

2.  **SEAMLESS TEXT & LOGO REMOVAL & BACKGROUND RESTORATION:**
    *   Identify and completely remove all original text from the Template Image.
    *   ${logoDeletionInstructions ? 'Execute the logo removal instructions below.' : 'No logos need to be removed.'}
    *   Flawlessly inpaint the background where the text and specified logos were. The restoration must be undetectable, perfectly matching surrounding textures, lighting, and colors. The result should be a clean version of the original background, ready for new content.

${logoDeletionInstructions}

4.  **INTELLIGENT & CONSTRAINED TEXT RE-INTEGRATION (THE ARTISTRY):**
    Now, typeset the new text onto the clean background. This is a technical task requiring precision.
    *   **Source of Truth**: The user-provided text is absolute. **You MUST render it EXACTLY as provided, without any typos, omissions, or additions.** For example, "Cosmos Taverna" must not become "Cosmptaverna".
    *   **Apply Font DNA**: Apply the font characteristics you identified in Step 1 to the new text. This includes **enforcing the original letter case**, regardless of how the user typed the input.
    *   **Replicate Visual Styling**: Meticulously apply the same colors, gradients, and effects you analyzed. Use the original as a perfect reference.
    *   **Strict Compositional Boundaries**: This is the most critical rule.
        *   The original text occupied a specific "safe area" or "bounding box" on the flyer. You must place the new text strictly within this **exact same area**.
        *   **NEVER allow the new text to overflow or extend beyond the boundaries of the original text's bounding box.** It must not run off the side of the flyer or into other design elements.
        *   **Adapt within the Box**: To make the new text fit, you must primarily adjust the **font size**. You may also make subtle adjustments to tracking (letter-spacing) and leading (line-spacing) or apply intelligent line breaks. The goal is to fit the new content perfectly inside the original's compositional space.

${styleAdjustmentsInstruction}

**${finalVerificationStepNumber}. FINAL VERIFICATION:**
    Before outputting the final image, perform a self-correction check:
    *   **Typo Check**: Is the rendered text IDENTICAL to the user's input text?
    *   **Boundary Check**: Does any part of the new text extend beyond the area where the original text was located?
    *   If either check fails, you must redo the integration step until it is perfect.

**Final Mandate**: The output must be the original design, compositionally intact, but with the new text integrated so perfectly that the typography and layout feel authentic to the original art direction. The only changes are the text content and specified logo removals; the underlying art and style must be preserved.
`;
    }

    // Default to Text-Only Generation
    return `
${commonInstructions}

**6. SCENARIO: PURE CREATION (FROM TEXT)**
*   **Your Canvas is Blank**: You have total creative freedom. Do not be conservative or generic. Your task is to invent a powerful, iconic visual concept from scratch based on the creative brief.
*   **Create a Central Visual Metaphor**: Instead of a simple background, generate a compelling central image or scene that visually represents the headline: "${inputs.headline}". This could be an abstract sculpture of light, a hyper-realistic object, or a surreal scene. It must be the hero of the composition.
*   **Build a World**: Construct a complete, immersive environment around your central visual. Use the Core Art Direction Principles (lighting, texture, color, composition) to their fullest extent to create a breathtaking scene with palpable atmosphere and depth.
`;
};

const callImageModel = async (prompt: string, imageParts: any[]): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                ...imageParts,
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    if (!response.candidates?.[0]?.content?.parts) {
        console.error("Invalid response from flyer generation API:", JSON.stringify(response, null, 2));
        throw new Error('AI returned an invalid or empty response while generating the flyer.');
    }

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error('AI failed to return a generated image.');
};

export const generateFlyer = async (inputs: FlyerInputs, onProgress: (message: string) => void): Promise<CleanFlyerOutput> => {
    try {
        let portraitImageParts: any[] = [];
        let squareImageParts: any[] = [];
        const imageInput = inputs.imageInput;

        if (imageInput?.type === 'subject') {
            onProgress('Compositing subject and logos...');
            const [portraitCompositedBase64, squareCompositedBase64] = await Promise.all([
                compositeImages(imageInput.base64, imageInput.logos, imageInput.transform, 1080, 1350),
                compositeImages(imageInput.base64, imageInput.logos, imageInput.transform, 1080, 1080),
            ]);
            portraitImageParts.push({ inlineData: { data: portraitCompositedBase64, mimeType: 'image/png' } });
            squareImageParts.push({ inlineData: { data: squareCompositedBase64, mimeType: 'image/png' } });

        } else if (imageInput?.type === 'inspiration') {
            onProgress('Preparing template image...');
            const inspirationPart = { inlineData: { data: imageInput.base64, mimeType: imageInput.mimeType } };
            portraitImageParts.push(inspirationPart);
            squareImageParts.push(inspirationPart);
        }

        onProgress('Generating flyer design...');
        const flyerPrompt = createGenerationPrompt(inputs, 'portrait');
        const flyerImageUrl = await callImageModel(flyerPrompt, portraitImageParts);

        onProgress('Adapting design for thumbnail...');
        const thumbnailPrompt = createGenerationPrompt(inputs, 'square');
        const thumbnailImageUrl = await callImageModel(thumbnailPrompt, squareImageParts);

        if (!flyerImageUrl || !thumbnailImageUrl) {
            throw new Error("Image generation failed to produce valid outputs.");
        }

        return {
            flyerImageUrl,
            thumbnailImageUrl,
        };

    } catch (error) {
        console.error("Error during AI flyer generation:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unexpected error occurred while communicating with the AI model.");
    }
};
