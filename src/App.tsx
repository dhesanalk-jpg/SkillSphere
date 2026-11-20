import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowLeftRight, ArrowRight, Award, Bell, Bookmark, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, Crown,
  Flame, GraduationCap, LayoutDashboard, Lightbulb, LogOut, Menu, MessageCircle, Plus,
  Search, Settings, ShieldCheck, Sparkles, Star, Target, TrendingUp, Users, X, Zap
} from 'lucide-react'
import { seedPeople, categories, timeOptions } from './data'
import { bestTime, findSkillChains, scoreMatch, type Person } from './lib/matching'
import { cloudEnabled } from './lib/supabase'
import { apiEnabled, getRemoteState, saveRemoteState } from './lib/api'

type Booking = { id:string; personId:string; skill:string; time:string; status:'Pending'|'Confirmed'|'Completed'; date:string }
type Review = { id:string; personId:string; rating:number; note:string }
type Page = 'Overview'|'Discover'|'SkillChain'|'My Skill DNA'|'Sessions'|'Progress'|'Community'
const STORE = 'skillsphere-v1'

const initialMe: Person = {
  id:'me', name:'You', handle:'@you', role:'Curious builder', location:'Bengaluru, India',
  bio:'I believe everyone has something worth teaching and something worth learning.',
  avatar:'YO', color:'violet', teaches:['Java','React'], learns:['Graphic Design','Figma','Photography'],
  level:'Intermediate', rating:5, sessions:3, availability:['Weekday evenings','Saturday morning','Sunday afternoon'],
  format:'Both', interests:['Technology','Design','Startups'], verified:true, projects:['My first portfolio']
}

function loadState() {
  try { const raw = localStorage.getItem(STORE); if (raw) return JSON.parse(raw) } catch {}
  return { me: initialMe, people: seedPeople, bookings: [
    {id:'b1',personId:'u2',skill:'Graphic Design',time:'Saturday morning',status:'Confirmed',date:'Nov 22'},
    {id:'b2',personId:'u5',skill:'Python',time:'Sunday afternoon',status:'Pending',date:'Nov 23'}
  ], reviews: [] as Review[] }
}
const initials = (name:string) => name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()
const personName = (id:string, people:Person[], me:Person) => id === 'me' ? me.name : people.find(p=>p.id===id)?.name || 'Community member'
const nav: {name:Page; icon:any; section?:string}[] = [
  {name:'Overview',icon:LayoutDashboard,section:'WORKSPACE'},
  {name:'Discover',icon:Compass},
  {name:'SkillChain',icon:ArrowLeftRight},
  {name:'My Skill DNA',icon:Sparkles,section:'MY JOURNEY'},
  {name:'Sessions',icon:CalendarDays},
  {name:'Progress',icon:TrendingUp},
  {name:'Community',icon:Users}
]

export default function App() {
  const [state,setState] = useState(loadState)
  const [apiReady,setApiReady] = useState(!apiEnabled)
  const [page,setPage] = useState<Page>('Overview')
  const [search,setSearch] = useState('')
  const [category,setCategory] = useState('All skills')
  const [showProfile,setShowProfile] = useState(false)
  const [showEdit,setShowEdit] = useState(false)
  const [showBooking,setShowBooking] = useState<Person|null>(null)
  const [toast,setToast] = useState('')
  const [mobileNav,setMobileNav] = useState(false)
  const [activeTab,setActiveTab] = useState<'direct'|'all'>('direct')
  const [bookingSkill,setBookingSkill] = useState('')
  const [bookingTime,setBookingTime] = useState('Saturday morning')
  const [reviewTarget,setReviewTarget] = useState<Booking|null>(null)
  const [reviewText,setReviewText] = useState('')
  const [reviewRating,setReviewRating] = useState(5)

  useEffect(()=>{ localStorage.setItem(STORE,JSON.stringify(state)) },[state])
  useEffect(()=>{
    if(!apiEnabled)return
    let active=true
    getRemoteState().then(remote=>{if(active)setState(remote as any)}).catch(error=>{
      console.error(error)
      if(active)setToast('Backend unavailable. Continuing with this device’s saved demo data.')
    }).finally(()=>{if(active)setApiReady(true)})
    return ()=>{active=false}
  },[])
  useEffect(()=>{
    if(!apiEnabled || !apiReady)return
    const timer=window.setTimeout(()=>{
      saveRemoteState(state as any).catch(error=>console.error('Could not sync SkillSphere state:',error))
    },350)
    return ()=>window.clearTimeout(timer)
  },[state,apiReady])
  useEffect(()=>{ if(toast){const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t)} },[toast])

  const me = state.me as Person
  const people = state.people as Person[]
  const bookings = state.bookings as Booking[]
  const matches = useMemo(()=>people.map(p=>scoreMatch(me,p)).filter(Boolean).sort((a:any,b:any)=>b.score-a.score),[me,people]) as NonNullable<ReturnType<typeof scoreMatch>>[]
  const chains = useMemo(()=>findSkillChains(me,people),[me,people])
  const filteredPeople = people.filter(p=>{
    const q=search.toLowerCase()
    const matchesSearch=!q || [p.name,p.role,...p.teaches,...p.learns].join(' ').toLowerCase().includes(q)
    const matchesCategory=category==='All skills' || [...p.teaches,...p.learns].some(s=>s.toLowerCase().includes(category.toLowerCase()))
    return matchesSearch && matchesCategory
  })
  const completed=bookings.filter(b=>b.status==='Completed').length
  const upcoming=bookings.filter(b=>b.status!=='Completed').length

  function notify(s:string){setToast(s)}
  function updateMe(patch:Partial<Person>){setState((s:any)=>({...s,me:{...s.me,...patch}}))}
  function openBooking(p:Person){setShowBooking(p);setBookingSkill(p.teaches.find(s=>me.learns.some(w=>w.toLowerCase()===s.toLowerCase()))||p.teaches[0]||'Skill exchange')}
  function confirmBooking(){
    if(!showBooking)return
    const item:Booking={id:crypto.randomUUID(),personId:showBooking.id,skill:bookingSkill,time:bookingTime,status:'Pending',date:'To be confirmed'}
    setState((s:any)=>({...s,bookings:[item,...s.bookings]}));setShowBooking(null);notify('Exchange request sent. Your next skill story starts here.')
  }
  function updateBooking(id:string,status:Booking['status']){
    setState((s:any)=>({...s,bookings:s.bookings.map((b:Booking)=>b.id===id?{...b,status}:b)}))
    notify(status==='Completed'?'Session completed. Add a review to recognise your partner.':`Session marked ${status.toLowerCase()}.`)
  }
  function submitReview(){
    if(!reviewTarget)return
    setState((s:any)=>({...s,reviews:[...s.reviews,{id:crypto.randomUUID(),personId:reviewTarget.personId,rating:reviewRating,note:reviewText}]}))
    updateBooking(reviewTarget.id,'Completed');setReviewTarget(null);setReviewText('');notify('Your feedback has been added.')
  }
  function addSkill(kind:'teaches'|'learns',value:string){
    if(!value.trim())return
    updateMe({[kind]:Array.from(new Set([...me[kind],value.trim()]))} as any);notify(`${value} added to your Skill DNA.`)
  }
  const go=(p:Page)=>{setPage(p);setMobileNav(false)}

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20}/></div><span>skill<span className="brand-light">sphere</span><sup>β</sup></span><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-label">YOUR SPACE</div>
      <div className="profile-mini" onClick={()=>setShowProfile(true)}><div className="avatar avatar-me">{me.avatar||initials(me.name)}</div><div className="profile-mini-text"><b>{me.name}</b><span>{me.role}</span></div><ChevronDown size={15}/></div>
      <nav className="side-nav">{nav.map((n,i)=><div key={n.name}>{n.section&&<div className="nav-section">{n.section}</div>}<button className={`nav-link ${page===n.name?'active':''}`} onClick={()=>go(n.name)}><n.icon size={17}/><span>{n.name}</span>{n.name==='SkillChain'&&<span className="nav-new">NEW</span>}</button></div>)}</nav>
      <div className="sidebar-bottom"><div className="invite-card"><div className="invite-icon"><Lightbulb size={17}/></div><b>Knowledge grows when shared.</b><p>Invite a friend and expand your Skill Galaxy.</p><button onClick={()=>{navigator.clipboard?.writeText(location.href);notify('Invite link copied!')}}>Invite a friend <ArrowUpRightIcon/></button></div><button className="nav-link muted" onClick={()=>notify('Settings are coming soon.')}><Settings size={17}/>Settings</button><div className="sidebar-foot"><span className="online-dot"/> Community is growing <span>·</span> v1.0</div></div>
    </aside>
    {mobileNav&&<div className="mobile-scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/><b>{page}</b></div><div className="top-actions"><div className="search-top"><Search size={16}/><input placeholder="Search skills, people..." value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value)go('Discover')}}/><kbd>⌘ K</kbd></div><button className="icon-button" onClick={()=>notify('You are all caught up!')}><Bell size={18}/><i/></button><button className="top-avatar" onClick={()=>setShowProfile(true)}>{me.avatar||initials(me.name)}</button></div></header>
      <div className="page-content">
        {page==='Overview'&&<Overview me={me} matches={matches} chains={chains} bookings={bookings} people={people} go={go} openBooking={openBooking} setShowProfile={setShowProfile} completed={completed} upcoming={upcoming}/>}
        {page==='Discover'&&<Discover people={filteredPeople} matches={matches} me={me} search={search} setSearch={setSearch} category={category} setCategory={setCategory} openBooking={openBooking}/>}
        {page==='SkillChain'&&<SkillChain chains={chains} me={me} openBooking={openBooking} people={people}/>}
        {page==='My Skill DNA'&&<SkillDNA me={me} onAdd={addSkill} onEdit={()=>setShowEdit(true)}/>}
        {page==='Sessions'&&<Sessions bookings={bookings} people={people} me={me} updateBooking={updateBooking} onReview={setReviewTarget}/>}
        {page==='Progress'&&<Progress me={me} bookings={bookings} completed={completed} reviews={state.reviews}/>}
        {page==='Community'&&<Community people={people} go={go}/>}
      </div>
      <footer className="footer"><span>© 2025 SkillSphere</span><span>Built on the belief that everyone has something to teach.</span><span className="cloud-status"><span className="online-dot"/>{cloudEnabled||apiEnabled?'Cloud connected':'Demo mode · saved on this device'}</span></footer>
    </main>
    {showProfile&&<Modal title="Your profile" onClose={()=>setShowProfile(false)}><div className="profile-modal"><div className="avatar avatar-large avatar-me">{me.avatar||initials(me.name)}</div><h2>{me.name}</h2><p>{me.role} · {me.location}</p><p className="muted-text">{me.bio}</p><div className="profile-modal-stats"><div><b>{me.teaches.length}</b><span>Teaching</span></div><div><b>{me.learns.length}</b><span>Learning</span></div><div><b>{me.sessions}</b><span>Sessions</span></div></div><button className="btn-primary full" onClick={()=>{setShowProfile(false);setShowEdit(true)}}>Edit Skill DNA</button></div></Modal>}
    {showEdit&&<EditProfile me={me} onClose={()=>setShowEdit(false)} onSave={patch=>{updateMe(patch);setShowEdit(false);notify('Your Skill DNA has been updated.')}}/>}
    {showBooking&&<Modal title="Propose a skill exchange" onClose={()=>setShowBooking(null)}><div className="booking-person"><div className={`avatar avatar-${showBooking.color}`}>{showBooking.avatar}</div><div><b>{showBooking.name}</b><span>{showBooking.role}</span></div><span className="match-score">{matches.find(m=>m.person.id===showBooking.id)?.score||'—'}% match</span></div><label className="field-label">What would you like to learn?</label><select value={bookingSkill} onChange={e=>setBookingSkill(e.target.value)}>{showBooking.teaches.map(s=><option key={s}>{s}</option>)}</select><label className="field-label">Preferred shared time</label><select value={bookingTime} onChange={e=>setBookingTime(e.target.value)}>{(bestTime(me,showBooking).length?bestTime(me,showBooking):timeOptions).map(s=><option key={s}>{s}</option>)}</select><div className="notice"><ShieldCheck size={16}/> No money changes hands. This is a mutual knowledge exchange.</div><button className="btn-primary full" onClick={confirmBooking}>Send exchange request <ArrowRight size={16}/></button></Modal>}
    {reviewTarget&&<Modal title="Celebrate the exchange" onClose={()=>setReviewTarget(null)}><p className="muted-text">How was your session with {personName(reviewTarget.personId,people,me)}?</p><div className="rating-picker">{[1,2,3,4,5].map(n=><button key={n} className={n<=reviewRating?'selected':''} onClick={()=>setReviewRating(n)}><Star size={25} fill="currentColor"/></button>)}</div><textarea className="review-input" placeholder="What did you learn? What made this exchange valuable?" value={reviewText} onChange={e=>setReviewText(e.target.value)}/><button className="btn-primary full" onClick={submitReview}>Submit review & complete session</button></Modal>}
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function ArrowUpRightIcon(){return <ArrowRight size={14}/>}

function PageHeading({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:any}){
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>
}
function Overview({me,matches,chains,bookings,people,go,openBooking,setShowProfile,completed,upcoming}:any){
  const top=matches.slice(0,3)
  return <><PageHeading eyebrow="FRIDAY, NOVEMBER 20, 2026" title={<>Make room for <span className="gradient-text">something new.</span></>} desc="Your next skill exchange is closer than you think." action={<button className="btn-primary" onClick={()=>go('Discover')}><Compass size={16}/> Explore matches</button>}/>
    <section className="welcome-banner"><div className="welcome-copy"><div className="banner-kicker"><Sparkles size={14}/> YOUR SKILL JOURNEY, IN MOTION</div><h2>What you know can<br/>unlock what’s next.</h2><p>You have <b>{matches.length} potential skill partners</b> waiting to connect. Your next exchange could spark something brilliant.</p><button className="btn-white" onClick={()=>go('SkillChain')}>Explore SkillChain <ArrowRight size={15}/></button></div><div className="banner-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><Sparkles size={32}/></div><div className="orbit-node node-a">JS</div><div className="orbit-node node-b">✦</div><div className="orbit-node node-c">F</div><div className="orbit-node node-d">↗</div><div className="orbit-caption">YOUR SKILL GALAXY</div></div></section>
    <div className="stats-grid">
      <Stat icon={Users} label="Potential matches" value={String(matches.length)} note="Based on two-way fit" tone="purple"/>
      <Stat icon={CalendarDays} label="Upcoming sessions" value={String(upcoming)} note="Keep the momentum" tone="blue"/>
      <Stat icon={Award} label="Exchanges completed" value={String(completed)} note="Knowledge shared" tone="orange"/>
      <Stat icon={Flame} label="Learning streak" value="4 days" note="You're building a habit" tone="green"/>
    </div>
    <div className="section-head"><div><div className="eyebrow">A GOOD PLACE TO START</div><h2>Your strongest connections</h2><p>People whose learning goals complement yours.</p></div><button className="text-link" onClick={()=>go('Discover')}>View all matches <ArrowRight size={15}/></button></div>
    <div className="match-grid">{top.map((m:any)=><MatchCard key={m.person.id} match={m} onConnect={()=>openBooking(m.person)}/>)}</div>
    <div className="lower-grid"><section className="panel"><div className="panel-head"><div><h3>Upcoming exchanges</h3><p>A little learning goes a long way.</p></div><button className="icon-soft" onClick={()=>go('Sessions')}><ArrowRight size={16}/></button></div>{bookings.slice(0,3).map((b:Booking)=><div className="upcoming-row" key={b.id}><div className="date-tile"><b>{b.date.split(' ')[1]||'22'}</b><span>{b.date.split(' ')[0]||'NOV'}</span></div><div className="upcoming-info"><b>{b.skill}</b><span>with {personName(b.personId,people,me)} · {b.time}</span></div><Status status={b.status}/></div>)}{!bookings.length&&<Empty text="Your next exchange will appear here."/>}</section>
      <section className="panel skillchain-teaser"><div className="teaser-top"><div className="teaser-icon"><ArrowLeftRight size={18}/></div><span className="pill-new">A DIFFERENT WAY TO SWAP</span></div><h3>Good things come<br/>in threes.</h3><p>Can't find a perfect one-to-one match? SkillChain connects three people in one beautiful loop of learning.</p><div className="mini-chain"><span>YOU</span><i/><span>PEER A</span><i/><span>PEER B</span><i className="loop-line"/><span className="loop-label">↻</span></div><button className="text-link" onClick={()=>go('SkillChain')}>Discover your chain <ArrowRight size={15}/></button></section></div>
    <div className="bottom-nudge"><div className="nudge-icon"><Target size={19}/></div><div><b>Your Skill DNA is your superpower.</b><span>Keep your skills and availability up to date for better matches.</span></div><button onClick={()=>go('My Skill DNA')}>Update profile <ArrowRight size={14}/></button></div>
  </>
}
function Stat({icon:Icon,label,value,note,tone}:any){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-note">{note}</div></div>}
function Status({status}:any){return <span className={`status status-${status.toLowerCase()}`}>{status}</span>}
function MatchCard({match,onConnect}:any){const p=match.person;return <div className="match-card"><div className="match-card-top"><div className={`avatar avatar-${p.color}`}>{p.avatar}</div><div className="match-score"><Sparkles size={12}/>{match.score}% fit</div><button className="bookmark" title="Save profile"><Bookmark size={16}/></button></div><h3>{p.name} {p.verified&&<ShieldCheck className="verified" size={14}/>}</h3><p className="person-role">{p.role} · {p.location}</p><div className="exchange-arrows"><div><span className="mini-label">THEY TEACH</span><b>{match.reasons[0].replace(`${p.name.split(' ')[0]} can teach you `,'')}</b></div><ArrowLeftRight size={17}/><div><span className="mini-label">YOU TEACH</span><b>{match.reasons[1].replace(`You can teach ${p.name.split(' ')[0]} `,'')}</b></div></div><div className="match-reason"><CheckCircle2 size={14}/>{match.reasons[2]}</div><button className="btn-outline full" onClick={onConnect}>Propose exchange <ArrowRight size={15}/></button></div>}
function Discover({people,matches,me,search,setSearch,category,setCategory,openBooking}:any){return <><PageHeading eyebrow="FIND YOUR PEOPLE" title={<>Your next <span className="gradient-text">aha moment</span> is out there.</>} desc="Discover people who can teach what you want to learn — and want to learn what you know."/><div className="discover-tools"><div className="discover-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Try “Java”, “design” or a person's name..."/><kbd>⌘ K</kbd></div><div className="filter-row"><button className={category==='All skills'?'filter active':'filter'} onClick={()=>setCategory('All skills')}>All skills</button>{categories.map(c=><button key={c} className={category===c?'filter active':'filter'} onClick={()=>setCategory(c)}>{c}</button>)}</div></div><div className="section-head compact"><div><h2>People worth learning with <span className="count-bubble">{people.length}</span></h2><p>Ranked by reciprocal skill fit, shared time and learning interests.</p></div><div className="sort-label"><Sparkles size={14}/> Best match first</div></div><div className="discover-grid">{people.map((p:Person)=>{const m=matches.find((x:any)=>x.person.id===p.id);return <MatchCard key={p.id} match={m||{person:p,score:0,reasons:[`Teaches ${p.teaches.slice(0,2).join(', ')}`,`Wants ${p.learns.slice(0,2).join(', ')}`,'Explore a possible connection'],type:'direct'}} onConnect={()=>openBooking(p)}/>})}</div>{!people.length&&<Empty text="No people found. Try a different skill or category."/>}</>}
function SkillChain({chains,me,openBooking,people}:any){return <><PageHeading eyebrow="THE CIRCULAR EXCHANGE ENGINE" title={<>Think beyond <span className="gradient-text">one-to-one.</span></>} desc="SkillChain finds learning loops where three people can help one another — even when no direct swap exists." action={<span className="beta-chip"><Sparkles size={13}/> EXPERIMENTAL FEATURE</span>}/><div className="chain-hero"><div><div className="banner-kicker"><Zap size={14}/> THE POWER OF THREE</div><h2>One person's skill<br/>can unlock another's.</h2><p>Traditional swaps need a perfect pair. SkillChain builds a circle of value, so knowledge keeps moving.</p><div className="chain-hero-stats"><div><b>{chains.length}</b><span>Potential loops found</span></div><div><b>3</b><span>People in a loop</span></div><div><b>0₹</b><span>Money exchanged</span></div></div></div><div className="chain-visual"><div className="chain-ring"/><div className="chain-person cp1">YOU</div><div className="chain-person cp2">A</div><div className="chain-person cp3">B</div><div className="chain-center"><ArrowLeftRight size={25}/><span>SKILL<br/>FLOW</span></div><div className="chain-arrow ca1">↗</div><div className="chain-arrow ca2">↘</div><div className="chain-arrow ca3">↖</div></div></div><div className="section-head"><div><div className="eyebrow">YOUR DISCOVERED LOOPS</div><h2>Potential SkillChains</h2><p>Illustrative matching based on complementary teach/learn goals.</p></div><span className="count-bubble">{chains.length} found</span></div>{chains.map((c:any,i:number)=><div className="chain-card" key={i}><div className="chain-card-head"><div><span className="chain-index">LOOP 0{i+1}</span><h3>{c.score}% circular compatibility</h3></div><span className="chain-badge"><Sparkles size={13}/> 3-way exchange</span></div><div className="chain-flow"><div className="chain-member"><div className="avatar avatar-me">{me.avatar}</div><b>You</b><span>{c.skills[2]} learner</span></div><div className="flow-arrow"><span>teaches {c.skills[0]}</span><ArrowRight size={20}/></div><div className={`chain-member`}><div className={`avatar avatar-${c.people[0].color}`}>{c.people[0].avatar}</div><b>{c.people[0].name}</b><span>{c.skills[0]} learner</span></div><div className="flow-arrow"><span>teaches {c.skills[1]}</span><ArrowRight size={20}/></div><div className="chain-member"><div className={`avatar avatar-${c.people[1].color}`}>{c.people[1].avatar}</div><b>{c.people[1].name}</b><span>{c.skills[1]} learner</span></div></div><div className="chain-card-foot"><span><CheckCircle2 size={14}/> {c.skills[2]} completes the loop back to you</span><button className="btn-primary small" onClick={()=>openBooking(c.people[0])}>Explore this chain <ArrowRight size={14}/></button></div></div>)}{!chains.length&&<Empty text="No complete three-person loop yet. Add more skills to your Skill DNA to unlock circular matches."/>}<div className="notice wide"><Lightbulb size={17}/><span><b>How the engine works:</b> It checks whether you can teach person A, A can teach person B, and B can teach you. It also considers shared availability. A suggested chain is a proposal — all participants must agree before it becomes an exchange.</span></div></>}
function SkillDNA({me,onAdd,onEdit}:any){const [teach,setTeach]=useState('');const [learn,setLearn]=useState('');return <><PageHeading eyebrow="YOUR LIVING SKILL PROFILE" title={<>Your knowledge has a <span className="gradient-text">fingerprint.</span></>} desc="A richer picture of what you can share, what you're curious about and how you like to learn." action={<button className="btn-outline" onClick={onEdit}><Settings size={15}/> Edit profile</button>}/><div className="dna-layout"><div className="panel dna-main"><div className="dna-profile"><div className="avatar avatar-large avatar-me">{me.avatar}</div><div><h2>{me.name}</h2><p>{me.role} · {me.location}</p><span className="verified-line"><ShieldCheck size={14}/> Community member</span></div></div><div className="profile-completeness"><div className="progress-head"><span>Profile completeness</span><b>82%</b></div><div className="progress-track"><i style={{width:'82%'}}/></div><small>Add a project or learning goal to strengthen your profile.</small></div><div className="dna-section"><div className="dna-section-title"><div className="skill-icon teach"><GraduationCap size={17}/></div><div><h3>Skills I can teach</h3><p>Knowledge you're ready to share.</p></div></div><div className="tag-list">{me.teaches.map((s:string)=><span className="skill-tag teach-tag" key={s}>{s}<Check size={12}/></span>)}</div><div className="add-skill"><input value={teach} onChange={e=>setTeach(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(onAdd('teaches',teach),setTeach(''))} placeholder="Add a skill you can teach..."/><button onClick={()=>{onAdd('teaches',teach);setTeach('')}}><Plus size={16}/> Add</button></div></div><div className="dna-section"><div className="dna-section-title"><div className="skill-icon learn"><Target size={17}/></div><div><h3>Skills I want to learn</h3><p>Your next curiosity starts here.</p></div></div><div className="tag-list">{me.learns.map((s:string)=><span className="skill-tag learn-tag" key={s}>{s}<Sparkles size={12}/></span>)}</div><div className="add-skill"><input value={learn} onChange={e=>setLearn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(onAdd('learns',learn),setLearn(''))} placeholder="Add a skill you want to learn..."/><button onClick={()=>{onAdd('learns',learn);setLearn('')}}><Plus size={16}/> Add</button></div></div><div className="dna-section"><div className="dna-section-title"><div className="skill-icon time"><Clock3 size={17}/></div><div><h3>When I'm available</h3><p>Shared windows improve your match quality.</p></div></div><div className="tag-list">{me.availability.map((s:string)=><span className="skill-tag time-tag" key={s}>{s}</span>)}</div></div></div><div className="dna-side"><div className="panel"><div className="eyebrow">YOUR SKILL SIGNATURE</div><h3>Curiosity profile</h3><div className="skill-radar"><div className="radar-ring r1"/><div className="radar-ring r2"/><div className="radar-ring r3"/><div className="radar-shape"/><span className="radar-label l1">TECH</span><span className="radar-label l2">DESIGN</span><span className="radar-label l3">CREATIVE</span><span className="radar-label l4">PEOPLE</span></div><p className="muted-text center">A visual snapshot of your interests. Add skills to shape your constellation.</p></div><div className="panel"><div className="panel-head"><h3>Learning preferences</h3><button className="icon-soft" onClick={onEdit}><Settings size={15}/></button></div><div className="preference-row"><span>Session format</span><b>{me.format}</b></div><div className="preference-row"><span>Current level</span><b>{me.level}</b></div><div className="preference-row"><span>Interests</span><b>{me.interests.length} areas</b></div></div></div></div></>}
function Sessions({bookings,people,me,updateBooking,onReview}:any){return <><PageHeading eyebrow="MAKE TIME FOR GROWTH" title={<>Learning happens <span className="gradient-text">together.</span></>} desc="All your proposed, confirmed and completed exchanges in one place."/><div className="stats-grid three"><Stat icon={CalendarDays} label="Total sessions" value={String(bookings.length)} note="Across your journey" tone="purple"/><Stat icon={Clock3} label="Awaiting action" value={String(bookings.filter((b:Booking)=>b.status==='Pending').length)} note="Requests to follow up" tone="orange"/><Stat icon={CheckCircle2} label="Completed" value={String(bookings.filter((b:Booking)=>b.status==='Completed').length)} note="Skills exchanged" tone="green"/></div><div className="panel sessions-panel"><div className="panel-head"><div><h3>Your exchange calendar</h3><p>Coordinate with your learning partners.</p></div><span className="status status-confirmed">All exchanges are free</span></div>{bookings.map((b:Booking)=><div className="session-row" key={b.id}><div className="session-date"><CalendarDays size={18}/><span>{b.date}</span></div><div className="session-details"><b>{b.skill} exchange</b><span>with {personName(b.personId,people,me)} · {b.time}</span></div><Status status={b.status}/><div className="session-actions">{b.status==='Pending'&&<button className="btn-outline small" onClick={()=>updateBooking(b.id,'Confirmed')}>Confirm</button>}{b.status==='Confirmed'&&<button className="btn-primary small" onClick={()=>onReview(b)}>Complete & review</button>}{b.status==='Completed'&&<span className="completed-label"><CheckCircle2 size={14}/> Done</span>}</div></div>)}{!bookings.length&&<Empty text="No sessions yet. Discover a partner and propose your first exchange."/>}</div></>}
function Progress({me,bookings,completed,reviews}:any){const total=bookings.length;return <><PageHeading eyebrow="SMALL STEPS, REAL GROWTH" title={<>Look how far <span className="gradient-text">you've come.</span></>} desc="Progress is more than a number. It's the knowledge you share and the things you can now do."/><div className="progress-hero"><div><div className="banner-kicker"><TrendingUp size={14}/> YOUR GROWTH SNAPSHOT</div><h2>Every exchange<br/>adds a new perspective.</h2><p>Keep showing up, keep sharing and your skills will compound.</p></div><div className="progress-score"><div className="score-circle"><b>{Math.min(100,completed*20+18)}<small>%</small></b></div><span>Journey momentum</span></div></div><div className="stats-grid"><Stat icon={GraduationCap} label="Skills you teach" value={String(me.teaches.length)} note="Knowledge you give" tone="purple"/><Stat icon={Target} label="Skills you're learning" value={String(me.learns.length)} note="Curiosity in action" tone="blue"/><Stat icon={CheckCircle2} label="Completed exchanges" value={String(completed)} note="Shared learning moments" tone="green"/><Stat icon={Star} label="Reviews received" value={String(reviews.length)} note="Community appreciation" tone="orange"/></div><div className="lower-grid"><div className="panel"><div className="panel-head"><div><h3>Your learning milestones</h3><p>Keep moving toward your next achievement.</p></div></div>{[{n:'First connection',d:'Find a person whose skills complement yours.',done:total>0},{n:'First exchange',d:'Complete your first knowledge swap.',done:completed>0},{n:'Knowledge multiplier',d:'Complete five exchanges with the community.',done:completed>=5},{n:'Community catalyst',d:'Teach three different people.',done:completed>=3}].map((m,i)=><div className="milestone" key={m.n}><div className={`milestone-icon ${m.done?'done':''}`}>{m.done?<Check size={16}/>:<span>0{i+1}</span>}</div><div><b>{m.n}</b><span>{m.d}</span></div><span className={`milestone-state ${m.done?'earned':''}`}>{m.done?'ACHIEVED':'IN PROGRESS'}</span></div>)}</div><div className="panel"><div className="panel-head"><div><h3>ProofPath</h3><p>Turn learning into something tangible.</p></div><span className="pill-new">COMING NEXT</span></div><div className="proof-illustration"><div className="proof-doc"><div/><div/><div/><div/></div><div className="proof-spark"><Sparkles size={23}/></div></div><h3 className="proof-title">Show what you know.</h3><p className="muted-text">Attach a mini-project, practice task or portfolio artifact to a completed exchange. Your progress becomes visible evidence, not just attendance.</p></div></div></>}
function Community({people,go}:any){return <><PageHeading eyebrow="THE PEOPLE MAKE THE PLATFORM" title={<>A community of <span className="gradient-text">open minds.</span></>} desc="Meet curious people, generous teachers and lifelong learners."/><div className="community-banner"><div><div className="banner-kicker"><Users size={14}/> THE SKILLSPHERE COMMUNITY</div><h2>Everyone is an expert<br/>at something.</h2><p>And everyone is a beginner somewhere else. That's what makes this community work.</p></div><div className="community-orbit"><div className="community-avatar ca1">AM</div><div className="community-avatar ca2">MS</div><div className="community-avatar ca3">KR</div><div className="community-avatar ca4">NI</div><div className="community-avatar ca5">DM</div><div className="community-center"><Users size={24}/></div></div></div><div className="stats-grid three"><Stat icon={Users} label="Community members" value={String(people.length+1)} note="And growing" tone="purple"/><Stat icon={GraduationCap} label="Skills in circulation" value={String(new Set(people.flatMap((p:Person)=>[...p.teaches,...p.learns])).size)} note="Across disciplines" tone="blue"/><Stat icon={Sparkles} label="Potential connections" value={String(people.length*2)} note="New paths to discover" tone="green"/></div><div className="section-head"><div><h2>People to know</h2><p>Find your next learning partner.</p></div><button className="text-link" onClick={()=>go('Discover')}>Discover people <ArrowRight size={15}/></button></div><div className="people-grid">{people.slice(0,6).map((p:Person)=><div className="person-tile" key={p.id}><div className={`avatar avatar-${p.color}`}>{p.avatar}</div><b>{p.name}</b><span>{p.role}</span><div className="tag-list compact-tags">{p.teaches.slice(0,2).map(s=><span className="tiny-tag" key={s}>{s}</span>)}</div></div>)}</div></>}
function Empty({text}:{text:string}){return <div className="empty-state"><div><Search size={22}/></div><b>Nothing here just yet</b><p>{text}</p></div>}
function Modal({title,children,onClose}:any){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-soft" onClick={onClose}><X size={18}/></button></div>{children}</div></div>}
function EditProfile({me,onClose,onSave}:any){const [name,setName]=useState(me.name);const [role,setRole]=useState(me.role);const [bio,setBio]=useState(me.bio);const [format,setFormat]=useState(me.format);const [level,setLevel]=useState(me.level);const [times,setTimes]=useState(me.availability as string[]);return <Modal title="Edit your Skill DNA" onClose={onClose}><label className="field-label">Your name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)}/><label className="field-label">What do you do?</label><input className="form-input" value={role} onChange={e=>setRole(e.target.value)}/><label className="field-label">A little about you</label><textarea className="review-input" value={bio} onChange={e=>setBio(e.target.value)}/><label className="field-label">Current skill level</label><select value={level} onChange={e=>setLevel(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><label className="field-label">Preferred session format</label><select value={format} onChange={e=>setFormat(e.target.value)}><option>Online</option><option>In-person</option><option>Both</option></select><label className="field-label">Availability windows</label><div className="time-checks">{timeOptions.map(t=><label key={t}><input type="checkbox" checked={times.includes(t)} onChange={e=>setTimes(e.target.checked?[...times,t]:times.filter(x=>x!==t))}/>{t}</label>)}</div><button className="btn-primary full" onClick={()=>onSave({name,role,bio,format,level,availability:times,avatar:initials(name)})}>Save changes <Check size={15}/></button></Modal>}
