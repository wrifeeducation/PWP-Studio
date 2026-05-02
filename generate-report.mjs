import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer
} from '/sessions/festive-trusting-volta/mnt/wrifeapp/node_modules/docx/dist/index.mjs'
import { writeFileSync } from 'fs'

const PURPLE = '6C5CE7', RED = 'C0392B', ORANGE = 'E67E22'
const GREEN = '27AE60', DARK = '1A1A2E', GREY = '636E72', LG = 'F4F5F7', W = 'FFFFFF'

const b1 = { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' }
const allB = { top: b1, bottom: b1, left: b1, right: b1 }
const noB = { top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.NONE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE} }

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing:{before:440,after:200}, children:[new TextRun({text:t,bold:true,font:'Arial',size:36,color:DARK})] })
const h2 = (t, c=PURPLE) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{before:320,after:140}, children:[new TextRun({text:t,bold:true,font:'Arial',size:26,color:c})] })
const para = (t) => new Paragraph({ spacing:{before:60,after:80}, children:[new TextRun({text:t,font:'Arial',size:20,color:DARK})] })
const paraRuns = (runs) => new Paragraph({ spacing:{before:60,after:80}, children:runs })
const gap = (n=1) => Array.from({length:n},()=>new Paragraph({children:[new TextRun({text:''})],spacing:{before:30,after:30}}))
const bld = (t,c=DARK) => new TextRun({text:t,bold:true,font:'Arial',size:20,color:c})
const nrm = (t) => new TextRun({text:t,font:'Arial',size:20,color:DARK})
const bullet = (t) => new Paragraph({ numbering:{reference:'bullets',level:0}, spacing:{before:40,after:40}, children:[new TextRun({text:t,font:'Arial',size:20,color:DARK})] })
const num = (runs) => new Paragraph({ numbering:{reference:'numbers',level:0}, spacing:{before:40,after:40}, children:runs })
const code = (t) => new Paragraph({ indent:{left:480}, spacing:{before:40,after:40}, shading:{fill:'FEF9E7',type:ShadingType.CLEAR}, children:[new TextRun({text:t,font:'Courier New',size:17,color:'7D2400'})] })
const fixLbl = (t) => new Paragraph({ spacing:{before:120,after:40}, children:[new TextRun({text:`◆ ${t}`,bold:true,font:'Arial',size:18,color:PURPLE})] })

const rule = (c=PURPLE) => new Table({ width:{size:9026,type:WidthType.DXA}, columnWidths:[9026],
  rows:[new TableRow({children:[new TableCell({borders:noB,shading:{fill:c,type:ShadingType.CLEAR},margins:{top:18,bottom:18,left:0,right:0},width:{size:9026,type:WidthType.DXA},children:[new Paragraph({children:[new TextRun({text:'',size:4})]})]})]})
  ]
})

const cell = (text,w,bg=W,fg=DARK,bold=false) => new TableCell({
  borders:allB, shading:{fill:bg,type:ShadingType.CLEAR},
  width:{size:w,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120},
  children:[new Paragraph({children:[new TextRun({text,bold,font:'Arial',size:18,color:fg})]})]
})

const hdrRow = (cols,widths,bg) => new TableRow({children:cols.map((h,i)=>cell(h,widths[i],bg,W,true))})
const dataRow = (vals,widths,colours=[]) => new TableRow({children:vals.map((v,i)=>cell(v,widths[i],W,colours[i]||DARK))})

const SW = [900,1500,3226,3400]
const summaryHdr = () => hdrRow(['ID','Severity','Issue','File(s)'],SW,PURPLE)
const sevLabel = (s) => s==='HIGH'?'🔴 HIGH':s==='MED'?'🟠 MED':'🟦 LOW'
const sevCol   = (s) => s==='HIGH'?RED:s==='MED'?ORANGE:GREY
const sRow = (id,sev,issue,file) => dataRow([id,sevLabel(sev),issue,file],SW,[sevCol(sev),sevCol(sev),DARK,GREY])

const ticket = (id,sev,title) => {
  const sc = sevCol(sev)
  return new Table({ width:{size:9026,type:WidthType.DXA}, columnWidths:[1100,7926],
    rows:[new TableRow({children:[
      new TableCell({borders:allB,shading:{fill:sc,type:ShadingType.CLEAR},width:{size:1100,type:WidthType.DXA},margins:{top:100,bottom:100,left:120,right:120},children:[
        new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:id,bold:true,font:'Arial',size:22,color:W})]}),
        new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`● ${sev}`,bold:true,font:'Arial',size:16,color:W})]})
      ]}),
      new TableCell({borders:allB,shading:{fill:LG,type:ShadingType.CLEAR},width:{size:7926,type:WidthType.DXA},margins:{top:100,bottom:100,left:160,right:120},children:[
        new Paragraph({children:[new TextRun({text:title,bold:true,font:'Arial',size:22,color:DARK})]})
      ]})
    ]})]
  })
}

const PW = [800,2600,3226,2400]

const doc = new Document({
  numbering:{config:[
    {reference:'bullets',levels:[
      {level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}},
      {level:1,format:LevelFormat.BULLET,text:'–',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:840,hanging:240}}}}
    ]},
    {reference:'numbers',levels:[
      {level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}
    ]}
  ]},
  styles:{
    default:{document:{run:{font:'Arial',size:20,color:DARK}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:36,bold:true,font:'Arial',color:DARK},paragraph:{spacing:{before:440,after:220},outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:26,bold:true,font:'Arial',color:PURPLE},paragraph:{spacing:{before:320,after:140},outlineLevel:1}},
      {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:22,bold:true,font:'Arial',color:DARK},paragraph:{spacing:{before:240,after:100},outlineLevel:2}},
    ]
  },
  sections:[{
    properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:1134,bottom:1134,left:1134}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'CCCCCC'}},children:[new TextRun({text:'WriFe PWP — Architecture & Bug Review  |  1 May 2026',font:'Arial',size:18,color:GREY})]})]})},
    footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,border:{top:{style:BorderStyle.SINGLE,size:4,color:'CCCCCC'}},children:[new TextRun({text:'Page ',font:'Arial',size:16,color:GREY}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:16,color:GREY}),new TextRun({text:' of ',font:'Arial',size:16,color:GREY}),new TextRun({children:[PageNumber.TOTAL_PAGES],font:'Arial',size:16,color:GREY})]})]})},
    children:[
      // COVER
      ...gap(2),
      new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:120},children:[new TextRun({text:'WriFe PWP',bold:true,font:'Arial',size:72,color:PURPLE})]}),
      new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},children:[new TextRun({text:'Architecture & Bug Review',bold:true,font:'Arial',size:44,color:DARK})]}),
      new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:40},children:[new TextRun({text:'Cross-Device Rendering  ·  Sound Effects  ·  Code Quality',font:'Arial',size:22,color:GREY,italics:true})]}),
      new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:40,after:280},children:[new TextRun({text:'1 May 2026',font:'Arial',size:20,color:GREY})]}),
      rule(PURPLE),
      ...gap(3),

      // 1. EXECUTIVE SUMMARY
      h1('1. Executive Summary'),
      rule(PURPLE),
      ...gap(1),
      para('This report presents the findings of a full architecture and code audit of the WriFe PWP (Personal Writing Practice) application, live at pwp-studio.wrife.co.uk. The audit covered three areas: (1) cross-device rendering correctness, (2) sound effects implementation and wiring, and (3) general code quality against the WriFe architecture standard.'),
      para('Seventeen distinct issues were identified. Five are rated HIGH severity — they cause visible bugs on real devices being used in schools today and should be addressed before the next user-facing deployment. Seven are MED severity (clear improvements with moderate effort) and five are LOW (best-practice polish).'),
      paraRuns([bld('App: '),nrm('https://pwp-studio.wrife.co.uk    '),bld('Supabase project: '),nrm('nxhkpqngnxshgotvuujb')]),
      ...gap(2),
      h2('Issue Summary'),
      new Table({width:{size:9026,type:WidthType.DXA},columnWidths:SW,rows:[
        summaryHdr(),
        sRow('R-01','HIGH','#root fixed at 1126px — breaks narrow phone viewports','src/index.css'),
        sRow('R-02','HIGH','CSS --heading / --text-h / --mono undefined in light mode','src/index.css'),
        sRow('R-03','HIGH','Dark mode media query conflicts with WriFe brand tokens','src/index.css'),
        sRow('R-04','MED', "DashboardPage specifies 'Inter' — font not loaded",'DashboardPage.tsx'),
        sRow('R-05','MED', '232 hardcoded hex values violate CSS variable rule','Multiple components'),
        sRow('R-06','MED', 'Responsive grid injected via inline <style> tag','DashboardPage.tsx'),
        sRow('R-07','MED', 'SVG learning path has no overflow guard on <320px viewports','DashboardPage.tsx'),
        sRow('R-08','MED', 'Infinite gradient animation not gated on prefers-reduced-motion','DashboardPage.tsx'),
        sRow('R-09','LOW', 'Hint button minHeight is 32px — below 44px touch target','FormulaSlot.tsx'),
        sRow('R-10','LOW', 'FormulaBuilder hardcodes colours in two places','FormulaBuilder.tsx'),
        sRow('R-11','LOW', 'Pages use 100vh without iOS safe area inset support','Multiple pages'),
        sRow('S-01','HIGH','SFX not connected to settingsStore — cannot be disabled','sfx.ts / settingsStore.ts'),
        sRow('S-02','HIGH','sfx.success/error called after await — silent on iOS Safari','FormulaPage.tsx'),
        sRow('S-03','MED', 'SettingsPage has no Sound Effects section','SettingsPage.tsx'),
        sRow('S-04','MED', 'sfx.star() and sfx.levelUp() can play simultaneously and clash','FormulaPage.tsx'),
        sRow('S-05','LOW', 'sequence() uses setTimeout — timing drifts on school Chromebooks','sfx.ts'),
        sRow('S-06','LOW', 'No prefers-reduced-motion check in sfx module','sfx.ts'),
      ]}),
      ...gap(3),

      // 2. RENDERING ISSUES
      h1('2. Rendering Issues — Detail'),
      rule(RED),
      ...gap(1),

      ticket('R-01','HIGH','#root fixed at 1126px — breaks narrow phone viewports'),
      ...gap(1),
      fixLbl('File'), code('src/index.css   line 71'),
      fixLbl('Problem'),
      para('The #root element is hardcoded to width: 1126px (clipped by max-width: 100%). On 360px-viewport phones — common budget Android devices in UK schools — this compresses content into an impractical narrow column. Additionally, the border-inline rule references var(--border), a variable that is only defined inside the dark-mode media query block, not in :root. In light mode it silently resolves to nothing, making the border invisible. The 1126px value appears to be legacy scaffolding never cleaned up.'),
      fixLbl('Fix'),
      bullet('Delete width: 1126px from #root. The existing max-width: 100% already constrains it correctly.'),
      bullet('Replace var(--border) with var(--color-border), which is correctly defined in :root.'),
      bullet('Change min-height: 100svh to min-height: 100dvh so the viewport height correctly accounts for the iOS Safari dynamic address bar.'),
      code('Before:  width: 1126px; border-inline: 1px solid var(--border)'),
      code('After:   border-inline: 1px solid var(--color-border)'),
      ...gap(2),

      ticket('R-02','HIGH','CSS variables --heading, --text-h, --mono undefined in light mode'),
      ...gap(1),
      fixLbl('File'), code('src/index.css   lines 87–90, 258–262'),
      fixLbl('Problem'),
      para('Four CSS custom properties used in component rules are only defined inside the @media (prefers-color-scheme: dark) block, not in :root. In the default light theme they silently resolve to nothing:'),
      bullet('var(--heading) — used in h1/h2 font-family: Nunito is ignored, browser default sans-serif is used instead'),
      bullet('var(--text-h) — used in h1/h2 color: falls back to browser default black, not WriFe navy'),
      bullet('var(--mono) — used in code/.counter font-family: falls back to browser monospace'),
      bullet('var(--code-bg) — used in code background: transparent, making code blocks invisible'),
      fixLbl('Fix — add to :root'),
      code("--heading:  'Nunito', system-ui, sans-serif;"),
      code('--text-h:   var(--color-text);'),
      code("--mono:     'Courier New', monospace;"),
      code('--code-bg:  #F4F5F7;'),
      ...gap(2),

      ticket('R-03','HIGH','Dark mode media query partially conflicts with WriFe brand tokens'),
      ...gap(1),
      fixLbl('File'), code('src/index.css   lines 50–68'),
      fixLbl('Problem'),
      para('The @media (prefers-color-scheme: dark) block defines a completely separate set of token names (--text, --bg, --border, --accent) that are unrelated to the WriFe design system. It does not override any --color-* variables. Pupils on iOS with system dark mode enabled see WriFe orange buttons (#F5841F) on a near-black background (#16171d) — an untested contrast pairing. None of the WriFe semantic feedback colours (correct/incorrect, gamification) are adjusted for dark mode. The mixed naming also causes the R-01 invisible border bug.'),
      fixLbl('Fix — choose one option'),
      bullet('Option A (recommended): Replace the dark mode block with overrides for the WriFe --color-* tokens using a tested high-contrast palette, similar to the existing .high-contrast class.'),
      bullet('Option B (safe for MVP): Add color-scheme: light only to :root. This prevents iOS from applying automatic dark mode while a proper dark theme is designed, making the current behaviour deliberate rather than accidental.'),
      ...gap(2),

      ticket('R-04','MED',"DashboardPage specifies 'Inter' — a font that is not loaded"),
      ...gap(1),
      fixLbl('File'), code('src/pages/DashboardPage.tsx   line 1223'),
      fixLbl('Problem'),
      para("The root div of DashboardPage applies fontFamily: \"'Inter', sans-serif\" inline. Inter is not loaded anywhere — only Nunito is loaded via Google Fonts in index.css. DashboardPage therefore renders in system-ui fallback (San Francisco on Mac, Segoe UI on Windows, Roboto on Android), while every other page renders in Nunito. The visual inconsistency is noticeable."),
      fixLbl('Fix'),
      bullet('Remove the fontFamily inline style from DashboardPage. It inherits Nunito correctly from the :root declaration in index.css.'),
      ...gap(2),

      ticket('R-05','MED','232 hardcoded hex values violate the CSS variable rule'),
      ...gap(1),
      fixLbl('File'), code('src/components/ (all files combined — grep count: 232 instances)'),
      fixLbl('Problem'),
      para("The WriFe architecture standard is explicit: no hex values in .tsx component files — all colours must use CSS custom properties. 232 instances exist across the component tree. The largest offender is DashboardPage.tsx, which defines a local colour object (const C = { brand: '#6C5CE7', ... }) and uses it exclusively via inline styles. A single brand colour change would require editing dozens of component files instead of one token file."),
      fixLbl('Priority fixes'),
      bullet("Replace the C colour object in DashboardPage.tsx with CSS variable references (var(--color-brand-primary) etc.)."),
      bullet("FormulaBuilder instruction banner: replace #EFF6FF / #BFDBFE with var(--color-surface-alt) / var(--color-border)."),
      bullet("FormulaBuilder submit button disabled state: replace '#9CA3AF' with var(--color-text-muted)."),
      bullet('Run grep -rn "#[0-9a-fA-F]{3,6}" src/ to generate the full list for a systematic pass.'),
      ...gap(2),

      ticket('R-06','MED','Responsive grid media queries injected via inline <style> tag'),
      ...gap(1),
      fixLbl('File'), code('src/pages/DashboardPage.tsx   lines 1358–1377'),
      fixLbl('Problem'),
      para('DashboardPage renders a <style> element directly inside JSX for .dashboard-grid breakpoints and a global button:hover rule. Two problems: (1) the style tag is re-injected into the DOM on every render cycle; (2) the global button:hover { transform: scale(1.04) } overrides intentional animations on level nodes and other buttons, creating visual glitches.'),
      fixLbl('Fix'),
      bullet('Move the .dashboard-grid media query rules to src/index.css, which already has a @media (max-width: 640px) responsive utilities block.'),
      bullet('Remove the global button:hover rule. Apply hover transforms directly to specific buttons using onMouseEnter/onMouseLeave or Tailwind hover: variants.'),
      ...gap(2),

      ticket('R-07','MED','SVG learning path has no horizontal-scroll guard on viewports below 320px'),
      ...gap(1),
      fixLbl('File'), code('src/pages/DashboardPage.tsx   LearningPath component'),
      fixLbl('Problem'),
      para('The SVG uses a hardcoded PATH_W of 300px with absolute coordinate calculations and overflow: visible on the wrapper. On budget Android phones below 300px viewport width (still common in UK state schools), the SVG overflows and triggers page-level horizontal scrolling. The AVATAR_LIFT offset (95px above active node) also adds disproportionate blank space on small screens.'),
      fixLbl('Fix'),
      bullet('Give the SVG a viewBox="0 0 300 {height}" and set width="100%" so it scales proportionally. Remove the hardcoded width={PATH_W} prop.'),
      bullet('Wrap the SVG container in a div with overflow: hidden and min-width: 280px to prevent page-level horizontal scroll on very small devices.'),
      ...gap(2),

      ticket('R-08','MED','Infinite gradient animation not gated on prefers-reduced-motion'),
      ...gap(1),
      fixLbl('File'), code('src/pages/DashboardPage.tsx   lines 1270–1288'),
      fixLbl('Problem'),
      para('The "Your Learning Path" heading uses a 4-second infinite CSS gradient animation (gradientShift) alongside a Framer Motion floating emoji (2.5s repeat). Combined with the avatar float, badge spring-ins, and page entrance transitions — none of which check prefers-reduced-motion — the Dashboard runs multiple infinite GPU compositions simultaneously. On low-end Chromebooks common in UK schools this causes visible frame drops. Pupils with vestibular conditions may also be affected.'),
      fixLbl('Fix'),
      bullet('Add <MotionConfig reducedMotion="user"> in App.tsx, wrapping all routes. This single change makes every Framer Motion animation in the entire app automatically respect the user\'s system preference.'),
      bullet('Wrap the gradientShift @keyframes rule in @media (prefers-reduced-motion: no-preference) so it also stops for users with the preference set.'),
      ...gap(2),

      ticket('R-09','LOW','Hint button touch target is 32px — below the 44px minimum'),
      ...gap(1),
      fixLbl('File'), code('src/components/formula/FormulaSlot.tsx   line 282'),
      fixLbl('Problem'),
      para('The hint (?) button has Tailwind classes w-8 h-8 (32x32px) with an inline style of minWidth: 44px but minHeight: 32px — a contradictory pair. The architecture standard mandates 44x44px minimum touch targets on mobile. Younger pupils on tablet touchscreens frequently miss 32px targets.'),
      fixLbl('Fix'),
      code("style={{ minWidth: '44px', minHeight: '44px', ... }}"),
      bullet('Also update the Tailwind classes from w-8 h-8 to w-11 h-11 (44px) to keep visual and touch sizes consistent.'),
      ...gap(2),

      ticket('R-10','LOW','FormulaBuilder hardcodes colours in two places'),
      ...gap(1),
      fixLbl('File'), code('src/components/formula/FormulaBuilder.tsx   lines 299–311, 463–465'),
      fixLbl('Problem'),
      bullet('The task instruction banner uses backgroundColor "#EFF6FF" and border "#BFDBFE" with Tailwind text-blue-800 / text-blue-700 — hardcoded Tailwind blues not in the WriFe token set.'),
      bullet('The submit button disabled state uses backgroundColor "#9CA3AF" — a hardcoded grey absent from WriFe tokens.'),
      fixLbl('Fix'),
      bullet('Replace banner colours with var(--color-surface-alt) / var(--color-border) and style={{ color: "var(--color-text)" }}.'),
      bullet('Replace #9CA3AF with var(--color-text-muted) or define a --color-disabled token in index.css.'),
      ...gap(2),

      ticket('R-11','LOW','Pages use 100vh / min-h-screen without iOS safe area inset support'),
      ...gap(1),
      fixLbl('File'), code('src/pages/FormulaPage.tsx, DashboardPage.tsx, ParagraphPage.tsx (and others)'),
      fixLbl('Problem'),
      para('Most full-page layouts use min-h-screen / min-height: 100vh. On iPhones with a notch and home indicator, the bottom home bar can overlap fixed-bottom toasts and the offline banner. Android edge-to-edge gesture navigation has the same issue.'),
      fixLbl('Fix'),
      bullet('Replace min-h-screen with className="min-h-dvh" (100dvh accounts for the dynamic browser toolbar).'),
      bullet('Add viewport-fit=cover to the viewport meta tag in index.html and apply padding-bottom: env(safe-area-inset-bottom) to fixed bottom elements (OfflineBanner, offline toast).'),
      ...gap(3),

      // 3. SOUND EFFECTS
      h1('3. Sound Effects Issues — Detail'),
      rule(RED),
      ...gap(1),

      ticket('S-01','HIGH','SFX not connected to settingsStore — cannot be disabled by pupils'),
      ...gap(1),
      fixLbl('Files'), code('src/lib/sfx.ts    src/stores/settingsStore.ts    src/pages/SettingsPage.tsx'),
      fixLbl('Problem'),
      para('sfx.ts has setEnabled(boolean) and setVolume(number) methods, but they are never called anywhere in the app. The settingsStore has no sfxEnabled or sfxVolume state, and SettingsPage has no sound section. Sound effects are permanently on at a fixed 35% volume with no user control. For pupils in shared classrooms or those sensitive to unexpected sounds, this is a significant usability problem.'),
      fixLbl('Fix — three coordinated changes'),
      num([bld('settingsStore.ts: '),nrm('Add sfxEnabled (default true) and sfxVolume (default 0.35) to SettingsState and SettingsActions, persisted via the existing Zustand persist middleware.')]),
      num([bld('App.tsx: '),nrm('Add a useEffect that reads sfxEnabled and sfxVolume from the store and calls sfx.setEnabled() and sfx.setVolume() whenever they change. This keeps the SFX module in sync with user preferences throughout the session.')]),
      num([bld('SettingsPage.tsx: '),nrm('Add a Sound Effects section with a toggle and volume slider (see S-03 for detail).')]),
      ...gap(2),

      ticket('S-02','HIGH','sfx.success() and sfx.error() called after await — silent on iOS Safari'),
      ...gap(1),
      fixLbl('File'), code('src/pages/FormulaPage.tsx   lines 338–342'),
      fixLbl('Problem'),
      para('iOS Safari requires AudioContext.resume() to be called within a synchronous user gesture handler. handleSubmit() calls sfx.success() / sfx.error() after multiple await statements (assessFormula, Supabase queries). By the time the sound calls run, the user gesture context is lost. The browser silently discards the audio. Correct/incorrect feedback sounds never play on iOS — a critical gap since auditory feedback is part of the pedagogical loop.'),
      fixLbl('Fix — two-part approach'),
      bullet('Export a primeAudio() function from sfx.ts that calls getCtx() synchronously. Call it at the very start of handleSubmit(), before any awaits — this runs within the button click gesture and puts the AudioContext into running state:'),
      code('const handleSubmit = async (...) => {\n  sfx.primeAudio()   // ← add as first line, before any await\n  setAssessing(true)\n  // ... awaits follow\n}'),
      bullet('In sfx.ts, implement primeAudio() as a simple export that calls getCtx() and — if the context exists — ctx.resume(). No other changes needed.'),
      ...gap(2),

      ticket('S-03','MED','SettingsPage has no Sound Effects section'),
      ...gap(1),
      fixLbl('File'), code('src/pages/SettingsPage.tsx'),
      fixLbl('Problem'),
      para('Settings has Display and Accessibility sections but no Sound section. Once S-01 wires sfxEnabled into the store, the UI control is still needed for users to discover and adjust it.'),
      fixLbl('Fix — add a Sound Effects section between Accessibility and Account'),
      bullet('SFX on/off toggle (same switch pattern as TTS toggle): calls sfx.setEnabled() and persists to store.'),
      bullet('Volume slider (only visible when SFX is on): range 0–1, step 0.05, calls sfx.setVolume(), persists to store.'),
      bullet('Preview button: plays sfx.success() so the pupil can test the volume before confirming.'),
      ...gap(2),

      ticket('S-04','MED','sfx.star() and sfx.levelUp() can play simultaneously and clash'),
      ...gap(1),
      fixLbl('File'), code('src/pages/FormulaPage.tsx   lines 453 and 461'),
      fixLbl('Problem'),
      para('When a badge is earned on a level-up session, FormulaPage calls sfx.star() then immediately sfx.levelUp() in the same synchronous block. Both use setTimeout-scheduled note sequences on the shared AudioContext destination, so both arpeggios play concurrently and produce a discordant tone clash.'),
      fixLbl('Fix'),
      bullet('Delay sfx.levelUp() when a badge is also earned so the sounds play sequentially:'),
      code('if (newBadges.length > 0) sfx.star()\nif (didLevelUp) setTimeout(() => sfx.levelUp(), 500)'),
      ...gap(2),

      ticket('S-05','LOW','sequence() uses setTimeout — timing drifts on loaded school Chromebooks'),
      ...gap(1),
      fixLbl('File'), code('src/lib/sfx.ts   lines 72–86'),
      fixLbl('Problem'),
      para('sequence() accumulates note timings using setTimeout. Chrome throttles background timers and, under CPU load typical on school Chromebooks running multiple tabs and Google Apps, callbacks can be delayed 50–200ms. The success arpeggio sounds uneven or choppy on loaded hardware.'),
      fixLbl('Fix'),
      para('Replace setTimeout with Web Audio API time-based scheduling. Schedule each note at a ctx.currentTime offset rather than via a timer:'),
      code('let offset = 0\nfor (const note of notes) {\n  offset += note.delay ?? 0\n  // tone() extended to accept a startTime parameter:\n  tone(note.freq, note.dur, note.type ?? "sine", note.vol ?? 1, 0.005, 0.08, ctx.currentTime + offset)\n  offset += note.dur\n}'),
      ...gap(2),

      ticket('S-06','LOW','No prefers-reduced-motion check in sfx module'),
      ...gap(1),
      fixLbl('File'), code('src/lib/sfx.ts'),
      fixLbl('Problem'),
      para("WCAG 2.1 SC 1.4.2 (Audio Control) requires that auto-playing sounds can be paused or stopped. Some users also set prefers-reduced-motion as a broad 'reduce surprises' preference that covers unexpected sounds. The SFX module currently ignores this signal entirely."),
      fixLbl('Fix'),
      bullet('In getCtx(), check window.matchMedia("(prefers-reduced-motion: reduce)").matches. If true, skip decorative sounds (click, drop, clear, flip) but keep success and error sounds active as they are functional feedback, not decoration.'),
      ...gap(3),

      // 4. IMPLEMENTATION PLAN
      h1('4. Implementation Plan'),
      rule(GREEN),
      ...gap(1),
      para('Issues are grouped into two sprints. Sprint 1 targets all five HIGH bugs and can be completed in a single session. Sprint 2 covers the remaining MED and LOW issues. Estimates assume a developer familiar with the codebase.'),
      ...gap(2),
      h2('Sprint 1 — Critical Fixes  (estimated: one session, ~2 hours)', GREEN),
      new Table({width:{size:9026,type:WidthType.DXA},columnWidths:PW,rows:[
        hdrRow(['ID','Fix','File(s)','Effort'],PW,GREEN),
        dataRow(['R-01','Remove 1126px width; fix --border; use 100dvh','src/index.css','10 min'],PW,[RED,DARK,GREY,GREY]),
        dataRow(['R-02','Add missing CSS vars to :root','src/index.css','10 min'],PW,[RED,DARK,GREY,GREY]),
        dataRow(['R-03','Replace dark mode block OR add color-scheme: light only','src/index.css','20–45 min'],PW,[RED,DARK,GREY,GREY]),
        dataRow(['S-01','Wire sfxEnabled/sfxVolume to settingsStore + App.tsx','sfx.ts, settingsStore.ts, App.tsx','45 min'],PW,[RED,DARK,GREY,GREY]),
        dataRow(['S-02','Export primeAudio(); call at top of handleSubmit()','sfx.ts, FormulaPage.tsx','30 min'],PW,[RED,DARK,GREY,GREY]),
      ]}),
      ...gap(2),
      h2('Sprint 2 — Polish & Compliance  (estimated: one to two sessions)', ORANGE),
      new Table({width:{size:9026,type:WidthType.DXA},columnWidths:PW,rows:[
        hdrRow(['ID','Fix','File(s)','Effort'],PW,ORANGE),
        dataRow(['R-04','Remove Inter fontFamily from DashboardPage','DashboardPage.tsx','5 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-05','Replace hardcoded hex values with CSS vars','Multiple components','2–3 hrs'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-06','Move grid CSS to index.css; remove inline <style>','DashboardPage.tsx','15 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-07','Make SVG viewBox-based; add overflow guard','DashboardPage.tsx','45 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-08','Add MotionConfig reducedMotion="user" in App.tsx','App.tsx, index.css','20 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-09','Fix hint button to 44×44px touch target','FormulaSlot.tsx','5 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-10','Replace hardcoded colours in FormulaBuilder','FormulaBuilder.tsx','15 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['R-11','Replace 100vh with 100dvh; add safe-area padding','Multiple pages, index.html','30 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['S-03','Add Sound Effects section to SettingsPage','SettingsPage.tsx','30 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['S-04','Stagger sfx.star() and sfx.levelUp()','FormulaPage.tsx','5 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['S-05','Refactor sequence() to use AudioContext scheduling','sfx.ts','30 min'],PW,[ORANGE,DARK,GREY,GREY]),
        dataRow(['S-06','Add prefers-reduced-motion check in sfx.ts','sfx.ts','10 min'],PW,[ORANGE,DARK,GREY,GREY]),
      ]}),
      ...gap(3),

      // 5. WHAT IS WORKING WELL
      h1('5. What Is Working Well'),
      rule(GREEN),
      ...gap(1),
      para('The audit also identified a number of architectural decisions that are well-implemented and worth preserving:'),
      ...gap(1),
      bullet('sfx.ts core architecture — procedurally generated Web Audio API sounds (no audio files, fully offline) with correct ADSR envelopes to avoid click artefacts. The design is right; the issues above are wiring problems, not architectural ones.'),
      bullet('tts.ts Chrome bug hardening — three documented workarounds (50ms defer, voiceschanged listener, onerror fallback) are correct, well-commented, and cover real browser bugs.'),
      bullet('settingsStore persist middleware — Zustand persist to localStorage is the right pattern for user preferences that must survive page reloads.'),
      bullet('FormulaSlot scaffold stage logic — the four-stage scaffolding (labels visible / hints on demand / hints cost points / no hints) is clearly implemented with consistent data-testid attributes throughout.'),
      bullet('Offline queue (offlineQueue.ts) — the write-to-IDB-first, flush-on-reconnect pattern correctly follows the architecture specification.'),
      bullet('DashboardPage SVG learning path — the S-curve path geometry with tier-based node sizing is visually strong. Using foreignObject to embed a Framer Motion avatar inside SVG is a clever and valid approach.'),
      bullet('CSP header in index.html — a security-positive addition not mandated by the architecture spec.'),
      bullet('FullscreenButton — correctly handles both the standard Fullscreen API and the webkit-prefixed Safari variant with silent failure on sandboxed iframes.'),
      bullet('DashboardPage CoinIcon component — replaces the 🪙 emoji (which renders as a grey blob on Chrome/Windows) with a cross-platform SVG. Well spotted and correctly implemented.'),
      ...gap(3),

      // APPENDIX
      h1('Appendix — Files Audited'),
      rule(GREY),
      ...gap(1),
      ...[
        'src/index.css', 'index.html', 'src/App.tsx',
        'src/lib/sfx.ts', 'src/lib/tts.ts', 'src/lib/offlineQueue.ts',
        'src/hooks/useTTS.ts', 'src/hooks/useNetworkStatus.ts',
        'src/stores/settingsStore.ts', 'src/stores/authStore.ts', 'src/stores/formulaStore.ts',
        'src/pages/DashboardPage.tsx', 'src/pages/FormulaPage.tsx', 'src/pages/SettingsPage.tsx',
        'src/components/formula/FormulaBuilder.tsx', 'src/components/formula/FormulaSlot.tsx',
        'src/components/formula/WordClassTile.tsx', 'src/components/formula/SessionIntro.tsx',
        'src/components/ui/FullscreenButton.tsx', 'src/components/ui/LevelUpModal.tsx',
        'src/components/ui/BadgeToast.tsx',
        'src/lib/masteryEngine.ts', 'src/lib/progressionEngine.ts', 'src/lib/xpEngine.ts',
        'skills/wrife-app-architecture/SKILL.md',
        'skills/wrife-app-architecture/references/design-tokens.md',
      ].map(f => bullet(f)),
      ...gap(1),
      para('Files audited: 26  |  Issues found: 17  |  HIGH: 5  |  MED: 7  |  LOW: 5'),
      ...gap(1),
      new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:200,after:40},children:[new TextRun({text:'— end of report —',font:'Arial',size:18,color:GREY,italics:true})]}),
    ]
  }]
})

Packer.toBuffer(doc).then(buf => {
  writeFileSync('/sessions/festive-trusting-volta/mnt/wrifeapp/WriFe-PWP-Architecture-Bug-Review.docx', buf)
  console.log('Done.')
})
