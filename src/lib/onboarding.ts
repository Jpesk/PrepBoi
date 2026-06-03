/// <reference types="vite/client" />
import { supabase } from './supabase'
import { generateLocalQuiz, generateRecipeQuiz, generateRecipeBookQuiz, parseLocalPaths, SopSection, QuizQuestion, ParsedPaths } from './onboarding-local'

/**
 * High-reliability service resolver for PrepPro.
 * Routes parsing or quiz creation requests to the Supabase Edge Function
 * or falls back to client-side heuristic rules.
 */
export async function getQuizQuestions(
  sopOrRecipe: { id: string; title: string; sections?: SopSection[]; quiz_questions?: QuizQuestion[] },
  type: 'sop' | 'recipe' | 'book' = 'sop'
): Promise<QuizQuestion[]> {
  // 1. Return cached questions if available
  if (sopOrRecipe.quiz_questions && sopOrRecipe.quiz_questions.length > 0) {
    return sopOrRecipe.quiz_questions
  }

  const fallbackLocalQuiz = async () => {
    if (type === 'recipe') {
      return generateRecipeQuiz(sopOrRecipe as any)
    }
    if (type === 'book') {
      try {
        const { data: recs } = await supabase
          .from('recipes')
          .select('*')
          .eq('category', sopOrRecipe.title)
          .eq('is_active', true)
        return generateRecipeBookQuiz(sopOrRecipe.title, recs || [])
      } catch {
        return generateRecipeBookQuiz(sopOrRecipe.title, [])
      }
    }
    return generateLocalQuiz(sopOrRecipe.title, sopOrRecipe.sections ?? [])
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('No session active. Resolving local rules.')
      return await fallbackLocalQuiz()
    }

    // Fetch org service settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.user.id)
      .single()

    if (!profile) {
      return await fallbackLocalQuiz()
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('api_provider')
      .eq('id', profile.org_id)
      .single()

    const provider = org?.api_provider || 'mock'

    if (provider === 'mock') {
      return await fallbackLocalQuiz()
    }

    // Otherwise, call the Edge Function helper
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/preppro-helper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: sopOrRecipe.id,
        type,
        title: sopOrRecipe.title,
        sections: sopOrRecipe.sections ?? [],
        action: 'generate-quiz',
      }),
    })

    if (!res.ok) {
      throw new Error(`Edge Function returned error ${res.status}`)
    }

    const data = await res.json()
    return data
  } catch (err) {
    console.warn('Service quiz generation failed. Falling back to rule-based generation:', err)
    return await fallbackLocalQuiz()
  }
}

/**
 * Fetch parsed onboarding paths for an SOP.
 */
export async function getParsedOnboardingPaths(
  sop: { id: string; title: string; sections: SopSection[] }
): Promise<ParsedPaths> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return parseLocalPaths(sop.title, sop.sections)
    }

    // Fetch org service settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.user.id)
      .single()

    if (!profile) {
      return parseLocalPaths(sop.title, sop.sections)
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('api_provider')
      .eq('id', profile.org_id)
      .single()

    const provider = org?.api_provider || 'mock'

    if (provider === 'mock') {
      return parseLocalPaths(sop.title, sop.sections)
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/preppro-helper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: sop.id,
        type: 'sop',
        title: sop.title,
        sections: sop.sections,
        action: 'parse-sop',
      }),
    })

    if (!res.ok) {
      throw new Error(`Edge Function returned error ${res.status}`)
    }

    const data = await res.json()
    return data
  } catch (err) {
    console.warn('Service SOP parsing failed. Falling back to local rules:', err)
    return parseLocalPaths(sop.title, sop.sections)
  }
}

/**
 * Fetch and parse a checklist from an external URL
 */
export async function parseChecklistUrl(url: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Authentication required for URL parsing.')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    // Generate beautiful mock checklist structure based on the URL host
    await new Promise(resolve => setTimeout(resolve, 1200)) // simulate extraction lag
    const domain = new URL(url).hostname.replace('www.', '') || 'Tally Checklist'
    return [
      {
        id: `sec_${Date.now()}_1`,
        title: `Imported Audits (${domain})`,
        items: [
          { id: `item_${Date.now()}_1`, text: "Check refrigeration temperatures across all stations", req: true, trig: { kind: "temp", warnAbove: 41 } },
          { id: `item_${Date.now()}_2`, text: "Verify that all prep tables and utensils are thoroughly sanitized", req: true, trig: { kind: "none" } },
          { id: `item_${Date.now()}_3`, text: "Record entry logs and count of current operational handoff", req: false, trig: { kind: "number", label: "Counts" } },
          { id: `item_${Date.now()}_4`, text: "Confirm checklist completion with manager co-signature", req: true, trig: { kind: "sig" } }
        ]
      }
    ]
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/preppro-helper`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      url,
      action: 'parse-url',
    }),
  })

  if (!res.ok) throw new Error(`Edge Function returned error ${res.status}`)
  return await res.json()
}

/**
 * Upload and parse a Document/PDF for SOPs or Recipes
 */
export async function parseDocumentUpload(file: File, type: 'sop' | 'recipe') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Authentication required for document parsing.')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    await new Promise(resolve => setTimeout(resolve, 1500)) // simulate extraction lag
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "")

    if (type === 'recipe') {
      return {
        title: cleanTitle || "Premium Gourmet Recipe",
        ingredients: [
          { id: `ing_${Date.now()}_1`, name: "Premium Flour", amount: 500, unit: "g" },
          { id: `ing_${Date.now()}_2`, name: "Yeast", amount: 7, unit: "g" },
          { id: `ing_${Date.now()}_3`, name: "Warm Water", amount: 350, unit: "ml" },
          { id: `ing_${Date.now()}_4`, name: "Sea Salt", amount: 10, unit: "g" }
        ],
        steps: [
          "Weigh ingredients precisely using a digital kitchen scale.",
          "Combine flour, yeast, salt, and water in a large mixing bowl.",
          "Knead the mixture for 10 minutes until a smooth dough forms.",
          "Allow the dough to rise in a warm area for 1 hour or until doubled in size.",
          "Shape and bake at 425°F (218°C) for 25-30 minutes until golden brown."
        ],
        notes: "Ensure the water is between 100°F and 110°F to activate yeast correctly."
      }
    } else {
      return {
        title: cleanTitle || "Standard Operating Procedure",
        sections: [
          {
            title: "1. Safety & Hygiene Protocols",
            body: "All team members must wash hands thoroughly for 20 seconds before starting operations. Protective gloves and hairnets are mandatory at all prep stations."
          },
          {
            title: "2. Equipment Sanitization Steps",
            body: "Prep surfaces must be wiped down with food-safe sanitizer every 2 hours. Refrigeration units must maintain temperatures below 41°F."
          },
          {
            title: "3. Handoff & Logbook Updates",
            body: "Complete all digital shift tasks, sign off the PIN pad, and log any deviations in the manager logbook prior to finishing the shift."
          }
        ]
      }
    }
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  formData.append('action', 'parse-document')

  const res = await fetch(`${supabaseUrl}/functions/v1/preppro-helper`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  if (!res.ok) throw new Error(`Edge Function returned error ${res.status}`)
  return await res.json()
}
