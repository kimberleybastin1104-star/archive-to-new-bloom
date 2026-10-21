// @ts-nocheck -- ported as-is from the original project; logic is loosely typed.
import { useEffect, useMemo, useRef, useState } from 'react';
import coverImg from '@/assets/cover.jpg';
import workoutImg from '@/assets/workout.jpg';
import foodImg from '@/assets/food.jpg';
import mindImg from '@/assets/mind.jpg';
const BANNERS: Record<string, [string, string]> = {
  '/workout-tracker': [workoutImg, 'Pink dumbbells beside a diary and water bottle'],
  '/glute-focus': [workoutImg, 'Pink dumbbells beside a diary and water bottle'],
  '/nutrition-tracker': [foodImg, 'Yogurt bowl with berries and a glass of water'],
  '/meal-planner': [foodImg, 'Yogurt bowl with berries and a glass of water'],
  '/wellbeing': [mindImg, 'Journal, tea and a candle on a cosy bed'],
  '/notes-thoughts': [mindImg, 'Journal, tea and a candle on a cosy bed'],
};
import { buildBackup, readBackup } from '@/lib/diary-backup';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Activity, ArrowRight, BookHeart, CalendarDays, Check, CheckCircle2,
  Dumbbell, Flower2, Heart, ListChecks, Menu, Plus, Sparkles, Trash2, Waves,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HABITS = ['Gym', 'Protein goal', '2L water', '7+ hours sleep', 'Progress photos', 'Positive mindset'];
const ROUTES = [
  { path: '/weekly-plan', label: 'Weekly plan', icon: ListChecks, group: 'primary' },
  { path: '/workout-tracker', label: 'Workout log', icon: Dumbbell, group: 'primary' },
  { path: '/habit-tracker', label: 'Little habits', icon: CheckCircle2, group: 'primary' },
  { path: '/goals', label: 'My goals', icon: Sparkles, group: 'primary' },
  { path: '/nutrition-tracker', label: 'Food & water', icon: Heart, group: 'more' },
  { path: '/meal-planner', label: 'Meal planner', icon: BookHeart, group: 'more' },
  { path: '/shopping-list', label: 'Shopping list', icon: ListChecks, group: 'more' },
  { path: '/measurements', label: 'Measurements', icon: Activity, group: 'more' },
  { path: '/progress-photos', label: 'Progress photos', icon: Flower2, group: 'more' },
  { path: '/cardio-tracker', label: 'Cardio log', icon: Waves, group: 'more' },
  { path: '/cycle-tracker', label: 'Cycle tracker', icon: CalendarDays, group: 'more' },
  { path: '/wellbeing', label: 'Mind & mood', icon: Heart, group: 'more' },
  { path: '/glute-focus', label: 'Glute focus', icon: Dumbbell, group: 'more' },
  { path: '/monthly-overview', label: 'Monthly view', icon: CalendarDays, group: 'more' },
  { path: '/notes-thoughts', label: 'Notes & thoughts', icon: BookHeart, group: 'more' },
];

const freshState = () => ({
  weekly: {
    focus: ['', '', '', '', '', '', ''],
    done: [false, false, false, false, false, false, false], goals: ['', '', ''], goalDone: [false, false, false], notes: '',
  },
  workoutDraft: { date: new Date().toISOString().slice(0, 10), mood: '', notes: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] },
  sessions: [],
  habits: { week: {}, water: {}, custom: [], weekStart: '' },
  goals: { short: ['', '', ''], shortDone: [false, false, false], long: ['', '', ''], longDone: [false, false, false], why: '' },
  nutrition: { date: new Date().toISOString().slice(0, 10), meals: Array.from({ length: 5 }, () => ({ food: '', protein: '', calories: '' })), water: 0, notes: '' },
  mealPlan: DAYS.map(() => ({ meals: '', snacks: '' })),
  shopping: { Protein: [], Carbs: [], 'Fruit & veg': [], 'Healthy fats': [], Snacks: [], Misc: [] },
  measurements: { date: new Date().toISOString().slice(0, 10), weight: '', chest: '', arm: '', waist: '', hips: '', thigh: '' },
  photos: {},
  cardio: { date: new Date().toISOString().slice(0, 10), activity: '', time: '', distance: '', calories: '', notes: '' },
  cycle: {
    cycleLength: '28',
    periodLength: '5',
    periodStartInput: new Date().toISOString().slice(0, 10),
    periods: [],
    checkInDraft: { date: new Date().toISOString().slice(0, 10), flow: '', mood: '', symptoms: [], notes: '' },
    checkIns: [],
  },
  wellbeing: { date: new Date().toISOString().slice(0, 10), gratitude: '', mood: '', happy: '', improve: '' },
  glutes: [{ exercise: 'Hip thrust', sets: '4', reps: '8–10', note: 'Pause and squeeze at the top' }, { exercise: 'Romanian deadlift', sets: '3', reps: '8–12', note: 'Keep the hinge controlled' }, { exercise: 'Bulgarian split squat', sets: '3', reps: '8 each', note: 'A gentle forward lean' }],
  monthly: { month: new Date().toISOString().slice(0, 7), goals: ['', '', ''], notes: '' },
  journal: '',
});

const safeLoad = () => {
  try {
    const stored = localStorage.getItem('gym-diary-planner-v1');
    if (!stored) return freshState();
    return normalizeDiary(JSON.parse(stored));
  } catch {
    return freshState();
  }
};

export function normalizeDiary(parsed: any) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Not a diary');
  {
    const base: Record<string, any> = freshState();
    const value = { ...base, ...parsed };
    for (const key of ['weekly', 'workoutDraft', 'habits', 'goals', 'nutrition', 'measurements', 'cardio', 'cycle', 'wellbeing', 'monthly', 'shopping']) {
      value[key] = { ...base[key], ...(parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key]) ? parsed[key] : {}) };
    }
    for (const key of ['sessions', 'mealPlan', 'photos', 'glutes', 'journal']) {
      if (parsed[key] === undefined || parsed[key] === null) value[key] = base[key];
    }
    if (!Array.isArray(value.weekly.focus)) value.weekly.focus = base.weekly.focus;
    if (!Array.isArray(value.weekly.done)) value.weekly.done = base.weekly.done;
    if (!Array.isArray(value.weekly.goals)) value.weekly.goals = base.weekly.goals;
    if (!Array.isArray(value.weekly.goalDone)) value.weekly.goalDone = base.weekly.goalDone;
    if (!Array.isArray(value.goals.short)) value.goals.short = base.goals.short;
    if (!Array.isArray(value.goals.shortDone)) value.goals.shortDone = base.goals.shortDone;
    if (!Array.isArray(value.goals.long)) value.goals.long = base.goals.long;
    if (!Array.isArray(value.goals.longDone)) value.goals.longDone = base.goals.longDone;
    if (!Array.isArray(value.habits.custom)) value.habits.custom = [];
    if (!value.habits.week || typeof value.habits.week !== 'object') value.habits.week = {};
    if (!value.habits.water || typeof value.habits.water !== 'object') value.habits.water = {};
    if (!Array.isArray(value.nutrition.meals) || value.nutrition.meals.length !== 5) value.nutrition.meals = base.nutrition.meals;
    for (const category of Object.keys(base.shopping)) if (!Array.isArray(value.shopping[category])) value.shopping[category] = [];
    if (!Array.isArray(value.workoutDraft.exercises)) value.workoutDraft.exercises = base.workoutDraft.exercises;
    if (!Array.isArray(value.sessions)) value.sessions = [];
    if (!Array.isArray(value.mealPlan) || value.mealPlan.length !== 7) value.mealPlan = base.mealPlan;
    if (!Array.isArray(value.glutes)) value.glutes = base.glutes;
    if (!value.photos || typeof value.photos !== 'object') value.photos = {};
    if (!Array.isArray(value.cycle.periods)) value.cycle.periods = [];
    if (!Array.isArray(value.cycle.checkIns)) value.cycle.checkIns = [];
    if (!value.cycle.checkInDraft || typeof value.cycle.checkInDraft !== 'object') value.cycle.checkInDraft = base.cycle.checkInDraft;
    if (!Array.isArray(value.cycle.checkInDraft.symptoms)) value.cycle.checkInDraft.symptoms = [];
    return value;
  }
}

function App() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [data, setData] = useState<any>(safeLoad);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const exportDiary = () => {
    const blob = new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gym-diary-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setToast('Backup saved to your device.');
  };
  const importDiary = async (file?: File) => {
    if (!file) return;
    try {
      const restored = normalizeDiary(readBackup(await file.text()));
      if (window.confirm('Replace everything in this diary with the backup? This cannot be undone.')) {
        setData(restored);
        setToast('Diary restored from your backup.');
      }
    } catch {
      setToast("That file doesn't look like a Gym Diary backup.");
    }
    if (fileInput.current) fileInput.current.value = '';
  };
  useEffect(() => {
    try { localStorage.setItem('gym-diary-planner-v1', JSON.stringify(data)); } catch { setToast('Could not save. Your device storage may be full.'); }
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2300);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const update = (section: string, key: string, value: any) => setData((old: any) => ({ ...old, [section]: { ...old[section], [key]: value } }));
  const activePath = ROUTES.some((route) => route.path === location) ? location : '/weekly-plan';
  const active = ROUTES.find((item) => item.path === activePath) ?? ROUTES[0];
  const loggedThisWeek = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return (data.sessions ?? []).filter((session: any) => {
      const date = new Date(`${session.date}T12:00:00`);
      return date >= monday && date <= now;
    }).length;
  }, [data.sessions]);
  const setPath = (section: string, path: (string | number)[], value: any) => {
    setData((old: any) => {
      const next = structuredClone(old);
      let item = next[section];
      for (let i = 0; i < path.length - 1; i++) item = item[path[i]];
      item[path[path.length - 1]] = value;
      return next;
    });
  };
  const setTop = (key: string, value: any) => setData((old: any) => ({ ...old, [key]: value }));
  const saveWorkout = () => {
    const workout = data.workoutDraft;
    const date = workout.date || new Date().toISOString().slice(0, 10);
    const session = { ...workout, id: Date.now(), date };
    const dayIndex = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
    setData((old: any) => ({
      ...old,
      sessions: [session, ...(old.sessions ?? [])],
      weekly: { ...old.weekly, done: old.weekly.done.map((checked: boolean, index: number) => index === dayIndex ? true : checked) },
    }));
    setToast('Workout tucked into your diary.');
  };
  const resetHabits = () => {
    if (window.confirm('Start a fresh week? Your previous week stays in your diary.')) {
      setData((old: any) => ({ ...old, habits: { ...old.habits, week: {}, water: {}, weekStart: new Date().toISOString().slice(0, 10) } }));
      setToast('A fresh week, whenever you are ready.');
    }
  };
  const primary = ROUTES.filter((route) => route.group === 'primary');
  const others = ROUTES.filter((route) => route.group === 'more');
  const navLink = (item: typeof ROUTES[number], mobile = false) => {
    const Icon = item.icon;
    return <Link key={item.path} to={item.path} className={`${mobile ? 'mobile-item' : 'nav-link'} ${activePath === item.path ? 'active' : ''}`} data-testid={`link-${item.path.slice(1) || 'home'}`} onClick={() => setMoreOpen(false)}>
      <Icon size={mobile ? 18 : 17} strokeWidth={1.7} /><span>{mobile ? item.label.split(' ')[0] : item.label}</span>
    </Link>;
  };
  return <div className="app-shell">
    <aside className="sidebar">
      <Link to="/weekly-plan" className="brand"><span className="brand-mark"><Flower2 size={21} /></span><span><span className="brand-name">Gym Diary</span><span className="brand-sub">your own little corner</span></span></Link>
      <div className="nav-caption">The everyday</div>{primary.map((item) => navLink(item))}
      <div className="nav-caption">A little more</div>
      {others.map((item) => navLink(item))}
      <div className="privacy-note"><Heart size={15} /><strong>Just for you</strong>Everything here stays on this device, in your browser. No account, no cloud.</div>
    </aside>
    <div className="main-area">
      <header className="topbar"><span className="date-label">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span><div className="top-actions"><span className="tiny-status"><span style={{ color: 'var(--rose)' }}>●</span> Saved on this device</span><button type="button" className="btn small" onClick={exportDiary}>Export backup</button><button type="button" className="btn small" onClick={() => fileInput.current?.click()}>Import backup</button><input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Import backup file" onChange={(e) => importDiary(e.target.files?.[0])} /><span className="script">one day at a time</span></div></header>
      <main className="content">
        {BANNERS[activePath] && <img className="page-banner" src={BANNERS[activePath][0]} alt={BANNERS[activePath][1]} width={1600} height={560} />}
        <Page page={activePath} data={data} update={update} setPath={setPath} setTop={setTop} saveWorkout={saveWorkout} resetHabits={resetHabits} notify={setToast} loggedThisWeek={loggedThisWeek} />
      </main>
    </div>
    <nav className="nav-mobile">{primary.slice(0, 4).map((item) => navLink(item, true))}<div className="mobile-more">
      <button className={`mobile-item ${others.some((item) => item.path === activePath) ? 'active' : ''}`} onClick={() => setMoreOpen((open) => !open)} data-testid="button-mobile-more"><Menu size={18} /><span>More</span></button>
      {moreOpen && <div className="more-panel">{others.map((item) => navLink(item))}</div>}
    </div></nav>
    {toast && <div className="toast-message" role="status">{toast}</div>}
  </div>;
}

function Heading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: any }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="subtitle">{subtitle}</p>}</div>{action}</div>;
}
function Card({ title, icon: Icon = Heart, children, className = '' }: any) {
  return <section className={`card ${className}`}><h2 className="card-title"><Icon size={18} strokeWidth={1.7} />{title}</h2>{children}</section>;
}
function Input({ label, value, onChange, placeholder = '', type = 'text', ...props }: any) {
  return <label className="field"><span>{label}</span><input className="input" type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} {...props} /></label>;
}
function TextArea({ label, value, onChange, placeholder = '', ...props }: any) {
  return <label className="field"><span>{label}</span><textarea className="textarea" value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} {...props} /></label>;
}
function Water({ count, onChange }: { count: number; onChange: (count: number) => void }) {
  return <div className="water-row" aria-label={`${count} of 8 glasses`}>{Array.from({ length: 8 }, (_, index) => <button className={`drop ${index < count ? 'filled' : ''}`} key={index} onClick={() => onChange(index < count ? index : index + 1)} aria-label={`${index < count ? 'Remove' : 'Add'} water glass ${index + 1}`} data-testid={`water-glass-${index + 1}`}><span>{index < count ? '✓' : ''}</span></button>)}</div>;
}
function Page({ page, data, update, setPath, setTop, saveWorkout, resetHabits, notify, loggedThisWeek }: any) {
  const [newHabit, setNewHabit] = useState('');
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));
  const workouts: any[] = data.sessions ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const title = ROUTES.find((item) => item.path === page)?.label ?? 'My week';
  const listAdd = (category: string) => {
    const text = (newItem[category] ?? '').trim();
    if (!text) return;
    update('shopping', category, [...(data.shopping[category] ?? []), { text, done: false, id: Date.now() }]);
    setNewItem((old) => ({ ...old, [category]: '' }));
  };
  const habitKey = (day: number, label: string) => `${day}-${label}`;

  if (page === '/weekly-plan') return <>
    <Heading eyebrow="Your week, gently mapped out" title="Weekly plan" subtitle="A plan is a guide, not a rulebook." />
    <div className="cover-card"><img className="cover-photo" src={coverImg} alt="" width={1600} height={704} /><div className="eyebrow" style={{ color: '#f8e2e9' }}>THIS WEEK, YOUR WAY</div><div className="cover-title">Stronger body ·<br />Happier mind.</div><div className="script" style={{ color: '#fff0f2' }}>a week worth showing up for</div>
      <div className="cover-stats"><div><b>{loggedThisWeek}</b><span>workouts this week</span></div><div><b>{workouts.length}</b><span>workouts logged</span></div></div>
      <div className="hero-actions"><Link to="/workout-tracker" className="btn" style={{ background: '#fff8f2', color: '#8e4f67', border: 0 }}>Log a workout <ArrowRight size={15} /></Link></div>
    </div>
    <div className="grid" style={{ marginTop: 18 }}>
      <Card title="This week's rhythm" icon={CalendarDays}>
        <div className="week-strip">{SHORT_DAYS.map((day, index) => <div key={day} className={`week-pill ${data.weekly.done[index] ? 'done' : ''}`}><span>{day}</span><b>{data.weekly.done[index] ? <Check size={16} style={{ margin: 'auto' }} /> : index + 1}</b></div>)}</div>
        <div className="row between" style={{ marginTop: 18 }}><span className="muted" style={{ fontSize: 12 }}>{data.weekly.done.filter(Boolean).length} of 7 days celebrated</span><span className="script">you are doing just fine</span></div>
      </Card>
    </div>
    <Card title="Daily focus" icon={CalendarDays}>
      {DAYS.map((day, index) => <div className="day-row" key={day}><span className="day-name">{day.slice(0, 3)}</span><input className="table-input" value={data.weekly.focus[index] ?? ''} onChange={(event) => setPath('weekly', ['focus', index], event.target.value)} placeholder="Choose a focus, or leave it open" data-testid={`input-focus-${index}`} /><label className="row" style={{ gap: 7, fontSize: 11, color: 'var(--muted-foreground)' }}><input className="check" type="checkbox" checked={!!data.weekly.done[index]} onChange={(event) => setPath('weekly', ['done', index], event.target.checked)} aria-label={`${day} workout done`} data-testid={`check-workout-${index}`} />Done</label></div>)}
    </Card>
      <div className="grid two-col" style={{ marginTop: 16 }}><Card title="Three little goals" icon={Sparkles}>{data.weekly.goals.map((goal: string, index: number) => <div className="row" key={index} style={{ marginBottom: 9 }}><input className="check" type="checkbox" checked={!!data.weekly.goalDone[index]} onChange={(event) => setPath('weekly', ['goalDone', index], event.target.checked)} aria-label={`Goal ${index + 1} complete`} /><input className="input" value={goal} onChange={(event) => setPath('weekly', ['goals', index], event.target.value)} placeholder={`This week I'd like to…`} /></div>)}</Card><Card title="Notes for the week" icon={BookHeart}><TextArea label="A thought, a reminder, a little plan" value={data.weekly.notes} onChange={(value: string) => update('weekly', 'notes', value)} placeholder="What would make this week feel good?" /></Card></div>
  </>;

  if (page === '/workout-tracker') return <>
    <Heading eyebrow="Every rep is part of the story" title="Workout log" subtitle="Write down what you did—and how it felt." />
    <div className="grid two-col">
      <Card title="Today's session" icon={Dumbbell}>
        <Input label="Training date" type="date" value={data.workoutDraft.date} onChange={(value: string) => update('workoutDraft', 'date', value)} />
        <div className="table-wrap" style={{ marginTop: 12 }}><table className="data-table"><thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th></th></tr></thead><tbody>{data.workoutDraft.exercises.map((exercise: any, index: number) => <tr key={index}><td><input className="table-input" value={exercise.name} onChange={(event) => setPath('workoutDraft', ['exercises', index, 'name'], event.target.value)} placeholder="Exercise" /></td>{['sets', 'reps', 'weight'].map((field) => <td key={field}><input className="table-input" value={exercise[field]} onChange={(event) => setPath('workoutDraft', ['exercises', index, field], event.target.value)} placeholder={field === 'weight' ? 'kg' : '—'} /></td>)}<td><button className="icon-btn" onClick={() => setPath('workoutDraft', ['exercises'], data.workoutDraft.exercises.filter((_: any, i: number) => i !== index))} aria-label="Remove exercise"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
        <button className="btn small" onClick={() => update('workoutDraft', 'exercises', [...data.workoutDraft.exercises, { name: '', sets: '', reps: '', weight: '' }])}><Plus size={14} /> Add exercise</button>
      </Card>
      <div className="grid" style={{ alignContent: 'start' }}>
        <Card title="Today I feel…" icon={Heart}><div className="row" style={{ flexWrap: 'wrap' }}>{['Strong', 'Steady', 'Low energy', 'Proud', 'Still figuring it out'].map((mood) => <button key={mood} className={`btn small ${data.workoutDraft.mood === mood ? 'primary' : ''}`} onClick={() => update('workoutDraft', 'mood', mood)}>{mood}</button>)}</div><TextArea label="Anything worth remembering?" value={data.workoutDraft.notes} onChange={(value: string) => update('workoutDraft', 'notes', value)} placeholder="A win, a new PR, how it felt…" /></Card>
        <Card title="Ready to close the page?" icon={CheckCircle2}><p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>Finishing saves this session here and checks off the matching day in your weekly plan.</p><button className="btn primary" onClick={saveWorkout} data-testid="button-finish-workout"><Check size={16} /> Finish workout</button></Card>
      </div>
    </div>
    <Card title="Sessions kept close" icon={BookHeart} className="mt-card" >
      {workouts.length ? workouts.slice(0, 8).map((session: any) => <div className="day-row" key={session.id}><span className="day-name">{new Date(`${session.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div><b>{session.exercises.filter((ex: any) => ex.name).map((ex: any) => ex.name).join(' · ') || 'Workout session'}</b><div className="muted" style={{ fontSize: 12 }}>{session.mood || 'A session logged'}{session.notes ? ` — ${session.notes}` : ''}</div></div><button className="icon-btn" aria-label="Delete session" onClick={() => setTop('sessions', workouts.filter((item: any) => item.id !== session.id))}><Trash2 size={15} /></button></div>) : <div className="empty-note">Your first session will have a lovely place here.</div>}
    </Card>
  </>;

  if (page === '/habit-tracker') return <>
    <Heading eyebrow="Small things, often" title="Little habits" subtitle="A week is made of the choices you make for yourself." action={<button className="btn" onClick={resetHabits}>Start a new week</button>} />
    <Card title="Your week at a glance" icon={CheckCircle2}><div className="table-wrap"><table className="data-table" style={{ minWidth: 620 }}><thead><tr><th>Habit</th>{SHORT_DAYS.map((day) => <th key={day} style={{ textAlign: 'center' }}>{day}</th>)}<th></th></tr></thead><tbody>{[...HABITS, ...data.habits.custom].map((habit: string) => <tr key={habit}><td style={{ color: 'var(--ink)', fontSize: 13 }}>{habit}</td>{DAYS.map((_, day) => <td key={day} style={{ textAlign: 'center' }}><input className="check habit-cell" type="checkbox" checked={!!data.habits.week[habitKey(day, habit)]} onChange={(event) => update('habits', 'week', { ...data.habits.week, [habitKey(day, habit)]: event.target.checked })} aria-label={`${habit}, ${DAYS[day]}`} /></td>)}<td>{data.habits.custom.includes(habit) && <button className="icon-btn" aria-label={`Remove ${habit}`} onClick={() => update('habits', 'custom', data.habits.custom.filter((entry: string) => entry !== habit))}><Trash2 size={14} /></button>}</td></tr>)}</tbody></table></div>
      <div className="row" style={{ marginTop: 14 }}><input className="input" value={newHabit} onChange={(event) => setNewHabit(event.target.value)} placeholder="Add a habit that's yours" /><button className="btn small" onClick={() => { if (newHabit.trim()) { update('habits', 'custom', [...data.habits.custom, newHabit.trim()]); setNewHabit(''); } }}><Plus size={14} />Add</button></div>
    </Card>
    <Card title="Water, one glass at a time" icon={Waves} className="mt-card"><p className="muted" style={{ fontSize: 13 }}>Tap a drop for each glass. Eight drops make your 2L goal.</p><Water count={data.habits.water[today] ?? 0} onChange={(count) => update('habits', 'water', { ...data.habits.water, [today]: count })} /></Card>
  </>;

  if (page === '/goals') return <>
    <Heading eyebrow="Keep your why nearby" title="My goals" subtitle="Big dreams become real in small, patient steps." />
    <div className="grid two-col">{[['short', 'shortDone', 'A few months from now', '1–3 month goals'], ['long', 'longDone', 'The longer view', '6–12 month goals']].map(([key, doneKey, titleText, sub]) => <Card title={titleText} icon={Sparkles} key={key}><p className="muted" style={{ fontSize: 12 }}>{sub}</p>{data.goals[key].map((goal: string, index: number) => <div className="row" key={index} style={{ margin: '11px 0' }}><input className="check" type="checkbox" checked={data.goals[doneKey][index]} onChange={(event) => setPath('goals', [doneKey, index], event.target.checked)} aria-label={`Mark goal ${index + 1}`} /><input className="input" value={goal} onChange={(event) => setPath('goals', [key, index], event.target.value)} placeholder="A goal you care about…" /></div>)}</Card>)}</div>
    <div style={{ marginTop: 16 }}><Card title="Why I'm doing this" icon={Heart}><TextArea label="A note for the days you need a reminder" value={data.goals.why} onChange={(value: string) => update('goals', 'why', value)} placeholder="What do you hope to feel, do, or discover?" /></Card></div>
  </>;

  if (page === '/nutrition-tracker') {
    const protein = data.nutrition.meals.reduce((sum: number, meal: any) => sum + (Number(meal.protein) || 0), 0);
    const calories = data.nutrition.meals.reduce((sum: number, meal: any) => sum + (Number(meal.calories) || 0), 0);
    return <>
      <Heading eyebrow="Nourishment without judgment" title="Food & water" subtitle="Notice what helps you feel good, one meal at a time." />
      <Card title="A day of meals" icon={Heart}><Input label="Date" type="date" value={data.nutrition.date} onChange={(value: string) => update('nutrition', 'date', value)} />
        {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Snack'].map((meal, index) => <div className="meal-row" key={index}><div className="meal-label">{meal}{index > 3 ? ' 2' : ''}</div><div className="grid two-col"><Input label="What did you have?" value={data.nutrition.meals[index].food} onChange={(value: string) => setPath('nutrition', ['meals', index, 'food'], value)} placeholder="Food or meal" /><div className="row"><Input label="Protein (g)" type="number" value={data.nutrition.meals[index].protein} onChange={(value: string) => setPath('nutrition', ['meals', index, 'protein'], value)} /><Input label="Calories" type="number" value={data.nutrition.meals[index].calories} onChange={(value: string) => setPath('nutrition', ['meals', index, 'calories'], value)} /></div></div></div>)}
        <div className="row" style={{ gap: 30, marginTop: 14 }}><div><div className="metric">{protein}<small style={{ fontSize: 15 }}>g</small></div><div className="metric-caption">Protein today</div></div><div><div className="metric">{calories}</div><div className="metric-caption">Calories logged</div></div></div>
      </Card>
      <div className="grid two-col" style={{ marginTop: 16 }}><Card title="Water check-in" icon={Waves}><p className="muted" style={{ fontSize: 12 }}>Eight glasses, at your own pace.</p><Water count={data.nutrition.water} onChange={(count) => update('nutrition', 'water', count)} /></Card><Card title="A little note" icon={BookHeart}><TextArea label="How did today feel?" value={data.nutrition.notes} onChange={(value: string) => update('nutrition', 'notes', value)} placeholder="Energy, appetite, a meal you loved…" /></Card></div>
    </>;
  }

  if (page === '/meal-planner') return <>
    <Heading eyebrow="A little prep, a little more ease" title="Meal planner" subtitle="Keep ideas here for the days you don't want to decide." />
    <Card title="Meals & snacks for the week" icon={BookHeart}>{DAYS.map((day, index) => <div className="meal-row" key={day}><div className="meal-label">{day.slice(0, 3)}</div><div className="grid two-col"><TextArea label="Meals" value={data.mealPlan[index].meals} onChange={(value: string) => setPath('mealPlan', [index, 'meals'], value)} placeholder="Breakfast, lunch, dinner…" /><TextArea label="Snacks" value={data.mealPlan[index].snacks} onChange={(value: string) => setPath('mealPlan', [index, 'snacks'], value)} placeholder="Anything to have on hand" /></div></div>)}</Card>
  </>;

  if (page === '/shopping-list') return <>
    <Heading eyebrow="A little list for your next shop" title="Shopping list" subtitle="Collect what you need, and tick things off as you go." action={<button className="btn" onClick={() => { const next: any = {}; Object.keys(data.shopping).forEach((category) => { next[category] = data.shopping[category].filter((item: any) => !item.done); }); setTop('shopping', next); notify('Ticked-off items cleared.'); }}>Clear ticked items</button>} />
    <div className="grid two-col">{Object.keys(data.shopping).map((category) => <Card title={category} icon={ListChecks} key={category}>
      <div className="row"><input className="input" value={newItem[category] ?? ''} onChange={(event) => setNewItem({ ...newItem, [category]: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') listAdd(category); }} placeholder={`Add ${category.toLowerCase()}…`} /><button className="btn small" onClick={() => listAdd(category)} aria-label={`Add to ${category}`}><Plus size={15} /></button></div>
      {data.shopping[category].length ? data.shopping[category].map((item: any) => <div className="row between" key={item.id} style={{ paddingTop: 12 }}><label className="row" style={{ fontSize: 14, color: item.done ? 'var(--muted-foreground)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}><input className="check" type="checkbox" checked={item.done} onChange={(event) => update('shopping', category, data.shopping[category].map((current: any) => current.id === item.id ? { ...current, done: event.target.checked } : current))} />{item.text}</label><button className="icon-btn" onClick={() => update('shopping', category, data.shopping[category].filter((current: any) => current.id !== item.id))} aria-label={`Remove ${item.text}`}><Trash2 size={14} /></button></div>) : <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Nothing on this list yet.</p>}
    </Card>)}</div>
  </>;

  if (page === '/measurements') return <>
    <Heading eyebrow="A record of your own progress" title="Measurements" subtitle="Numbers are information, not a measure of your worth." />
    <div className="grid two-col"><Card title="Measurement guide" icon={Activity}><div className="guide-figure"><div className="body-outline" /><div className="guide-line" style={{ top: '24%' }}><span>Chest</span></div><div className="guide-line" style={{ top: '38%' }}><span>Arm</span></div><div className="guide-line" style={{ top: '52%' }}><span>Waist</span></div><div className="guide-line" style={{ top: '62%' }}><span>Hips</span></div><div className="guide-line" style={{ top: '78%' }}><span>Thigh</span></div></div><p className="muted" style={{ fontSize: 11 }}>For your personal reference only. Measure gently, in the same way each time.</p></Card>
      <Card title="A check-in" icon={BookHeart}><Input label="Date" type="date" value={data.measurements.date} onChange={(value: string) => update('measurements', 'date', value)} /><div className="grid two-col" style={{ marginTop: 13 }}><Input label="Weight (kg)" type="number" value={data.measurements.weight} onChange={(value: string) => update('measurements', 'weight', value)} />{['chest', 'arm', 'waist', 'hips', 'thigh'].map((measurement) => <Input key={measurement} label={`${measurement} (cm)`} type="number" value={data.measurements[measurement]} onChange={(value: string) => update('measurements', measurement, value)} />)}</div></Card></div>
  </>;

  if (page === '/progress-photos') return <>
    <Heading eyebrow="Your journey, in your own time" title="Progress photos" subtitle="Photos are resized and kept only in this browser on this device." />
    <div className="grid two-col">{['Start', 'Latest'].map((period) => <Card title={`${period} · your own reference`} icon={Flower2} key={period}><div className="grid three-col">{['Front', 'Back', 'Side'].map((angle) => {
      const key = `${period.toLowerCase()}-${angle.toLowerCase()}`;
      return <PhotoSlot key={key} label={angle} image={data.photos[key]} onImage={(image: string) => update('photos', key, image)} />;
    })}</div></Card>)}</div>
  </>;

  if (page === '/cardio-tracker') return <>
    <Heading eyebrow="Movement that feels like yours" title="Cardio log" subtitle="Every walk, ride, and joyful stretch counts." />
    <div className="grid two-col"><Card title="Log an activity" icon={Waves}><Input label="Date" type="date" value={data.cardio.date} onChange={(value: string) => update('cardio', 'date', value)} /><Input label="Activity" value={data.cardio.activity} onChange={(value: string) => update('cardio', 'activity', value)} placeholder="Walk, cycling, dance…" /><div className="grid two-col"><Input label="Time (minutes)" type="number" value={data.cardio.time} onChange={(value: string) => update('cardio', 'time', value)} /><Input label="Distance (km)" type="number" value={data.cardio.distance} onChange={(value: string) => update('cardio', 'distance', value)} /><Input label="Calories (optional)" type="number" value={data.cardio.calories} onChange={(value: string) => update('cardio', 'calories', value)} /></div><TextArea label="Notes" value={data.cardio.notes} onChange={(value: string) => update('cardio', 'notes', value)} placeholder="How did it feel?" /></Card>
      <Card title="Keep moving kindly" icon={Heart}><p className="script" style={{ fontSize: 35 }}>movement is a gift</p><p className="muted" style={{ lineHeight: 1.7 }}>There is no minimum distance to count. A little fresh air, a song that makes you move, a walk to clear your head—it all belongs in your story.</p><div className="row" style={{ marginTop: 20 }}><span className="metric">{data.cardio.time || '—'}</span><span className="metric-caption">minutes in this entry</span></div></Card></div>
  </>;

  if (page === '/cycle-tracker') {
    const periods = [...(data.cycle.periods ?? [])].sort((a: any, b: any) => b.startDate.localeCompare(a.startDate));
    const checkIns = [...(data.cycle.checkIns ?? [])].sort((a: any, b: any) => b.date.localeCompare(a.date));
    const latestPeriod = periods[0];
    const cycleLength = Math.min(60, Math.max(15, Number(data.cycle.cycleLength) || 28));
    const nextEstimatedStart = latestPeriod
      ? new Date(new Date(`${latestPeriod.startDate}T12:00:00`).getTime() + cycleLength * 86400000).toISOString().slice(0, 10)
      : '';
    const cycleDay = latestPeriod
      ? Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${latestPeriod.startDate}T12:00:00`).getTime()) / 86400000) + 1
      : 0;
    const symptoms = ['Cramps', 'Bloating', 'Headache', 'Low energy', 'Tender breasts', 'Acne'];
    const savePeriodStart = () => {
      const startDate = data.cycle.periodStartInput;
      if (!startDate) return notify('Choose a start date first.');
      if (periods.some((period: any) => period.startDate === startDate)) return notify('That period start is already in your diary.');
      update('cycle', 'periods', [{ id: Date.now(), startDate, endDate: '' }, ...periods]);
      notify('Period start saved on this device.');
    };
    const saveCheckIn = () => {
      const draft = data.cycle.checkInDraft;
      if (!draft.date) return notify('Choose a date for this check-in.');
      const existing = checkIns.find((entry: any) => entry.date === draft.date);
      const entry = { ...draft, id: existing?.id ?? Date.now() };
      update('cycle', 'checkIns', [entry, ...checkIns.filter((item: any) => item.date !== draft.date)]);
      update('cycle', 'checkInDraft', { date: today, flow: '', mood: '', symptoms: [], notes: '' });
      notify('Cycle check-in saved.');
    };
    return <>
      <Heading eyebrow="A gentle place to notice your patterns" title="Cycle tracker" subtitle="Keep dates and check-ins together, in your own diary." />
      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--line)', background: 'var(--blush)' }}>
        <strong>Just for your own reference</strong>
        <p className="muted" style={{ margin: '5px 0 0', fontSize: 12, lineHeight: 1.6 }}>
          Cycle estimates are based on the dates and usual length you enter. Cycles can vary; these estimates are not medical advice and should not be used for contraception.
        </p>
      </div>
      <div className="grid three-col" style={{ marginBottom: 16 }}>
        <Card title="Cycle day" icon={CalendarDays}><div className="metric">{cycleDay > 0 ? cycleDay : '—'}</div><div className="metric-caption">{latestPeriod ? `Since ${new Date(`${latestPeriod.startDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : 'Log a period start to begin'}</div></Card>
        <Card title="Estimated next start" icon={CalendarDays}><div className="metric" style={{ fontSize: 24 }}>{nextEstimatedStart ? new Date(`${nextEstimatedStart}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</div><div className="metric-caption">{nextEstimatedStart ? 'A rough date based on your usual cycle' : 'Add a period start to see an estimate'}</div></Card>
        <Card title="Usual cycle" icon={Heart}><div className="metric">{cycleLength}<small style={{ fontSize: 14 }}> days</small></div><div className="metric-caption">Edit your usual length below</div></Card>
      </div>
      <div className="grid two-col">
        <Card title="Your usual pattern" icon={CalendarDays}>
          <div className="grid two-col">
            <Input label="Usual cycle length (days)" type="number" min="15" max="60" value={data.cycle.cycleLength} onChange={(value: string) => update('cycle', 'cycleLength', value)} data-testid="input-cycle-length" />
            <Input label="Usual period length (days)" type="number" min="1" max="15" value={data.cycle.periodLength} onChange={(value: string) => update('cycle', 'periodLength', value)} data-testid="input-period-length" />
          </div>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 0 }}>Your estimate uses the most recently logged start date and this cycle length.</p>
        </Card>
        <Card title="Log a period start" icon={CalendarDays}>
          <Input label="First day of bleeding" type="date" value={data.cycle.periodStartInput} onChange={(value: string) => update('cycle', 'periodStartInput', value)} data-testid="input-period-start" />
          <button className="btn primary" onClick={savePeriodStart} style={{ marginTop: 12 }} data-testid="button-log-period">Save period start</button>
        </Card>
      </div>
      <div style={{ marginTop: 16 }}>
        <Card title="Period history" icon={CalendarDays}>
          {periods.length ? periods.map((period: any) => <div className="day-row" key={period.id}>
            <div style={{ flex: 1 }}>
              <strong>Started {new Date(`${period.startDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              <label className="field" style={{ maxWidth: 230, marginTop: 8 }}><span>End date (optional)</span>
                <input className="input" type="date" min={period.startDate} value={period.endDate ?? ''} onChange={(event) => update('cycle', 'periods', periods.map((item: any) => item.id === period.id ? { ...item, endDate: event.target.value } : item))} aria-label={`End date for period starting ${period.startDate}`} data-testid={`input-period-end-${period.id}`} />
              </label>
            </div>
            <button className="icon-btn" onClick={() => update('cycle', 'periods', periods.filter((item: any) => item.id !== period.id))} aria-label="Remove period record" data-testid={`button-remove-period-${period.id}`}><Trash2 size={15} /></button>
          </div>) : <div className="empty-note">Your period dates will appear here after you log a start.</div>}
        </Card>
      </div>
      <div className="grid two-col" style={{ marginTop: 16 }}>
        <Card title="Cycle check-in" icon={Heart}>
          <Input label="Date" type="date" value={data.cycle.checkInDraft.date} onChange={(value: string) => update('cycle', 'checkInDraft', { ...data.cycle.checkInDraft, date: value })} data-testid="input-cycle-checkin-date" />
          <label className="field" style={{ marginTop: 13 }}><span>Flow</span>
            <select className="input" value={data.cycle.checkInDraft.flow} onChange={(event) => update('cycle', 'checkInDraft', { ...data.cycle.checkInDraft, flow: event.target.value })} data-testid="select-cycle-flow">
              <option value="">Choose if relevant</option><option value="Spotting">Spotting</option><option value="Light">Light</option><option value="Medium">Medium</option><option value="Heavy">Heavy</option>
            </select>
          </label>
          <div className="field" style={{ marginTop: 13 }}><span>Symptoms (optional)</span><div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{symptoms.map((symptom) => <label className="btn small" key={symptom} style={{ gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={data.cycle.checkInDraft.symptoms.includes(symptom)} onChange={(event) => {
            const selected = data.cycle.checkInDraft.symptoms;
            update('cycle', 'checkInDraft', { ...data.cycle.checkInDraft, symptoms: event.target.checked ? [...selected, symptom] : selected.filter((item: string) => item !== symptom) });
          }} data-testid={`check-cycle-symptom-${symptom.toLowerCase().replaceAll(' ', '-')}`} />{symptom}</label>)}</div></div>
          <label className="field" style={{ marginTop: 13 }}><span>Mood</span><select className="input" value={data.cycle.checkInDraft.mood} onChange={(event) => update('cycle', 'checkInDraft', { ...data.cycle.checkInDraft, mood: event.target.value })} data-testid="select-cycle-mood"><option value="">Choose if you like</option><option>Steady</option><option>Low</option><option>More sensitive</option><option>Energetic</option><option>Mixed</option></select></label>
          <TextArea label="Notes" value={data.cycle.checkInDraft.notes} onChange={(value: string) => update('cycle', 'checkInDraft', { ...data.cycle.checkInDraft, notes: value })} placeholder="Anything you'd like to remember…" data-testid="input-cycle-notes" />
          <button className="btn primary" onClick={saveCheckIn} style={{ marginTop: 12 }} data-testid="button-save-cycle-checkin">Save check-in</button>
        </Card>
        <Card title="Recent check-ins" icon={BookHeart}>
          {checkIns.length ? checkIns.slice(0, 8).map((entry: any) => <div className="day-row" key={entry.id}>
            <div style={{ flex: 1 }}><strong>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{[entry.flow, entry.mood, ...(entry.symptoms ?? [])].filter(Boolean).join(' · ') || 'Check-in saved'}{entry.notes ? ` — ${entry.notes}` : ''}</div>
            </div>
            <button className="icon-btn" onClick={() => update('cycle', 'checkIns', checkIns.filter((item: any) => item.id !== entry.id))} aria-label="Remove cycle check-in" data-testid={`button-remove-cycle-checkin-${entry.id}`}><Trash2 size={15} /></button>
          </div>) : <div className="empty-note">Your check-ins stay private here and will show up as you add them.</div>}
        </Card>
      </div>
    </>;
  }

  if (page === '/wellbeing') return <>
    <Heading eyebrow="Care for the person behind the progress" title="Mind & mood" subtitle="A soft place to check in with yourself." />
    <Card title="Today's page" icon={Heart}><Input label="Date" type="date" value={data.wellbeing.date} onChange={(value: string) => update('wellbeing', 'date', value)} /><div className="row" style={{ flexWrap: 'wrap', margin: '17px 0' }}><span className="label">Today I feel</span>{['Calm', 'Hopeful', 'Tired', 'Proud', 'A little mixed'].map((mood) => <button key={mood} className={`btn small ${data.wellbeing.mood === mood ? 'primary' : ''}`} onClick={() => update('wellbeing', 'mood', mood)}>{mood}</button>)}</div><div className="grid two-col"><TextArea label="Something I'm grateful for" value={data.wellbeing.gratitude} onChange={(value: string) => update('wellbeing', 'gratitude', value)} placeholder="It can be small." /><TextArea label="What made me happy?" value={data.wellbeing.happy} onChange={(value: string) => update('wellbeing', 'happy', value)} placeholder="A moment worth keeping…" /><TextArea label="One thing I'd like to improve" value={data.wellbeing.improve} onChange={(value: string) => update('wellbeing', 'improve', value)} placeholder="Something gentle and possible." /></div></Card>
  </>;

  if (page === '/glute-focus') return <>
    <Heading eyebrow="Strong hips, strong foundations" title="Glute focus" subtitle="A thoughtful place for your lower-body training." />
    <Card title="Your exercise notebook" icon={Dumbbell}><p className="muted" style={{ fontSize: 12 }}>A few starter ideas to edit or remove—nothing here is a logged workout.</p><div className="table-wrap"><table className="data-table"><thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>A cue to remember</th><th></th></tr></thead><tbody>{data.glutes.map((exercise: any, index: number) => <tr key={index}>{['exercise', 'sets', 'reps', 'note'].map((field) => <td key={field}><input className="table-input" value={exercise[field]} onChange={(event) => setPath('glutes', [index, field], event.target.value)} placeholder={field === 'note' ? 'Your cue…' : field} /></td>)}<td><button className="icon-btn" onClick={() => setTop('glutes', data.glutes.filter((_: any, i: number) => i !== index))} aria-label="Remove exercise"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div><button className="btn small" onClick={() => setTop('glutes', [...data.glutes, { exercise: '', sets: '', reps: '', note: '' }])}><Plus size={14} />Add exercise</button></Card>
    <div className="grid three-col" style={{ marginTop: 16 }}>{[['01', 'Make room to recover', 'Rest is where your body adapts. Let hard sessions have softer days around them.'], ['02', 'Build the movement', 'Choose a range of motion you can control, and make each rep feel deliberate.'], ['03', 'Keep it personal', 'Progress might mean a steadier hinge, better sleep, or feeling more at home in your strength.']].map(([num, titleText, text]) => <div className="card" key={num}><div className="script" style={{ fontSize: 31 }}>{num}</div><h3 className="card-title">{titleText}</h3><p className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 0 }}>{text}</p></div>)}</div>
  </>;

  if (page === '/monthly-overview') {
    const [year, month] = calendarMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const worked = new Set(workouts.map((session: any) => session.date));
    const monthTitle = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return <>
      <Heading eyebrow="A longer look at the little things" title="Monthly view" subtitle="Celebrate the days you showed up in whatever way you could." />
      <Card title={monthTitle} icon={CalendarDays}><div className="row between" style={{ marginBottom: 14 }}><button className="btn small" onClick={() => setCalendarMonth(new Date(year, month - 2, 1).toISOString().slice(0, 7))}>Previous</button><input className="input" type="month" style={{ width: 'auto' }} value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value)} /><button className="btn small" onClick={() => setCalendarMonth(new Date(year, month, 1).toISOString().slice(0, 7))}>Next</button></div>
        <div className="calendar">{SHORT_DAYS.map((day) => <div key={day} className="label" style={{ textAlign: 'center', padding: 7 }}>{day}</div>)}{Array.from({ length: offset }, (_, index) => <div key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const date = `${calendarMonth}-${String(index + 1).padStart(2, '0')}`; return <div key={date} className={`cal-day ${worked.has(date) ? 'worked' : ''}`}><div className="row between"><span>{index + 1}</span>{worked.has(date) && <Check size={13} />}</div></div>; })}</div>
      </Card>
      <div className="grid two-col" style={{ marginTop: 16 }}><Card title="This month's intentions" icon={Sparkles}>{data.monthly.goals.map((goal: string, index: number) => <Input key={index} label={`Intention ${index + 1}`} value={goal} onChange={(value: string) => setPath('monthly', ['goals', index], value)} placeholder="Something to work toward…" />)}</Card><Card title="A note for this month" icon={BookHeart}><TextArea label="What do you want to remember?" value={data.monthly.notes} onChange={(value: string) => update('monthly', 'notes', value)} placeholder="A moment, a lesson, a wish…" /></Card></div>
    </>;
  }

  if (page === '/notes-thoughts') return <>
    <Heading eyebrow="No prompts, no pressure" title="Notes & thoughts" subtitle="A page that's yours to fill—or leave blank." />
    <Card title="Dear diary…" icon={BookHeart}><TextArea label="Free writing" value={data.journal} onChange={(value: string) => setTop('journal', value)} placeholder="Start anywhere. This page saves as you write." style={{ minHeight: '55vh', lineHeight: 1.8, fontFamily: 'var(--app-font-serif)', fontSize: 19 }} /><div className="row between" style={{ marginTop: 11 }}><span className="muted" style={{ fontSize: 11 }}>Saved automatically on this device</span><span className="script">take your time</span></div></Card>
  </>;

  return <Heading eyebrow="Your personal journal" title={title} subtitle="A little space for your own story." />;
}

function PhotoSlot({ label, image, onImage }: any) {
  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const scale = Math.min(1, 900 / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        try { onImage(canvas.toDataURL('image/jpeg', 0.76)); } catch { window.alert('This photo could not be saved. Try a smaller image.'); }
      };
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  return <div><div className="slot">{image ? <img src={image} alt={`${label} progress`} /> : <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 12 }}><Flower2 size={21} color="var(--rose)" /><div style={{ marginTop: 5 }}>{label} view</div></div>}<div className="slot-controls"><label className="btn small" style={{ cursor: 'pointer' }}><input type="file" accept="image/*" hidden onChange={(event) => handleFile(event.target.files?.[0])} />{image ? 'Replace' : 'Add photo'}</label>{image && <button className="btn small" onClick={() => onImage('')}>Remove</button>}</div></div><div className="label" style={{ textAlign: 'center', marginTop: 8 }}>{label}</div></div>;
}

export default App;
