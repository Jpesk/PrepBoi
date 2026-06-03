import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Card, Pill, SectionLabel, Spinner, Toast } from '../../components/ui'
import { getQuizQuestions, getParsedOnboardingPaths } from '../../lib/onboarding'
import { playAudibleText, stopAudibleText, ParsedPaths } from '../../lib/onboarding-local'
import { supabase } from '../../lib/supabase'
import { 
  Award, Play, Square, Eye, FileText, Volume2, HardHat, Check, 
  HelpCircle, ChevronRight, RefreshCw, BookOpen, Utensils, 
  Book, ThumbsUp, ThumbsDown, Sparkles, ChevronLeft
} from 'lucide-react'
import confetti from 'canvas-confetti'

export const Training: React.FC = () => {
  const { T } = useTheme()
  const { profile, updateProfile } = useAuth()

  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  
  // Learning paths state
  const [activeTab, setActiveTab] = useState<'why' | 'short' | 'audio' | 'hands'>('why')
  const [paths, setPaths] = useState<ParsedPaths | null>(null)
  const [whyOpen, setWhyOpen] = useState<Record<number, boolean>>({})
  const [handsOnChecked, setHandsOnChecked] = useState<Record<string, boolean>>({})
  const [coachSignedOff, setCoachSignedOff] = useState<Record<number, boolean>>({})
  
  // Audio playback state
  const [speaking, setSpeaking] = useState(false)

  // Quiz / study states
  const [quizMode, setQuizMode] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAns, setSelectedAns] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [studyMethod, setStudyMethod] = useState<'flashcard' | 'exam'>('exam')
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)

  // Recipe study states
  const [bookRecipes, setBookRecipes] = useState<any[]>([])
  const [selectedRecipeToReview, setSelectedRecipeToReview] = useState<any | null>(null)
  const [recipeStepsChecked, setRecipeStepsChecked] = useState<Record<string, boolean>>({})

  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // 1. Fetch employee assignments
  useEffect(() => {
    if (!profile) return

    const loadTraining = async () => {
      try {
        setLoading(true)
        const { data } = await supabase
          .from('training_assignments')
          .select(`
            id,
            completed_at,
            due_date,
            quiz_score,
            sop_id,
            recipe_id,
            recipe_book,
            sops (
              id,
              title,
              emoji,
              category,
              read_minutes,
              sections,
              quiz_questions
            ),
            recipes (
              id,
              title,
              category,
              yield_amount,
              yield_unit,
              prep_time,
              bake_time,
              temperature,
              ingredients,
              steps,
              notes,
              quiz_questions
            )
          `)
          .eq('assigned_to', profile.id)

        if (data) {
          setAssignments(data)
        }
      } catch (err) {
        console.error('Failed loading assignments:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTraining()
    return () => {
      stopAudibleText()
    }
  }, [profile])

  // 2. Select assignment (SOP, Recipe, or Recipe Book)
  const handleStartTraining = async (assign: any) => {
    setSelectedAssignment(assign)
    setActiveTab('why')
    setQuizMode(false)
    setQuizFinished(false)
    setPaths(null)
    stopAudibleText()
    setSpeaking(false)
    setSelectedRecipeToReview(null)
    setRecipeStepsChecked({})

    if (assign.sop_id) {
      try {
        setLoading(true)
        const data = await getParsedOnboardingPaths(assign.sops)
        setPaths(data)
      } catch (err) {
        console.error('Failed parsing onboarding paths:', err)
      } finally {
        setLoading(false)
      }
    } else if (assign.recipe_book) {
      try {
        setLoading(true)
        const { data } = await supabase
          .from('recipes')
          .eq('category', assign.recipe_book)
          .eq('is_active', true)
        setBookRecipes(data || [])
      } catch (err) {
        console.error('Failed loading recipe book:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // 3. Audio TTS Narration Controls
  const toggleAudio = () => {
    if (speaking) {
      stopAudibleText()
      setSpeaking(false)
    } else if (paths?.audible.speechText) {
      setSpeaking(true)
      playAudibleText(
        paths.audible.speechText,
        (_charIndex) => {
          // Callback invoked on speech progress
        },
        () => {
          setSpeaking(false)
        }
      )
    }
  }

  // 4. Start Quiz or Flashcards
  const handleStartQuiz = async (method: 'flashcard' | 'exam' = 'exam') => {
    if (!selectedAssignment) return
    try {
      setLoading(true)
      setStudyMethod(method)
      setFlashcardFlipped(false)
      
      let list: any[] = []
      if (selectedAssignment.sop_id) {
        list = await getQuizQuestions(selectedAssignment.sops, 'sop')
      } else if (selectedAssignment.recipe_id) {
        list = await getQuizQuestions(selectedAssignment.recipes, 'recipe')
      } else if (selectedAssignment.recipe_book) {
        list = await getQuizQuestions({ id: 'book', title: selectedAssignment.recipe_book }, 'book')
      }
      
      setQuestions(list)
      setQuizMode(true)
      setCurrentQIndex(0)
      setSelectedAns(null)
      setScore(0)
      setQuizFinished(false)
    } catch (err) {
      console.error('Failed fetching quiz:', err)
    } finally {
      setLoading(false)
    }
  }

  // 5. Quiz answer selection (Exam Mode)
  const handleAnswerSelect = (ansIdx: number) => {
    if (selectedAns !== null) return // Answer already lock-in
    setSelectedAns(ansIdx)
    const isCorrect = ansIdx === questions[currentQIndex].ans
    const newScore = isCorrect ? score + 1 : score

    if (isCorrect) {
      setScore(prev => prev + 1)
    }

    // Go to next question after 1.5 seconds delay
    setTimeout(() => {
      if (currentQIndex + 1 < questions.length) {
        setCurrentQIndex(prev => prev + 1)
        setSelectedAns(null)
      } else {
        finishQuiz(newScore)
      }
    }, 1500)
  }

  // 5.1 Flashcard click (Flashcard Mode)
  const handleFlashcardClick = (correct: boolean) => {
    const newScore = correct ? score + 1 : score
    if (correct) {
      setScore(prev => prev + 1)
    }
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1)
      setFlashcardFlipped(false)
    } else {
      finishQuiz(newScore)
    }
  }

  // 6. Finish quiz & submit score to DB
  const finishQuiz = async (finalScore: number) => {
    setQuizFinished(true)
    const finalPct = Math.round((finalScore / questions.length) * 100)

    try {
      const isPassed = finalPct >= 80 // 80% to pass
      const compDate = isPassed ? new Date().toISOString() : null

      // Save score
      await supabase
        .from('training_assignments')
        .update({
          quiz_score: finalPct,
          completed_at: compDate
        })
        .eq('id', selectedAssignment.id)

      // Award treats on 100% score
      if (finalPct === 100 && profile?.pet_status) {
        const pet = { ...profile.pet_status }
        pet.treats += 1
        pet.exp += 50
        
        const expNeeded = pet.level * 100
        let levelUp = false
        if (pet.exp >= expNeeded) {
          pet.exp -= expNeeded
          pet.level += 1
          levelUp = true
        }

        await updateProfile({ pet_status: pet })

        if (levelUp) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.65 } })
        } else {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } })
        }
        setToastMsg('Perfect Score! Earmarked +1 treat for your pet.')
      }
    } catch (err) {
      console.error('Failed submitting quiz results:', err)
    }
  }

  const handleRetakeQuiz = () => {
    setQuizMode(true)
    setCurrentQIndex(0)
    setSelectedAns(null)
    setFlashcardFlipped(false)
    setScore(0)
    setQuizFinished(false)
  }

  const renderRecipeDetails = (recipe: any, showBackButton?: () => void) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {showBackButton && (
          <Btn v="ghost" sz="sm" onClick={showBackButton} style={{ alignSelf: 'flex-start' }}>
            <ChevronLeft size={14} style={{ marginRight: 6 }} /> Back to Recipe Book
          </Btn>
        )}

        {/* Recipe Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yield</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginTop: 4 }}>{recipe.yield_amount} {recipe.yield_unit}</div>
          </div>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prep Time</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginTop: 4 }}>{recipe.prep_time || 'N/A'}</div>
          </div>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bake Time</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginTop: 4 }}>{recipe.bake_time || '0m'}</div>
          </div>
          <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Temperature</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginTop: 4 }}>{recipe.temperature || 'N/A'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Ingredients */}
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.t1, borderBottom: `1px solid ${T.line}`, paddingBottom: 10, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Utensils size={16} color={T.sky} /> Ingredients
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(!recipe.ingredients || recipe.ingredients.length === 0) ? (
                <div style={{ color: T.t3, fontSize: 13 }}>No ingredients specified.</div>
              ) : (
                recipe.ingredients.map((ing: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: T.bg3, padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
                    <span style={{ color: T.t2 }}>{ing.name}</span>
                    <span style={{ fontWeight: 700, color: T.sky }}>{ing.amount} {ing.unit}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Preparation Steps */}
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.t1, borderBottom: `1px solid ${T.line}`, paddingBottom: 10, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color={T.lime} /> Instructions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(!recipe.steps || recipe.steps.length === 0) ? (
                <div style={{ color: T.t3, fontSize: 13 }}>No steps specified.</div>
              ) : (
                recipe.steps.map((step: string, idx: number) => {
                  const checkKey = `${recipe.id}_step_${idx}`
                  const isChecked = !!recipeStepsChecked[checkKey]
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setRecipeStepsChecked(prev => ({ ...prev, [checkKey]: !prev[checkKey] }))}
                      style={{ display: 'flex', gap: 12, cursor: 'pointer', background: isChecked ? T.limeLo : 'transparent', padding: 8, borderRadius: 6, transition: 'all 0.15s' }}
                    >
                      <div style={{ 
                        width: 18, 
                        height: 18, 
                        borderRadius: 4, 
                        border: `2px solid ${isChecked ? T.lime : T.line2}`, 
                        background: isChecked ? T.limeLo : T.bg3, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginTop: 2, 
                        flexShrink: 0 
                      }}>
                        {isChecked && <Check size={12} color={T.lime} />}
                      </div>
                      <div style={{ fontSize: 13, color: isChecked ? T.t4 : T.t2, textDecoration: isChecked ? 'line-through' : 'none', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 700, marginRight: 6 }}>{idx + 1}.</span>
                        {step}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {recipe.notes && (
          <Card style={{ borderLeft: `4px solid ${T.amber}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.amber, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Chef's Notes & Warnings
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.t2, lineHeight: 1.5 }}>
              {recipe.notes}
            </p>
          </Card>
        )}
      </div>
    )
  }

  if (loading && assignments.length === 0) return <Spinner />

  const totalSops = assignments.filter(a => a.sop_id).length
  const completedSops = assignments.filter(a => a.sop_id && a.completed_at).length
  const totalRecipes = assignments.filter(a => a.recipe_id).length
  const completedRecipes = assignments.filter(a => a.recipe_id && a.completed_at).length
  const totalBooks = assignments.filter(a => a.recipe_book).length
  const completedBooks = assignments.filter(a => a.recipe_book && a.completed_at).length

  const overallTotal = totalSops + totalRecipes + totalBooks
  const overallCompleted = completedSops + completedRecipes + completedBooks
  const percentCompleted = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* ── LIST VIEW ── */}
      {!selectedAssignment && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: T.t1, letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Training Center
              </h1>
              <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                Complete your SOP, Recipe, and Recipe Book training modules to earn treats.
              </p>
            </div>
            {overallTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: T.bg2, padding: '12px 20px', borderRadius: 12, border: `1px solid ${T.line}` }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.brand, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Progress</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, marginTop: 2 }}>{overallCompleted} / {overallTotal} Passed</div>
                </div>
                <div style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', background: T.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: T.brand, border: `2px solid ${T.line2}` }}>
                  {percentCompleted}%
                </div>
              </div>
            )}
          </div>

          {/* Group 1: SOPs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.line}`, paddingBottom: 8, marginTop: 8 }}>
              <BookOpen size={18} color={T.brand} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.t1, margin: 0 }}>Assigned SOPs</h3>
              <Pill fg={T.t3} bg={T.bg2} bd={T.line}>{completedSops} / {totalSops}</Pill>
            </div>
            {assignments.filter(a => a.sop_id).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: T.t3, background: T.bg2, borderRadius: 8, border: `1px dashed ${T.line}` }}>
                No SOPs currently assigned.
              </div>
            ) : (
              assignments.filter(a => a.sop_id).map(assign => {
                const sop = assign.sops
                if (!sop) return null
                const isCompleted = !!assign.completed_at
                return (
                  <Card key={assign.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ fontSize: 32 }}>{sop.emoji || '📄'}</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{sop.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Pill fg={T.brand} bg={T.brandLo} bd={T.brandBd}>{sop.category}</Pill>
                          <span style={{ fontSize: 12, color: T.t3 }}>{sop.read_minutes} min read</span>
                          {isCompleted && (
                            <span style={{ color: T.lime, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={12} /> PASSED ({assign.quiz_score}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Btn v={isCompleted ? 'ghost' : 'brand'} sz="sm" onClick={() => handleStartTraining(assign)}>
                      {isCompleted ? 'Review Class' : 'Begin Class'} <ChevronRight size={14} />
                    </Btn>
                  </Card>
                )
              })
            )}
          </div>

          {/* Group 2: Recipes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.line}`, paddingBottom: 8, marginTop: 12 }}>
              <Utensils size={18} color={T.sky} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.t1, margin: 0 }}>Assigned Recipes</h3>
              <Pill fg={T.t3} bg={T.bg2} bd={T.line}>{completedRecipes} / {totalRecipes}</Pill>
            </div>
            {assignments.filter(a => a.recipe_id).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: T.t3, background: T.bg2, borderRadius: 8, border: `1px dashed ${T.line}` }}>
                No recipes currently assigned.
              </div>
            ) : (
              assignments.filter(a => a.recipe_id).map(assign => {
                const recipe = assign.recipes
                if (!recipe) return null
                const isCompleted = !!assign.completed_at
                return (
                  <Card key={assign.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: T.skyLo, border: `1px solid ${T.skyBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        🍳
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{recipe.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Pill fg={T.sky} bg={T.skyLo} bd={T.skyBd}>{recipe.category}</Pill>
                          <span style={{ fontSize: 12, color: T.t3 }}>Prep: {recipe.prep_time || 'N/A'}</span>
                          {isCompleted && (
                            <span style={{ color: T.lime, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={12} /> PASSED ({assign.quiz_score}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Btn v={isCompleted ? 'ghost' : 'brand'} sz="sm" onClick={() => handleStartTraining(assign)}>
                      {isCompleted ? 'Review Recipe' : 'Study Recipe'} <ChevronRight size={14} />
                    </Btn>
                  </Card>
                )
              })
            )}
          </div>

          {/* Group 3: Recipe Books */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.line}`, paddingBottom: 8, marginTop: 12 }}>
              <Book size={18} color={T.amber} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.t1, margin: 0 }}>Assigned Recipe Books</h3>
              <Pill fg={T.t3} bg={T.bg2} bd={T.line}>{completedBooks} / {totalBooks}</Pill>
            </div>
            {assignments.filter(a => a.recipe_book).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: T.t3, background: T.bg2, borderRadius: 8, border: `1px dashed ${T.line}` }}>
                No recipe books currently assigned.
              </div>
            ) : (
              assignments.filter(a => a.recipe_book).map(assign => {
                const bookCategory = assign.recipe_book
                const isCompleted = !!assign.completed_at
                return (
                  <Card key={assign.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: T.amberLo, border: `1px solid ${T.amberBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        📖
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{bookCategory} Recipe Book</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Pill fg={T.amber} bg={T.amberLo} bd={T.amberBd}>Recipe Book</Pill>
                          <span style={{ fontSize: 12, color: T.t3 }}>Category: {bookCategory}</span>
                          {isCompleted && (
                            <span style={{ color: T.lime, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={12} /> PASSED ({assign.quiz_score}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Btn v={isCompleted ? 'ghost' : 'brand'} sz="sm" onClick={() => handleStartTraining(assign)}>
                      {isCompleted ? 'Review Book' : 'Open Book'} <ChevronRight size={14} />
                    </Btn>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ── CLASS VIEW ── */}
      {selectedAssignment && !quizMode && (
        <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Back Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 36 }}>
                {selectedAssignment.sop_id ? selectedAssignment.sops?.emoji : selectedAssignment.recipe_id ? '🍳' : '📖'}
              </span>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1, letterSpacing: '-0.3px' }}>
                  {selectedAssignment.sop_id 
                    ? selectedAssignment.sops?.title 
                    : selectedAssignment.recipe_id 
                      ? selectedAssignment.recipes?.title 
                      : `${selectedAssignment.recipe_book} Recipe Book`
                  }
                </h2>
                <span style={{ fontSize: 12, color: T.t3 }}>
                  {selectedAssignment.sop_id 
                    ? 'Onboarding Course Paths' 
                    : selectedAssignment.recipe_id 
                      ? 'Interactive Recipe Manual' 
                      : 'Recipe Book Collection'
                  }
                </span>
              </div>
            </div>
            <Btn v="ghost" sz="sm" onClick={() => { stopAudibleText(); setSelectedAssignment(null) }}>
              Back to List
            </Btn>
          </div>

          {/* RENDER SOP LAYOUT */}
          {selectedAssignment.sop_id && (
            <>
              {/* Learning Path Segmented Control */}
              <div style={{ display: 'inline-flex', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 4, gap: 2, width: '100%' }}>
                {([
                  { key: 'why', icon: <Eye size={14} />, label: 'The Why' },
                  { key: 'short', icon: <FileText size={14} />, label: 'Short & Sweet' },
                  { key: 'audio', icon: <Volume2 size={14} />, label: 'Audible' },
                  { key: 'hands', icon: <HardHat size={14} />, label: 'Hands-On' },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      flex: 1,
                      background: activeTab === key ? T.bg0 : 'transparent',
                      boxShadow: activeTab === key ? `0 1px 3px rgba(0,0,0,0.1)` : 'none',
                      border: `1px solid ${activeTab === key ? T.line : 'transparent'}`,
                      color: activeTab === key ? T.brand : T.t3,
                      padding: '10px 8px',
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: activeTab === key ? 700 : 500,
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Active Tab Panel */}
              {paths ? (
                <div style={{ minHeight: 300 }}>
                  {/* TAB 1: THE WHY */}
                  {activeTab === 'why' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {paths.theWhy.map((item, idx) => (
                        <Card key={idx}>
                          <SectionLabel>{item.title}</SectionLabel>
                          <p style={{ lineHeight: 1.6, color: T.t2, fontSize: 14 }}>{item.explanation}</p>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, borderTop: `1px solid ${T.line}`, paddingTop: 16 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 900, color: T.sky, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shadowing Practice</div>
                              <div style={{ fontSize: 12, color: T.t3, marginTop: 4, lineHeight: 1.5 }}>{item.shadowNotes}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 900, color: T.brand, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Study Guide</div>
                              <div style={{ fontSize: 12, color: T.t3, marginTop: 4, lineHeight: 1.5 }}>{item.studyNotes}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* TAB 2: SHORT & SWEET */}
                  {activeTab === 'short' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {paths.shortSweet.map((item, idx) => (
                        <Card key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <SectionLabel>{item.title}</SectionLabel>
                          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
                            {item.bullets.map((b, bIdx) => (
                              <li key={bIdx} style={{ fontSize: 14, color: T.t2, lineHeight: 1.5 }}>{b}</li>
                            ))}
                          </ul>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
                            <Btn
                              v="ghost"
                              sz="xs"
                              onClick={() => setWhyOpen(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              style={{ alignSelf: 'flex-start' }}
                            >
                              {whyOpen[idx] ? 'Hide explanation' : 'Why does this matter?'}
                            </Btn>
                            {whyOpen[idx] && paths.theWhy[idx] && (
                              <div style={{ padding: 12, background: T.bg3, borderLeft: `3px solid ${T.brand}`, borderRadius: 4, fontSize: 13, color: T.t2, lineHeight: 1.6 }}>
                                {paths.theWhy[idx].explanation}
                              </div>
                            )}
                          </div>

                          <div style={{ marginTop: 4, padding: 12, borderRadius: 4, background: T.brandLo, border: `1px solid ${T.brandBd}`, fontSize: 12, color: T.brand, fontWeight: 700 }}>
                            Solo Exercise: {item.soloAction}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* TAB 3: AUDIBLE */}
                  {activeTab === 'audio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <Card style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                          <div style={{ width: 64, height: 64, borderRadius: 4, background: T.brandLo, border: `1px solid ${T.brandBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Volume2 size={28} color={T.brand} />
                          </div>
                          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1 }}>Audible Course Reader</h3>
                          <span style={{ fontSize: 12, color: T.t3 }}>Estimated listening time: {paths.audible.durationEst} minutes</span>
                        </div>

                        <Btn v={speaking ? 'danger' : 'brand'} sz="md" onClick={toggleAudio} style={{ width: 220 }}>
                          {speaking ? (
                            <>
                              <Square size={16} fill="#fff" /> Stop Narrator
                            </>
                          ) : (
                            <>
                              <Play size={16} fill="#fff" /> Play Narrator
                            </>
                          )}
                        </Btn>

                        <div style={{ width: '100%', height: 1.5, background: T.line }} />

                        {/* Reading script window */}
                        <div
                          style={{
                            width: '100%',
                            background: T.bg3,
                            border: `1px solid ${T.line}`,
                            borderRadius: 4,
                            padding: 20,
                            maxHeight: 200,
                            overflowY: 'auto',
                            textAlign: 'left',
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: T.t3,
                            fontFamily: "'JetBrains Mono', monospace",
                            whiteSpace: 'pre-line'
                          }}
                        >
                          {paths.audible.script}
                        </div>
                      </Card>

                      {/* Visual walkthrough preview */}
                      <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: T.brand, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visual Training Walkthrough</span>
                          <span style={{ fontSize: 10, color: T.t4 }}>Optional video aid for audible path</span>
                        </div>
                        <div style={{ height: 160, background: T.bg0, border: `1px dashed ${T.line2}`, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', zIndex: 5 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.brandLo, border: `1px solid ${T.brandBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Play size={18} color={T.brand} fill={T.brand} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>Demonstration Video</div>
                              <div style={{ fontSize: 11, color: T.t3 }}>Standard procedures visual guide</div>
                            </div>
                          </div>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(180deg, transparent 50%, rgba(140, 66, 179, 0.03) 50%)`, backgroundSize: '100% 4px', pointerEvents: 'none' }} />
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* TAB 4: HANDS-ON */}
                  {activeTab === 'hands' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {paths.handsOn.map((item, idx) => (
                        <Card key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <SectionLabel>{item.title}</SectionLabel>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {item.checkPoints.map((cp, cpIdx) => {
                              const checkKey = `${idx}_${cpIdx}`;
                              const isChecked = !!handsOnChecked[checkKey];
                              return (
                                <div
                                  key={cpIdx}
                                  onClick={() => setHandsOnChecked(prev => ({ ...prev, [checkKey]: !prev[checkKey] }))}
                                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                                >
                                  <div style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    border: `2px solid ${isChecked ? T.brand : T.line2}`,
                                    background: isChecked ? T.brandLo : T.bg3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s'
                                  }}>
                                    {isChecked && <Check size={14} color={T.brand} />}
                                  </div>
                                  <span style={{
                                    fontSize: 13,
                                    color: isChecked ? T.t4 : T.t2,
                                    textDecoration: isChecked ? 'line-through' : 'none',
                                    transition: 'all 0.15s'
                                  }}>{cp}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.5, flex: 1 }}>
                              <span style={{ fontWeight: 800, color: T.sky }}>COACH SIGNOFF CRITERIA:</span> {item.coachCriteria}
                            </div>
                            <label style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              cursor: (profile?.role === 'shift_leader' || profile?.role === 'location_manager' || profile?.role === 'org_admin' || profile?.role === 'super_admin') ? 'pointer' : 'not-allowed',
                              padding: '6px 12px',
                              borderRadius: 4,
                              background: coachSignedOff[idx] ? T.limeLo : T.bg3,
                              border: `1px solid ${coachSignedOff[idx] ? T.lime : T.line}`,
                              userSelect: 'none'
                            }}>
                              <input
                                type="checkbox"
                                checked={!!coachSignedOff[idx]}
                                disabled={!(profile?.role === 'shift_leader' || profile?.role === 'location_manager' || profile?.role === 'org_admin' || profile?.role === 'super_admin')}
                                onChange={e => setCoachSignedOff(prev => ({ ...prev, [idx]: e.target.checked }))}
                                style={{ cursor: (profile?.role === 'shift_leader' || profile?.role === 'location_manager' || profile?.role === 'org_admin' || profile?.role === 'super_admin') ? 'pointer' : 'not-allowed' }}
                              />
                              <span style={{ fontSize: 11, fontWeight: 700, color: coachSignedOff[idx] ? T.lime : T.t3 }}>
                                {coachSignedOff[idx] ? 'COACH VERIFIED' : 'COACH SIGN-OFF'}
                              </span>
                            </label>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Spinner />
              )}

              {/* Action Bar for SOP */}
              <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: T.t1, margin: 0 }}>Ready to prove your skills?</h4>
                  <p style={{ fontSize: 12, color: T.t3, margin: '4px 0 0 0' }}>Choose active recall flashcards or standard multiple-choice exam.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Btn v="ghost" sz="md" onClick={() => handleStartQuiz('flashcard')}>
                    <Sparkles size={14} style={{ marginRight: 6 }} /> Study Flashcards
                  </Btn>
                  <Btn v="brand" sz="md" onClick={() => handleStartQuiz('exam')}>
                    <Award size={14} style={{ marginRight: 6 }} /> Take Exam
                  </Btn>
                </div>
              </div>
            </>
          )}

          {/* RENDER RECIPE LAYOUT */}
          {selectedAssignment.recipe_id && selectedAssignment.recipes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {renderRecipeDetails(selectedAssignment.recipes)}

              {/* Recipe Action Bar */}
              <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: T.t1, margin: 0 }}>Recipe Review Checkpoint</h4>
                  <p style={{ fontSize: 12, color: T.t3, margin: '4px 0 0 0' }}>Familiarize yourself with yields, ingredients, and steps, then test your knowledge.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Btn v="ghost" sz="md" onClick={() => handleStartQuiz('flashcard')}>
                    <Sparkles size={14} style={{ marginRight: 6 }} /> Study Flashcards
                  </Btn>
                  <Btn v="brand" sz="md" onClick={() => handleStartQuiz('exam')}>
                    <Award size={14} style={{ marginRight: 6 }} /> Take Exam
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* RENDER RECIPE BOOK LAYOUT */}
          {selectedAssignment.recipe_book && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {selectedRecipeToReview ? (
                renderRecipeDetails(selectedRecipeToReview, () => setSelectedRecipeToReview(null))
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 12, padding: '16px 20px' }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 800, color: T.t1, margin: 0 }}>Category: {selectedAssignment.recipe_book}</h4>
                      <p style={{ fontSize: 12, color: T.t3, margin: '4px 0 0 0' }}>Review recipes below to prepare for the {selectedAssignment.recipe_book} Exam.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Btn v="ghost" sz="sm" onClick={() => handleStartQuiz('flashcard')}>
                        <Sparkles size={14} style={{ marginRight: 6 }} /> Book Flashcards
                      </Btn>
                      <Btn v="brand" sz="sm" onClick={() => handleStartQuiz('exam')}>
                        <Award size={14} style={{ marginRight: 6 }} /> Category Exam
                      </Btn>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <SectionLabel>Recipes in this Book ({bookRecipes.length})</SectionLabel>
                    {bookRecipes.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: T.t3, background: T.bg2, borderRadius: 8, border: `1px dashed ${T.line}` }}>
                        No recipes found under category "{selectedAssignment.recipe_book}".
                      </div>
                    ) : (
                      bookRecipes.map(recipe => (
                        <Card key={recipe.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{recipe.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                              <span style={{ fontSize: 12, color: T.t3 }}>Yield: {recipe.yield_amount} {recipe.yield_unit}</span>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.t4 }} />
                              <span style={{ fontSize: 12, color: T.t3 }}>Prep: {recipe.prep_time || 'N/A'}</span>
                            </div>
                          </div>
                          <Btn v="ghost" sz="xs" onClick={() => setSelectedRecipeToReview(recipe)}>
                            Review Details <ChevronRight size={14} />
                          </Btn>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── QUIZ PANEL ── */}
      {quizMode && selectedAssignment && (
        <div style={{ maxWidth: 540, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1 }}>
                Course Exam: {selectedAssignment.sop_id ? selectedAssignment.sops?.title : selectedAssignment.recipe_id ? selectedAssignment.recipes?.title : `${selectedAssignment.recipe_book} Category`}
              </h3>
              <span style={{ fontSize: 12, color: T.t3 }}>
                {studyMethod === 'flashcard' ? 'Flashcards Mode (Active Recall)' : 'Exam Mode (Get 80% to pass & 100% to earn treats!)'}
              </span>
            </div>
            {!quizFinished && (
              <span style={{ fontSize: 12, color: T.brand, fontWeight: 800 }}>
                Question {currentQIndex + 1} of {questions.length}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {!quizFinished && (
            <div style={{ width: '100%', height: 4, background: T.bg4, borderRadius: 99 }}>
              <div
                style={{
                  width: `${((currentQIndex + 1) / questions.length) * 100}%`,
                  height: '100%',
                  background: T.brand,
                  borderRadius: 99,
                  transition: 'width 0.2s'
                }}
              />
            </div>
          )}

          {/* Question / Card Area */}
          {!quizFinished && questions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Flashcard Active Recall Layout */}
              {studyMethod === 'flashcard' ? (
                <div 
                  onClick={() => !flashcardFlipped && setFlashcardFlipped(true)}
                  style={{
                    perspective: '1000px',
                    cursor: !flashcardFlipped ? 'pointer' : 'default',
                    width: '100%'
                  }}
                >
                  <div
                    style={{
                      background: T.bg2,
                      border: `2px solid ${flashcardFlipped ? T.limeBd : T.line}`,
                      borderRadius: 16,
                      padding: 32,
                      minHeight: 240,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'center',
                      boxShadow: T.shadow,
                      position: 'relative',
                      boxSizing: 'border-box'
                    }}
                  >
                    {!flashcardFlipped ? (
                      // Front of Flashcard
                      <>
                        <div style={{ fontSize: 12, color: T.brand, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Question {currentQIndex + 1} Front
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, margin: '20px 0', lineHeight: 1.5 }}>
                          {questions[currentQIndex].q}
                        </div>
                        <div style={{ fontSize: 13, color: T.brand, background: T.brandLo, border: `1px solid ${T.brandBd}`, padding: '8px 16px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={14} /> Click card to reveal answer
                        </div>
                      </>
                    ) : (
                      // Back of Flashcard
                      <>
                        <div style={{ fontSize: 12, color: T.lime, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Correct Answer Back
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: T.t1, margin: '12px 0', lineHeight: 1.5 }}>
                          {questions[currentQIndex].q}
                        </div>
                        
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0' }}>
                          {questions[currentQIndex].opts.map((opt: string, idx: number) => {
                            const isCorrect = idx === questions[currentQIndex].ans;
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: 8,
                                  background: isCorrect ? T.limeLo : T.bg3,
                                  border: `1px solid ${isCorrect ? T.lime : T.line}`,
                                  color: isCorrect ? T.lime : T.t2,
                                  fontSize: 13,
                                  fontWeight: isCorrect ? 700 : 500,
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8
                                }}
                              >
                                <div style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  background: isCorrect ? T.lime : T.bg4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isCorrect ? '#fff' : T.t3,
                                  fontSize: 10,
                                  fontWeight: 800
                                }}>
                                  {isCorrect ? '✓' : String.fromCharCode(65 + idx)}
                                </div>
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Flashcard Action Buttons (Only visible when flipped) */}
                  {flashcardFlipped && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFlashcardClick(false); }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '14px 16px',
                          borderRadius: 8,
                          background: T.redLo,
                          border: `1px solid ${T.redBd}`,
                          color: T.red,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <ThumbsDown size={16} /> Need to Review
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFlashcardClick(true); }}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '14px 16px',
                          borderRadius: 8,
                          background: T.limeLo,
                          border: `1px solid ${T.limeBd}`,
                          color: T.lime,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <ThumbsUp size={16} /> Got it Right!
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Exam Multiple Choice Layout
                <>
                  <Card>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <HelpCircle size={22} color={T.brand} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 16, fontWeight: 800, color: T.t1, lineHeight: 1.5 }}>
                        {questions[currentQIndex].q}
                      </span>
                    </div>
                  </Card>

                  {/* Choices */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {questions[currentQIndex].opts.map((opt: string, idx: number) => {
                      const isSelected = selectedAns === idx
                      const isCorrect = idx === questions[currentQIndex].ans
                      
                      // Color highlights
                      let bg = T.bg2
                      let border = `1px solid ${T.line}`
                      let color = T.t2

                      if (selectedAns !== null) {
                        if (isCorrect) {
                          bg = T.limeLo
                          border = `1px solid ${T.lime}`
                          color = T.lime
                        } else if (isSelected) {
                          bg = T.redLo
                          border = `1px solid ${T.red}`
                          color = T.red
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerSelect(idx)}
                          disabled={selectedAns !== null}
                          style={{
                            padding: '16px 20px',
                            borderRadius: 8,
                            background: bg,
                            border: border,
                            color: color,
                            fontSize: 14,
                            fontWeight: 700,
                            textAlign: 'left',
                            cursor: selectedAns !== null ? 'default' : 'pointer',
                            transition: 'all 0.1s'
                          }}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Results Summary */}
          {quizFinished && (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>
                {score === questions.length ? '🏆' : score / questions.length >= 0.8 ? '🎉' : '❌'}
              </div>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1, letterSpacing: '-0.3px' }}>
                  {score === questions.length ? 'Perfect Score!' : score / questions.length >= 0.8 ? 'Exam Passed!' : 'Exam Failed'}
                </h3>
                <span style={{ fontSize: 13, color: T.t3, marginTop: 4, display: 'inline-block' }}>
                  You scored {score} out of {questions.length} ({Math.round((score / questions.length) * 100)}%)
                </span>
              </div>

              {score === questions.length && (
                <div style={{ padding: '10px 16px', background: T.brandLo, border: `1px solid ${T.brandBd}`, borderRadius: 4, fontSize: 11, color: T.brand, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  🌟 Earmarked +1 treat & +50 EXP for pet!
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, width: '100%', marginTop: 8 }}>
                <Btn v="ghost" style={{ flex: 1 }} onClick={() => { setQuizMode(false); setSelectedAssignment(null) }}>
                  Exit Class
                </Btn>
                {score < questions.length && (
                  <Btn v="brand" style={{ flex: 2 }} onClick={handleRetakeQuiz}>
                    <RefreshCw size={14} style={{ marginRight: 6 }} /> Retake
                  </Btn>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
export default Training
