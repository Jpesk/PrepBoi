// Deno edge function for PrepPro Unified Helper (Intelligent Parsing & Quizzes)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized: Missing header", { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Check user auth context
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response("Unauthorized: Invalid token", { status: 401, headers: corsHeaders });
    }

    // Fetch user's profile and organization configuration
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    if (!profile) {
      return new Response("Forbidden: Profile not found", { status: 403, headers: corsHeaders });
    }

    const { data: org } = await supabase.from("organizations")
      .select("api_provider, api_endpoint")
      .eq("id", profile.org_id)
      .single();
    
    const provider = org?.api_provider || "mock";
    const endpoint = org?.api_endpoint;

    // Determine request Content-Type to parse body correctly
    const contentType = req.headers.get("content-type") || "";
    let action = "";
    let type = "";
    let file: File | null = null;
    let url = "";
    let id = "";
    let title = "";
    let sections: any[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      action = (formData.get("action") as string) || "";
      type = (formData.get("type") as string) || "";
      file = formData.get("file") as File;
    } else {
      const json = await req.json();
      action = json.action;
      type = json.type;
      id = json.id;
      title = json.title;
      sections = json.sections;
      url = json.url;
    }

    if (!action) {
      return new Response("Bad Request: Missing action parameter", { status: 400, headers: corsHeaders });
    }

    let responseData;

    if (action === "parse-document" && file) {
      // 1. Process document/spreadsheet upload
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();
      let extractedText = "";
      let structuredRecipe: any = null;

      if (fileName.endsWith(".json")) {
        const text = new TextDecoder().decode(fileBytes);
        try {
          const parsed = JSON.parse(text);
          responseData = parsed;
        } catch (_err) {
          return new Response("Invalid JSON format", { status: 400, headers: corsHeaders });
        }
      } else if (fileName.endsWith(".csv") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // Parse spreadsheet rows
        const XLSX = await import("https://esm.sh/xlsx@0.18.5");
        const workbook = XLSX.read(fileBytes, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (type === "recipe") {
          // Attempt direct extraction of tabular recipe ingredients
          const ingredients: any[] = [];
          const steps: string[] = [];
          
          // Heuristic matching for header columns
          let ingCol = 0, amtCol = 1, unitCol = -1;
          let headerRowFound = false;

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;

            // Look for headers
            if (!headerRowFound) {
              const rowText = row.map((c: any) => String(c).toLowerCase());
              const hasIng = rowText.findIndex((t: string) => t.includes("ingred") || t.includes("item") || t.includes("name"));
              if (hasIng !== -1) {
                ingCol = hasIng;
                const hasAmt = rowText.findIndex((t: string) => t.includes("qty") || t.includes("amount") || t.includes("quant") || t.includes("val"));
                if (hasAmt !== -1) amtCol = hasAmt;
                const hasUnit = rowText.findIndex((t: string) => t.includes("unit") || t.includes("measure"));
                if (hasUnit !== -1) unitCol = hasUnit;
                headerRowFound = true;
                continue;
              }
            }

            // Extract values
            const name = String(row[ingCol] || "").trim();
            if (name && isNaN(Number(name))) {
              let amount = 1;
              let unit = "";
              
              if (amtCol !== -1 && row[amtCol] !== undefined) {
                const rawAmt = parseFloat(row[amtCol]);
                if (!isNaN(rawAmt)) amount = rawAmt;
              }
              if (unitCol !== -1 && row[unitCol] !== undefined) {
                unit = String(row[unitCol]).trim();
              } else if (amtCol !== -1 && isNaN(parseFloat(row[amtCol]))) {
                // If amount is a text (like "2 cups"), parse it
                const match = String(row[amtCol]).match(/^([\d.]+)\s*(.*)$/);
                if (match) {
                  amount = parseFloat(match[1]);
                  unit = match[2].trim();
                }
              }

              ingredients.push({
                id: `ing_${Date.now()}_${r}`,
                name,
                amount,
                unit
              });
            }
          }

          if (ingredients.length > 0) {
            structuredRecipe = {
              title: file.name.replace(/\.[^/.]+$/, ""),
              ingredients,
              steps: ["Imported from sheet rows. Review details."],
              notes: ""
            };
          }
        }

        if (!structuredRecipe) {
          // If no tabular mapping worked, dump sheet rows to text
          extractedText = rows.map(r => r.join(" ")).join("\n");
        }
      } else if (fileName.endsWith(".docx")) {
        const mammoth = await import("https://esm.sh/mammoth@1.6.0");
        const result = await mammoth.extractRawText({ arrayBuffer: fileBytes.buffer });
        extractedText = result.value;
      } else if (fileName.endsWith(".pdf")) {
        extractedText = extractPdfText(fileBytes);
      } else {
        // Plain text fallback
        extractedText = new TextDecoder().decode(fileBytes);
      }

      // 2. Map extracted text to structured content via model or fallback
      if (!responseData) {
        if (structuredRecipe) {
          responseData = structuredRecipe;
        } else {
          if (provider === "mock") {
            responseData = executeMockEngine("parse-document", fileName, [{ title: "Extracted", body: extractedText }], type);
          } else {
            try {
              responseData = await executeModelEngine(provider, endpoint, "parse-document", fileName, [{ title: "Extracted", body: extractedText }], type);
            } catch (err) {
              console.error("Model execution failed, resolving heuristics:", err);
              responseData = executeMockEngine("parse-document", fileName, [{ title: "Extracted", body: extractedText }], type);
            }
          }
        }
      }
    } else if (action === "parse-url" && url) {
      // Fetch URL and strip HTML tags
      let htmlText = "";
      try {
        const fetchRes = await fetch(url);
        htmlText = await fetchRes.text();
      } catch (err) {
        console.error("Failed fetching URL:", err);
        htmlText = `Checklist URL reference page: ${url}`;
      }

      const strippedText = htmlText
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000); // safety cap

      if (provider === "mock") {
        responseData = executeMockEngine("parse-url", url, [{ title: "Webpage", body: strippedText }]);
      } else {
        try {
          responseData = await executeModelEngine(provider, endpoint, "parse-url", url, [{ title: "Webpage", body: strippedText }]);
        } catch (err) {
          console.error("Model URL parsing failed, resolving heuristics:", err);
          responseData = executeMockEngine("parse-url", url, [{ title: "Webpage", body: strippedText }]);
        }
      }
    } else {
      // Core logic for generate-quiz and parse-sop
      if (provider === "mock") {
        responseData = executeMockEngine(action, title, sections, type);
      } else {
        try {
          responseData = await executeModelEngine(provider, endpoint, action, title, sections, type);
        } catch (err) {
          console.error("Model execution failed, resolving fallback:", err);
          responseData = executeMockEngine(action, title, sections, type);
        }
      }

      // Cache the quiz questions back to database if generating a quiz
      if (action === "generate-quiz" && responseData && id) {
        const targetTable = type === "recipe" ? "recipes" : "sops";
        await supabase.from(targetTable)
          .update({ quiz_questions: responseData })
          .eq("id", id);
      }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// --- LIGHTWEIGHT PDF TEXT EXTRACTOR ---
function extractPdfText(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const matches = text.matchAll(/BT([\s\S]*?)ET/g);
  let result = "";
  for (const match of matches) {
    const block = match[1];
    const strings = block.matchAll(/\((.*?)\)/g);
    for (const s of strings) {
      result += s[1] + " ";
    }
    result += "\n";
  }
  return result.replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
               .replace(/\\(.)/g, "$1").trim();
}

// --- OFFLINE RULE ENGINE ---
function executeMockEngine(action: string, title: string, sections: any[], type?: string) {
  const cleanTitle = title.replace(/[*#`_\-]/g, '').trim();
  const processedSections = sections && sections.length > 0 ? sections : [{ title: "General Operations", body: `Follow standard procedures for ${cleanTitle}.` }];

  if (action === "generate-quiz") {
    const questions: any[] = [];
    processedSections.forEach((sec: any) => {
      const sTitle = sec.title.replace(/[*#`_\-]/g, '').trim();
      const body = sec.body;

      // Check temperature
      const tempMatch = body.match(/(\d+)\s*(?:°F|degrees|Fahrenheit|C|°C)/i);
      if (tempMatch) {
        questions.push({
          q: `Regarding "${sTitle}", what is the critical temperature boundary?`,
          opts: [`${tempMatch[1]}°F`, `${parseInt(tempMatch[1]) + 10}°F`, `${parseInt(tempMatch[1]) - 10}°F`, `Not specified`],
          ans: 0
        });
        return;
      }

      // Check time
      const timeMatch = body.match(/(\d+)\s*(?:minutes|mins|hours|hrs|seconds|secs)/i);
      if (timeMatch) {
        questions.push({
          q: `According to the guidelines for "${sTitle}", how long is required?`,
          opts: [`Exactly ${timeMatch[0]}`, `Double the time`, `No specific timeframe`, `Only during setup`],
          ans: 0
        });
        return;
      }

      // Fallback
      questions.push({
        q: `What is the primary compliance focus under "${sTitle}"?`,
        opts: [
          `Ensuring safety and standard operations are met`,
          `Leaving tasks unfinished for managers`,
          `Ignoring instructions if busy`,
          `Executing only on weekend periods`
        ],
        ans: 0
      });
    });

    while (questions.length < 3) {
      questions.push({
        q: `What is the core objective of "${cleanTitle}"?`,
        opts: [`Maintaining strict operations standards`, `Speeding through tasks without care`, `Using custom non-standard workflows`, `Excluding staff members from audits`],
        ans: 0
      });
    }
    return questions;
  } else if (action === "parse-url") {
    // Return mock checklist structure parsed from site reference
    return [
      {
        id: `sec_${Date.now()}_1`,
        title: "Imported Shift Audits",
        items: [
          { id: `item_${Date.now()}_1`, text: "Check refrigeration temperatures", req: true, trig: { kind: "temp", warnAbove: 41 } },
          { id: `item_${Date.now()}_2`, text: "Sanitize all surfaces and workspaces", req: true, trig: { kind: "none" } },
          { id: `item_${Date.now()}_3`, text: "Verify trash bins are emptied and relined", req: false, trig: { kind: "none" } },
          { id: `item_${Date.now()}_4`, text: "Perform handoff count and log summaries", req: true, trig: { kind: "note" } }
        ]
      }
    ];
  } else if (action === "parse-document") {
    if (type === "recipe") {
      // Heuristic parsing of recipe lines from document text
      const body = processedSections[0].body;
      const lines = body.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      
      const ingredients: any[] = [];
      const steps: string[] = [];
      let notes = "";

      lines.forEach((line, idx) => {
        // Match lines starting with numbers/fractions for ingredients
        const ingMatch = line.match(/^([\d\/\s.-]+)\s*(g|oz|kg|lbs|cups|tsp|tbsp|ml|liters|pieces|cans)?\s+(.*)$/i);
        if (ingMatch) {
          ingredients.push({
            id: `ing_${Date.now()}_${idx}`,
            name: ingMatch[3].trim(),
            amount: parseFloat(ingMatch[1]) || 1,
            unit: ingMatch[2] ? ingMatch[2].toLowerCase().trim() : ""
          });
        } else if (line.toLowerCase().startsWith("note:") || line.toLowerCase().startsWith("notes:")) {
          notes += line.substring(5).trim() + " ";
        } else if (line.length > 20) {
          steps.push(line);
        }
      });

      // Default fallbacks if parsing extracted no data
      if (ingredients.length === 0) {
        ingredients.push({ id: "ing_1", name: "Extracted Flour", amount: 500, unit: "g" });
        ingredients.push({ id: "ing_2", name: "Water", amount: 350, unit: "ml" });
      }
      if (steps.length === 0) {
        steps.push("Prepare and weigh ingredients.");
        steps.push("Combine and knead thoroughly.");
      }

      return {
        title: cleanTitle.replace(/\.[^/.]+$/, ""),
        ingredients,
        steps,
        notes: notes.trim()
      };
    } else {
      // SOP document extraction mapping
      const body = processedSections[0].body;
      const paras = body.split("\n\n").map(p => p.trim()).filter(p => p.length > 10);
      const sections = paras.map((p, idx) => {
        const lines = p.split("\n");
        const title = lines[0].length < 60 ? lines[0] : `Chapter ${idx + 1}`;
        const content = lines[0].length < 60 ? lines.slice(1).join("\n") : p;
        return { title, body: content };
      });

      return {
        title: cleanTitle.replace(/\.[^/.]+$/, ""),
        sections
      };
    }
  } else {
    // parse-sop paths
    const theWhy = processedSections.map(sec => ({
      title: sec.title,
      explanation: sec.body,
      shadowNotes: `Watch a trainer run "${sec.title}". Clarify any questions about safety or tools.`,
      studyNotes: `Memorize the safety rules for "${sec.title}".`
    }));

    const shortSweet = processedSections.map(sec => {
      const bullet = sec.body.split(/[.!?]+/)[0] + ".";
      return {
        title: sec.title,
        bullets: [bullet || "Carry out tasks accurately."],
        soloAction: `Run through "${sec.title}" on your own. Have a supervisor sign off.`
      };
    });

    let script = `Welcome to the audio guide for ${cleanTitle}.\n\n`;
    let speechText = `Welcome to the audio guide for ${cleanTitle}. `;
    processedSections.forEach((sec, i) => {
      script += `[Section ${i + 1}: ${sec.title}]\n"${sec.body}"\n\n`;
      speechText += `Section ${i + 1}: ${sec.title}. ${sec.body}. `;
    });
    script += `End of training. Please take your quiz next.`;
    speechText += " End of training. Please take your quiz next.";

    const handsOn = processedSections.map(sec => ({
      title: sec.title,
      checkPoints: [`Inspect equipment for "${sec.title}"`, `Perform tasks according to standard recipe`, `Sanitize post-prep area`],
      coachCriteria: "Verify clean workspace, correct tools, safety compliance."
    }));

    return {
      theWhy,
      shortSweet,
      audible: { script, durationEst: Math.max(1, Math.round(speechText.split(" ").length / 150)), speechText },
      handsOn
    };
  }
}

// --- ONLINE MODEL RESOLVER ---
async function executeModelEngine(provider: string, endpoint: string | null, action: string, title: string, sections: any[], type?: string) {
  const contentInput = sections.map(s => `## ${s.title}\n${s.body}`).join("\n\n");
  
  let prompt = "";
  if (action === "generate-quiz") {
    prompt = `You are a training assistant. Generate a multiple choice quiz of exactly 4 questions based on the following training content.
Output ONLY a JSON array, with no other text, comments or codeblock wrappers.
Format:
[
  {
    "q": "Question text here?",
    "opts": ["Option A", "Option B", "Option C", "Option D"],
    "ans": 0
  }
]
Where "ans" is the index (0-3) of the correct option in "opts". Make options challenging and contextual.

Content:
${contentInput}`;
  } else if (action === "parse-url") {
    prompt = `You are a checklist converter. Convert the following text scraped from a webpage into a structured checklist template.
Output ONLY a JSON array representing the checklist sections, with no other text or codeblock wrappers.
Format:
[
  {
    "id": "sec_1",
    "title": "Section Title",
    "items": [
      {
        "id": "item_1",
        "text": "Task description here",
        "req": true,
        "trig": {
          "kind": "none",
          "label": null,
          "warnAbove": null
        }
      }
    ]
  }
]
Field "trig.kind" must be one of: "none" (standard checkbox), "note" (text input), "yn" (yes/no action), "temp" (temperature check), "sig" (signature block).
For "temp", include a threshold numeric value in "trig.warnAbove" if applicable.

Webpage Text:
${contentInput}`;
  } else if (action === "parse-document") {
    if (type === "recipe") {
      prompt = `You are a recipe parser. Convert the following raw text extracted from a recipe file into a structured kitchen formula.
Output ONLY a JSON object with this exact shape:
{
  "title": "Recipe Name",
  "ingredients": [
    { "id": "ing_1", "name": "Ingredient Name", "amount": 100, "unit": "g" }
  ],
  "steps": [
    "Step 1 text",
    "Step 2 text"
  ],
  "notes": "Baking temperatures, timings or specific tips here"
}

Document Text:
${contentInput}`;
    } else {
      prompt = `You are an operations analyst. Convert the following training guide text into a structured training module.
Output ONLY a JSON object with this exact shape:
{
  "title": "SOP Title",
  "sections": [
    { "title": "Chapter 1 Title", "body": "Chapter 1 detailed content..." }
  ]
}

Document Text:
${contentInput}`;
    }
  } else {
    // parse-sop
    prompt = `You are an operational systems analyst. Parse this raw training SOP into 4 distinct learning paths:
1. theWhy (explanation, shadowNotes, studyNotes)
2. shortSweet (title, bullets list, soloAction)
3. audible (script read script, durationEst, speechText)
4. handsOn (title, checkpoints list, coachCriteria)

Output ONLY a JSON object with this exact shape:
{
  "theWhy": [{"title": "...", "explanation": "...", "shadowNotes": "...", "studyNotes": "..."}],
  "shortSweet": [{"title": "...", "bullets": ["...", "..."], "soloAction": "..."}],
  "audible": { "script": "...", "durationEst": 2, "speechText": "..." },
  "handsOn": [{"title": "...", "checkPoints": ["...", "..."], "coachCriteria": "..."}]
}

SOP Content:
SOP Title: ${title}
${contentInput}`;
  }

  if (provider === "anthropic") {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY env variable");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) throw new Error(`Claude API error (${res.status}): ` + await res.text());
    const json = await res.json();
    return JSON.parse(json.content[0].text.trim());
  }

  if (provider === "openai") {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY env variable");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    if (!res.ok) throw new Error(`OpenAI API error (${res.status}): ` + await res.text());
    const json = await res.json();
    const cleanText = json.choices[0].message.content.trim().replace(/^```json/, "").replace(/```$/, "");
    return JSON.parse(cleanText);
  }

  if (provider === "ollama") {
    const host = endpoint || "http://localhost:11434";
    const res = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: prompt,
        stream: false,
        options: { temperature: 0.2 }
      })
    });

    if (!res.ok) throw new Error(`Ollama local error (${res.status}): ` + await res.text());
    const json = await res.json();
    const cleanText = json.response.trim().replace(/^```json/, "").replace(/```$/, "");
    return JSON.parse(cleanText);
  }

  throw new Error("Unsupported Model Provider configured: " + provider);
}
