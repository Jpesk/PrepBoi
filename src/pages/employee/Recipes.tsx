import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, Pill, SectionLabel, Spinner, Empty } from '../../components/ui'
import { Tooltip, GLOSSARY } from '../../components/ui/Tooltip'
import { supabase } from '../../lib/supabase'
import { Search, Scale, FileText, ChevronRight } from 'lucide-react'

interface Ingredient {
  id: string
  name: string
  amount: number
  unit: string
}

interface Recipe {
  id: string
  title: string
  category: string
  yield_amount: number
  yield_unit: string
  prep_time: string | null
  bake_time: string | null
  temperature: string | null
  ingredients: Ingredient[]
  steps: string[]
  notes: string | null
  pdf_storage_path: string | null
}

export const Recipes: React.FC = () => {
  const { T } = useTheme()
  const { profile } = useAuth()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  
  // Search and scale states
  const [search, setSearch] = useState('')
  const [scaleInput, setScaleInput] = useState<string>('')
  
  const [loading, setLoading] = useState(true)

  // 1. Fetch recipes
  useEffect(() => {
    if (!profile) return

    const loadRecipes = async () => {
      try {
        setLoading(true)
        const { data } = await supabase
          .from('recipes')
          .select('*')
          .eq('org_id', profile.org_id)
          .eq('is_active', true)

        if (data) {
          setRecipes(data)
        }
      } catch (err) {
        console.error('Failed loading recipes:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRecipes()
  }, [profile])

  // Select recipe and reset scale multiplier
  const handleSelectRecipe = (rec: Recipe) => {
    setSelectedRecipe(rec)
    setScaleInput(rec.yield_amount.toString())
  }

  // 2. Glossary Text Parsing Heuristics
  // Replaces occurrences of glossary keywords with dynamic tooltip wrappers.
  const renderTextWithGlossary = (text: string | null): React.ReactNode[] => {
    if (!text) return []

    // Build matching regex from GLOSSARY keys
    const terms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length) // longest match first
    const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi')
    
    const parts = text.split(regex)
    return parts.map((part, idx) => {
      const lower = part.toLowerCase()
      if (GLOSSARY[lower] !== undefined) {
        return <Tooltip key={idx} term={lower}>{part}</Tooltip>
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>
    })
  }

  // Multiplier math
  const scaleMultiplier = selectedRecipe 
    ? parseFloat(scaleInput) > 0 
      ? parseFloat(scaleInput) / selectedRecipe.yield_amount 
      : 1
    : 1

  // Filter recipes
  const filteredRecipes = recipes.filter(rec =>
    rec.title.toLowerCase().includes(search.toLowerCase()) ||
    rec.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading && recipes.length === 0) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* ── CATALOG VIEW ── */}
      {!selectedRecipe && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: T.t1, letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Recipe Book
              </h1>
              <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                Search standard baking and cooking formulas.
              </p>
            </div>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: 280 }}>
              <input
                type="text"
                aria-label="Search recipes"
                placeholder="Search recipes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: T.bg1,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  color: T.t1,
                  padding: '10px 16px 10px 40px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
              <Search size={16} color={T.t3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <Empty message="No recipes found." sub="Try searching for a different formula name." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {filteredRecipes.map(rec => (
                <Card key={rec.id} onClick={() => handleSelectRecipe(rec)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>{rec.category}</Pill>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: '12px 0 4px 0', fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1 }}>{rec.title}</h3>
                    <div style={{ fontSize: 12, color: T.t3 }}>Yield: {rec.yield_amount} {rec.yield_unit}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11, color: T.t3, marginTop: 'auto', borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                    <div>Prep: {rec.prep_time || 'N/A'}</div>
                    <div>Bake: {rec.bake_time || 'N/A'}</div>
                  </div>

                  <Btn v="ghost" sz="sm" style={{ width: '100%' }}>
                    View Recipe <ChevronRight size={14} />
                  </Btn>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── DETAIL VIEW ── */}
      {selectedRecipe && (
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>{selectedRecipe.category}</Pill>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1, letterSpacing: '-0.4px' }}>
                {selectedRecipe.title}
              </h2>
            </div>
            <Btn v="ghost" sz="sm" onClick={() => setSelectedRecipe(null)}>
              Back to Catalog
            </Btn>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
            <Card style={{ padding: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: T.t4, fontWeight: 800 }}>PREP TIME</span>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: T.t1 }}>{selectedRecipe.prep_time || 'N/A'}</div>
            </Card>
            <Card style={{ padding: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: T.t4, fontWeight: 800 }}>BAKE TIME</span>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: T.t1 }}>{selectedRecipe.bake_time || 'N/A'}</div>
            </Card>
            <Card style={{ padding: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: T.t4, fontWeight: 800 }}>TEMPERATURE</span>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: T.t1 }}>{selectedRecipe.temperature || 'N/A'}</div>
            </Card>
          </div>

          {/* Yield Calculator */}
          <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: T.brandLo, border: `1px solid ${T.brandBd}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Scale size={20} color={T.brand} />
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Linear Yield Scaler</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: T.t3 }}>Scale ingredient values automatically</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                aria-label={`Yield amount in ${selectedRecipe?.yield_unit}`}
                value={scaleInput}
                onChange={e => setScaleInput(e.target.value)}
                style={{
                  width: 70,
                  background: T.bg3,
                  border: `1px solid ${T.brandBd}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.t1,
                  fontSize: 14,
                  fontWeight: 800,
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: T.brand }}>{selectedRecipe.yield_unit}</span>
            </div>
          </Card>

          {/* Ingredients list */}
          <div>
            <SectionLabel>Ingredients</SectionLabel>
            <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedRecipe.ingredients.map(ing => {
                const scaledAmount = Math.round((ing.amount * scaleMultiplier) * 100) / 100
                return (
                  <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.line}`, paddingBottom: 8, fontSize: 14 }}>
                    <span style={{ color: T.t2 }}>
                      {renderTextWithGlossary(ing.name)}
                    </span>
                    <span style={{ fontWeight: 800, color: T.t1, fontFamily: "'JetBrains Mono', monospace" }}>
                      {scaledAmount} {ing.unit}
                    </span>
                  </div>
                )
              })}
            </Card>
          </div>

          {/* Cooking steps */}
          <div>
            <SectionLabel>Execution Steps</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedRecipe.steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: T.bg2, border: `1px solid ${T.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.brand, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: T.t2, paddingTop: 4 }}>
                    {renderTextWithGlossary(step)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          {selectedRecipe.notes && (
            <div>
              <SectionLabel>Baking Notes</SectionLabel>
              <Card style={{ fontStyle: 'italic', fontSize: 13, color: T.t3, lineHeight: 1.5 }}>
                {renderTextWithGlossary(selectedRecipe.notes)}
              </Card>
            </div>
          )}

          {/* PDF Viewer Embed */}
          {selectedRecipe.pdf_storage_path && (
            <div>
              <SectionLabel>Original SOP PDF Documents</SectionLabel>
              <Card style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={24} color={T.sky} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.t1 }}>Attached recipe PDF reference</div>
                  <div style={{ fontSize: 11, color: T.t4 }}>Self-hosted secure document</div>
                </div>
                <Btn v="ghost" sz="sm" onClick={() => window.open(supabase.storage.from('recipe-pdfs').getPublicUrl(selectedRecipe.pdf_storage_path!).data.publicUrl, '_blank')}>
                  Open PDF Reference
                </Btn>
              </Card>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
export default Recipes
