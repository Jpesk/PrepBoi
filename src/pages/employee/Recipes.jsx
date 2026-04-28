import { useState, useEffect } from 'react'
import { useTheme }  from '../../hooks/useTheme'
import { useAuth }   from '../../hooks/useAuth'
import { supabase }  from '../../lib/supabase'
import { Card, Pill, Spinner, Empty } from '../../components/ui'

// ── Fraction formatter ─────────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return ''
  if (n === Math.floor(n)) return String(n)
  const whole = Math.floor(n), frac = n - whole
  const map = [[.125,'⅛'],[.25,'¼'],[.333,'⅓'],[.5,'½'],[.667,'⅔'],[.75,'¾'],[.875,'⅞']]
  const hit = map.find(([v]) => Math.abs(v-frac) < 0.04)
  if (hit) return whole ? `${whole} ${hit[1]}` : hit[1]
  return n.toFixed(2).replace(/\.?0+$/,'')
}

// ── Batch scaler ───────────────────────────────────────────────────────────────
function BatchScaler({ recipe }) {
  const { T }     = useTheme()
  const [mult, setMult] = useState(1)
  const presets   = [0.5, 1, 1.5, 2, 3, 4]

  return (
    <div style={{ background:T.bg2, border:`1.5px solid ${T.line}`,
      borderRadius:14, padding:16, marginTop:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:T.t1 }}>
          Batch Scale
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:T.amber }}>
          {mult}× → {fmt(recipe.yield_amount * mult)} {recipe.yield_unit}
        </div>
      </div>

      {/* Preset buttons */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {presets.map(p => (
          <button key={p} onClick={() => setMult(p)}
            style={{ padding:'9px 16px', borderRadius:8, fontFamily:"'DM Mono',monospace",
              fontWeight:700, fontSize:14, cursor:'pointer', transition:'all .15s',
              minWidth:52, textAlign:'center',
              border:`1.5px solid ${mult===p?T.amber:T.line}`,
              background:mult===p?T.amberLo:T.bg3,
              color:mult===p?T.amber:T.t3 }}>
            {p}×
          </button>
        ))}
        <input type="number" min="0.25" step="0.25" value={mult}
          onChange={e => setMult(parseFloat(e.target.value) || 1)}
          style={{ width:64, background:T.bg3, border:`1.5px solid ${T.amberBd}`,
            borderRadius:8, color:T.amber, padding:'9px 10px', fontSize:14,
            fontFamily:"'DM Mono',monospace", fontWeight:700, outline:'none', textAlign:'center' }}/>
      </div>

      {/* Ingredient table */}
      <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', padding:'8px 14px', background:T.bg4 }}>
          <div style={{ flex:2, fontSize:10, fontWeight:800, color:T.t4, textTransform:'uppercase', letterSpacing:'1px' }}>Ingredient</div>
          <div style={{ flex:1, fontSize:10, fontWeight:800, color:T.t4, textTransform:'uppercase', letterSpacing:'1px', textAlign:'right' }}>Qty</div>
          <div style={{ width:44, fontSize:10, fontWeight:800, color:T.t4, textTransform:'uppercase', letterSpacing:'1px', textAlign:'right' }}>Unit</div>
        </div>
        {(recipe.ingredients ?? []).map((ing, i) => (
          <div key={ing.id ?? i}
            style={{ display:'flex', alignItems:'center', padding:'12px 14px',
              background:i%2===0?T.bg2:T.bg3, borderTop:`1px solid ${T.line}` }}>
            <div style={{ flex:2, fontSize:15, color:T.t1 }}>{ing.name}</div>
            <div style={{ flex:1, fontFamily:"'DM Mono',monospace", fontSize:16,
              fontWeight:700, color:T.amber, textAlign:'right' }}>{fmt(ing.amount * mult)}</div>
            <div style={{ width:44, fontSize:13, color:T.t4, textAlign:'right' }}>{ing.unit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Recipe detail ──────────────────────────────────────────────────────────────
function RecipeDetail({ recipe, onBack }) {
  const { T } = useTheme()

  return (
    <div>
      <div style={{ position:'sticky', top:0, zIndex:20, background:T.bg1, borderBottom:`1px solid ${T.line}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
          <button onClick={onBack}
            style={{ width:40, height:40, borderRadius:10, background:T.bg3, border:`1px solid ${T.line}`,
              color:T.t2, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:T.t1 }}>
              {recipe.title}
            </div>
            <div style={{ fontSize:12, color:T.t3 }}>
              Yields {recipe.yield_amount} {recipe.yield_unit}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 100px' }}>
        {/* Meta pills */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
          {recipe.prep_time && (
            <Pill fg={T.sky} bg={T.skyLo} bd={T.skyBd}>Prep {recipe.prep_time}</Pill>
          )}
          {recipe.bake_time && recipe.bake_time !== 'N/A' && (
            <Pill fg={T.amber} bg={T.amberLo} bd={T.amberBd}>Bake {recipe.bake_time}</Pill>
          )}
          {recipe.temperature && recipe.temperature !== 'N/A' && (
            <Pill fg={T.red} bg={T.redLo} bd={T.redBd}>{recipe.temperature}</Pill>
          )}
        </div>

        <BatchScaler recipe={recipe} />

        {/* Method */}
        {(recipe.steps ?? []).length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.t4, textTransform:'uppercase',
              letterSpacing:'1.2px', marginBottom:14 }}>Method</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {(recipe.steps ?? []).map((step, i) => (
                <div key={i} style={{ display:'flex', gap:14, background:T.bg2,
                  border:`1.5px solid ${T.line}`, borderRadius:12, padding:'16px' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:T.amberLo,
                    border:`1.5px solid ${T.amberBd}`, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:13, fontWeight:800, color:T.amber,
                    flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <div style={{ fontSize:15, color:T.t2, lineHeight:1.65 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chef notes */}
        {recipe.notes && (
          <div style={{ marginTop:16, background:T.amberLo, border:`1.5px solid ${T.amberBd}`,
            borderRadius:14, padding:'16px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:T.amber, textTransform:'uppercase',
              letterSpacing:'1px', marginBottom:8 }}>Chef Notes</div>
            <div style={{ fontSize:14, color:T.amber, lineHeight:1.7 }}>{recipe.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Recipes page ───────────────────────────────────────────────────────────────
export default function Recipes() {
  const { T }       = useTheme()
  const { profile } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [active,  setActive]  = useState(null)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    if (!profile) return
    supabase.from('recipes')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .order('title')
      .then(({ data }) => { setRecipes(data ?? []); setLoading(false) })
  }, [profile?.id])

  if (active) return <RecipeDetail recipe={active} onBack={() => setActive(null)} />
  if (loading) return <Spinner />

  const catEmoji = { cookie:'🍪', specialty:'✨', bread:'🍞', sauce:'🍶', dessert:'🍰' }

  const visible = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding:'20px 16px' }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900,
        color:T.t1, letterSpacing:'-0.8px', marginBottom:4 }}>Recipes</div>
      <div style={{ fontSize:14, color:T.t3, marginBottom:20 }}>Scale any recipe for your batch</div>

      {/* Search */}
      <input type="search" placeholder="Search recipes…" value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width:'100%', background:T.bg3, border:`1.5px solid ${T.line}`,
          borderRadius:10, color:T.t1, padding:'12px 16px', fontSize:14,
          fontFamily:'inherit', outline:'none', marginBottom:16 }}/>

      {visible.length === 0 && recipes.length === 0 && (
        <Empty icon="🍳" message="No recipes yet"
          sub="Your manager will add recipes here for you to reference." />
      )}

      {visible.length === 0 && recipes.length > 0 && (
        <Empty icon="🔍" message="No results" sub={`Nothing matches "${search}"`} />
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {visible.map(r => (
          <button key={r.id} onClick={() => setActive(r)}
            style={{ width:'100%', textAlign:'left', background:T.bg2,
              border:`1.5px solid ${T.line}`, borderRadius:14, overflow:'hidden',
              cursor:'pointer', WebkitTapHighlightColor:'transparent', padding:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'18px 18px' }}>
              <div style={{ width:54, height:54, borderRadius:12, background:T.amberLo,
                border:`1.5px solid ${T.amberBd}`, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:26, flexShrink:0 }}>
                {catEmoji[r.category] ?? '🍽'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900,
                  color:T.t1, letterSpacing:'-0.3px', marginBottom:4 }}>{r.title}</div>
                <div style={{ fontSize:12, color:T.t3 }}>
                  Yields {r.yield_amount} {r.yield_unit} · {(r.ingredients ?? []).length} ingredients
                </div>
                <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                  {r.prep_time  && <Pill fg={T.sky}  bg={T.skyLo}  bd={T.skyBd}>Prep {r.prep_time}</Pill>}
                  {r.bake_time && r.bake_time!=='N/A' && <Pill fg={T.amber} bg={T.amberLo} bd={T.amberBd}>Bake {r.bake_time}</Pill>}
                </div>
              </div>
              <div style={{ fontSize:20, color:T.t4 }}>›</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
