import { useState, useEffect, useRef } from 'react'

/* ── Demo data per tab ────────────────────────────────────────────────────── */
const TABS = [
  {
    key: 'essay',
    label: 'Essay',
    title: 'climate policy essay (the one worth 30%)',
    taskType: 'Essay',
    deadlineDays: 10,
    notes: "need 5 sources minimum, prof wants a thesis defense in the intro not just background info. haven't picked a side yet tbh. also i have lectures every morning so can't work then",
    resultTitle: 'Your 10-Day Essay Plan',
    resultSummary: 'sources, a defensible thesis, and a clean draft — paced around your lecture schedule.',
    resultSummaryPrefix: '5',
    checkpoints: [
      { title: 'Nail down your thesis + outline', desc: 'Draft a defensible thesis and rough structure before you touch a single source.' },
      { title: 'Find and read 5 academic sources', desc: 'Prioritize sources that directly support or complicate your thesis.' },
      { title: 'Write first draft (intro + body)', desc: 'Get the argument on the page before polishing anything.' },
      { title: 'Revise + strengthen thesis defense', desc: "Tighten the intro's defense and check body paragraphs actually support it." },
      { title: 'Final proofread + citations check', desc: 'Catch errors and confirm every source is properly cited.' },
    ],
  },
  {
    key: 'pset',
    label: 'Problem Set',
    title: 'linear algebra pset 4',
    taskType: 'Problem Set',
    deadlineDays: 4,
    notes: "12 questions, i genuinely don't get eigenvalues at all. why did nobody explain this properly. need to figure it out before i even start",
    resultTitle: 'Your 4-Day Problem Set Plan',
    resultSummary: 'Eigenvalue review first, then the set split into two manageable pushes.',
    resultSummaryPrefix: '',
    checkpoints: [
      { title: 'Review eigenvalue/eigenvector notes', desc: 'Rebuild the foundation before attempting problems that depend on it.' },
      { title: 'Attempt questions 1–6', desc: 'Start with the first half while the review is fresh.' },
      { title: 'Get unstuck (office hours or study group)', desc: 'Resolve the questions that stalled you before moving on.' },
      { title: 'Attempt questions 7–12', desc: 'Finish the second half.' },
      { title: 'Final review + check your work', desc: 'Catch calculation errors before submitting.' },
    ],
  },
  {
    key: 'exam',
    label: 'Exam Prep',
    title: 'orgo midterm',
    taskType: 'Exam Prep',
    deadlineDays: 7,
    notes: "covers reaction mechanisms + nucleophilic substitution, i'm cooked ngl. haven't looked at this since the lecture happened",
    resultTitle: 'Your 7-Day Exam Prep Plan',
    resultSummary: 'From first review to a timed practice run, paced across the week.',
    resultSummaryPrefix: '',
    checkpoints: [
      { title: 'Review lecture notes + textbook chapters', desc: 'Rebuild the full picture before drilling problems.' },
      { title: 'Practice problems on reaction mechanisms', desc: "Apply the concepts, don't just re-read them." },
      { title: 'Build a summary sheet / flashcards', desc: 'Condense everything into fast-recall format.' },
      { title: 'Timed practice exam', desc: 'Simulate real exam conditions and timing.' },
      { title: 'Final review of weak areas', desc: 'Spend remaining time only on what the practice exam exposed.' },
    ],
  },
]

const AI_PHASES = [
  { icon: '🔌', text: 'Connecting to AI engine…' },
  { icon: '🧠', text: 'Analysing your task…' },
  { icon: '📋', text: 'Building your checkpoint roadmap…' },
  { icon: '✨', text: 'Almost done…' },
]

function formatDeadline(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState(0)
  const [phase, setPhase]         = useState('idle')      // 'idle' | 'generating' | 'result'
  const [aiPhase, setAiPhase]     = useState(0)
  const phaseTimer                = useRef(null)
  const cpRefs                    = useRef([])

  const tab = TABS[activeTab]

  // Reset to idle on tab switch
  useEffect(() => {
    setPhase('idle')
    setAiPhase(0)
    clearInterval(phaseTimer.current)
  }, [activeTab])

  function handleGenerate() {
    setPhase('generating')
    setAiPhase(0)
    let step = 0
    phaseTimer.current = setInterval(() => {
      step++
      if (step >= AI_PHASES.length) {
        clearInterval(phaseTimer.current)
        setPhase('result')
        return
      }
      setAiPhase(step)
    }, 800)
  }

  // Staggered reveal on result
  useEffect(() => {
    if (phase === 'result') {
      cpRefs.current.forEach((el, i) => {
        if (el) {
          el.style.opacity = '0'
          el.style.transform = 'translateY(12px)'
          setTimeout(() => {
            el.style.transition = 'opacity 0.4s ease, transform 0.4s ease'
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, 200 + i * 120)
        }
      })
    }
  }, [phase])

  return (
    <div className="demo-card">
      {/* Tab row */}
      <div className="demo-tabs">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            className={`demo-tab${i === activeTab ? ' active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* IDLE: form fields */}
      {phase === 'idle' && (
        <div className="demo-form">
          <div className="demo-field-group">
            <label className="demo-field-label">Task Title</label>
            <input
              className="demo-field-input"
              type="text"
              value={tab.title}
              readOnly
            />
          </div>

          <div className="demo-field-row">
            <div className="demo-field-group" style={{ flex: 1 }}>
              <label className="demo-field-label">Task Type</label>
              <select className="demo-field-select" value={tab.taskType} readOnly disabled>
                <option>{tab.taskType}</option>
              </select>
            </div>

            <div className="demo-field-group" style={{ flex: 1 }}>
              <label className="demo-field-label">Final Deadline</label>
              <input
                className="demo-field-input"
                type="date"
                value={formatDeadline(tab.deadlineDays)}
                readOnly
              />
            </div>
          </div>

          <div className="demo-field-group">
            <label className="demo-field-label">
              Notes <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              className="demo-field-textarea"
              value={tab.notes}
              readOnly
              rows={3}
            />
          </div>

          <button className="demo-submit" onClick={handleGenerate}>
            + Create Task
          </button>
        </div>
      )}

      {/* GENERATING: loading animation */}
      {phase === 'generating' && (
        <div className="demo-generating">
          <div className="demo-spinner" />
          <p className="demo-generating-text">
            {AI_PHASES[aiPhase].icon} {AI_PHASES[aiPhase].text}
          </p>
          <div className="demo-progress-dots">
            {AI_PHASES.map((_, i) => (
              <div
                key={i}
                className={`demo-dot${i <= aiPhase ? ' active' : ''}${i === aiPhase ? ' current' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* RESULT: checkpoints */}
      {phase === 'result' && (
        <div className="demo-result">
          <div className="demo-result-header">
            <h4 className="demo-result-title">{tab.resultTitle}</h4>
            <p className="demo-result-summary">
              {tab.resultSummaryPrefix && <strong>{tab.resultSummaryPrefix} </strong>}
              {tab.resultSummary}
            </p>
          </div>

          <div className="demo-checkpoints">
            {tab.checkpoints.map((cp, i) => (
              <div
                key={i}
                className="demo-checkpoint"
                ref={el => cpRefs.current[i] = el}
              >
                <div className="demo-cp-number">{i + 1}</div>
                <div className="demo-cp-content">
                  <div className="demo-cp-title">{cp.title}</div>
                  <p className="demo-cp-desc">{cp.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="demo-reset"
            onClick={() => setPhase('idle')}
          >
            ← Try another
          </button>
        </div>
      )}
    </div>
  )
}
