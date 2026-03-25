'use client'

import { useState } from 'react'
import {
  DopeSheet,
  DopeSheetDay,
  FoodPlan,
  GearList,
  EvacPlan,
  Rapid,
  DopeSheetLinks,
} from '@/lib/types'

interface DopeSheetDisplayProps {
  sheet: DopeSheet
  trailName: string
}

function VerifyText({ text }: { text: string }) {
  if (!text) return null
  const parts = text.split(/(\[verify\])/gi)
  return (
    <>
      {parts.map((part, i) =>
        /\[verify\]/i.test(part) ? (
          <span
            key={i}
            className="px-1 rounded text-xs font-medium"
            style={{ background: 'rgba(252,169,68,0.2)', color: '#6e3e00' }}
          >
            [verify]
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function Section({
  title,
  children,
  defaultOpen = true,
  noPrint = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  noPrint?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`tm-card mb-4 overflow-hidden ${noPrint ? 'no-print' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left no-print"
        style={{ background: 'transparent' }}
      >
        <span
          className="font-medium"
          style={{ fontFamily: 'var(--font-playfair), Playfair Display, serif', color: '#0D3323', fontSize: '15px', fontWeight: 700 }}
        >
          {title}
        </span>
        <span style={{ color: '#5a7860', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
      </button>
      <div className="print-only px-5 pt-4 pb-1 font-semibold" style={{ fontSize: '13px', color: '#0D3323', display: 'none' }}>
        {title}
      </div>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5 border-b" style={{ borderColor: '#bfcaac' }}>
      <span className="label-caps w-36 shrink-0">{label}</span>
      <span style={{ color: '#4a6858', fontSize: '14px' }}>
        <VerifyText text={value} />
      </span>
    </div>
  )
}

function DayCard({ day }: { day: DopeSheetDay }) {
  const isKayak = !!day.class_rating
  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{ background: '#edf1e4', border: '1px solid #c0ceac' }}
    >
      <p
        className="font-medium mb-3"
        style={{ fontFamily: 'var(--font-playfair), Playfair Display, serif', color: '#0D3323', fontSize: '15px', fontWeight: 700 }}
      >
        <VerifyText text={day.label} />
      </p>
      <div className="grid grid-cols-2 gap-x-4 text-sm">
        <div className="py-1">
          <span className="label-caps block mb-0.5">Distance</span>
          <span style={{ color: '#4a6858' }}>{day.total_distance_miles} miles</span>
        </div>
        {!isKayak && day.elevation_gain_ft > 0 && (
          <div className="py-1">
            <span className="label-caps block mb-0.5">Elevation Gain</span>
            <span style={{ color: '#4a6858' }}>{day.elevation_gain_ft.toLocaleString()} ft</span>
          </div>
        )}
        {isKayak && day.class_rating && (
          <div className="py-1">
            <span className="label-caps block mb-0.5">Class</span>
            <span style={{ color: '#4a6858' }}>{day.class_rating}</span>
          </div>
        )}
        <div className="py-1">
          <span className="label-caps block mb-0.5">Expected Time</span>
          <span style={{ color: '#4a6858' }}>
            <VerifyText text={day.expected_time} />
          </span>
        </div>
        <div className="py-1">
          <span className="label-caps block mb-0.5">Allotted Time</span>
          <span style={{ color: '#0D3323', fontWeight: 500 }}>
            <VerifyText text={day.allotted_time} />
          </span>
        </div>
        <div className="py-1">
          <span className="label-caps block mb-0.5">Pace</span>
          <span style={{ color: '#4a6858' }}>{day.expected_pace_mph} mph</span>
        </div>
        {isKayak && day.put_in && (
          <div className="py-1">
            <span className="label-caps block mb-0.5">Put-in</span>
            <span style={{ color: '#4a6858' }}>
              <VerifyText text={day.put_in} />
            </span>
          </div>
        )}
        {isKayak && day.take_out && (
          <div className="py-1">
            <span className="label-caps block mb-0.5">Take-out</span>
            <span style={{ color: '#4a6858' }}>
              <VerifyText text={day.take_out} />
            </span>
          </div>
        )}
      </div>
      {day.campsite && (
        <div
          className="mt-3 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(176,176,37,0.12)', color: '#0D3323' }}
        >
          Campsite: <VerifyText text={day.campsite} />
        </div>
      )}
      {day.bailout_marker && (
        <div
          className="mt-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(252,169,68,0.15)', color: '#4a6858' }}
        >
          Turn back if you&apos;ve passed: <VerifyText text={day.bailout_marker} />
        </div>
      )}
      {day.breaks.length > 0 && (
        <div className="mt-3">
          <span className="label-caps block mb-1.5">Break schedule</span>
          <ul className="text-sm space-y-0.5" style={{ color: '#4a6858' }}>
            {day.breaks.map((b, i) => (
              <li key={i} className="flex gap-1.5">
                <span style={{ color: '#3A5A4C' }}>·</span>
                <VerifyText text={b} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function GearSection({ gear }: { gear: GearList }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="label-caps mb-3">Personal (each person)</p>
        <ul className="space-y-1.5">
          {gear.personal.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm" style={{ color: '#4a6858' }}>
              <span style={{ color: '#0D3323', marginTop: '2px' }}>✓</span>
              <VerifyText text={item} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="label-caps mb-3">Shared (group)</p>
        <ul className="space-y-1.5">
          {gear.shared.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm" style={{ color: '#4a6858' }}>
              <span style={{ color: '#3A5A4C', marginTop: '2px' }}>◎</span>
              <VerifyText text={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FoodSection({ food }: { food: FoodPlan }) {
  return (
    <div>
      <div className="space-y-3 mb-5">
        {food.days.map((day) => (
          <div
            key={day.day}
            className="rounded-xl p-4"
            style={{ background: '#edf1e4', border: '1px solid #c0ceac' }}
          >
            <p className="label-caps mb-2.5" style={{ color: '#0D3323' }}>
              Day {day.day}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Breakfast', value: day.breakfast },
                { label: 'Lunch', value: day.lunch },
                { label: 'Dinner', value: day.dinner },
                { label: 'Snacks', value: day.snacks },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="label-caps block mb-0.5">{label}</span>
                  <span style={{ color: '#4a6858' }}>
                    <VerifyText text={value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {food.totals.length > 0 && (
        <div
          className="rounded-xl p-4 mb-3"
          style={{ background: 'rgba(252,169,68,0.12)', border: '1px solid rgba(252,169,68,0.3)' }}
        >
          <p className="label-caps mb-2" style={{ color: '#6e3e00' }}>
            Total meals to pack
          </p>
          <ul className="text-sm space-y-1" style={{ color: '#4a6858' }}>
            {food.totals.map((t, i) => (
              <li key={i} className="flex gap-1.5">
                <span style={{ color: '#FCA944' }}>·</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      {food.weight_guideline && (
        <p className="text-sm" style={{ color: '#5a7860' }}>
          Weight guideline: {food.weight_guideline}
        </p>
      )}
    </div>
  )
}

function EvacSection({ evac }: { evac: EvacPlan }) {
  return (
    <div>
      <div className="mb-4">
        {evac.general.map((line, i) => (
          <p key={i} className="text-sm mb-1.5" style={{ color: '#4a6858' }}>
            <VerifyText text={line} />
          </p>
        ))}
      </div>
      <div className="space-y-3">
        {evac.sections.map((s) => (
          <div
            key={s.day}
            className="rounded-xl p-4"
            style={{ background: '#edf1e4', border: '1px solid #c0ceac' }}
          >
            <p className="label-caps mb-3">Day {s.day}</p>
            <div className="text-sm space-y-2" style={{ color: '#4a6858' }}>
              <div>
                <span className="font-medium">Before </span>
                <VerifyText text={s.before_marker} />
                <span>: {s.before_action}</span>
              </div>
              <div>
                <span className="font-medium">At/after </span>
                <VerifyText text={s.after_marker} />
                <span>: {s.after_action}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: 'rgba(176,176,37,0.15)', color: '#0D3323' }}
                >
                  Exit: <VerifyText text={s.nearest_exit} />
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: s.cell_service === 'Good' ? 'rgba(13,51,35,0.1)'
                      : s.cell_service === 'Patchy' ? 'rgba(252,169,68,0.15)'
                      : 'rgba(252,100,50,0.12)',
                    color: s.cell_service === 'Good' ? '#0D3323'
                      : s.cell_service === 'Patchy' ? '#6e3e00'
                      : '#6e3e00',
                  }}
                >
                  Cell: {s.cell_service}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CLASS_COLORS: Record<string, { bg: string; text: string }> = {
  I: { bg: 'rgba(176,176,37,0.15)', text: '#3A5A4C' },
  II: { bg: 'rgba(176,176,37,0.25)', text: '#0D3323' },
  III: { bg: 'rgba(253,232,112,0.4)', text: '#3a3000' },
  IV: { bg: 'rgba(252,169,68,0.3)', text: '#4a1e00' },
  V: { bg: 'rgba(200,50,50,0.15)', text: '#903030' },
}

function RapidsSection({ rapids }: { rapids: Rapid[] }) {
  return (
    <div className="space-y-3">
      {rapids.map((r, i) => {
        const colors = CLASS_COLORS[r.class] || { bg: '#edf1e4', text: '#4a6858' }
        return (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: '#edf1e4', border: '1px solid #c0ceac' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: colors.bg, color: colors.text }}
              >
                Class {r.class}
              </span>
              <span
                className="font-medium text-sm"
                style={{ fontFamily: 'var(--font-playfair), Playfair Display, serif', color: '#0D3323' }}
              >
                <VerifyText text={r.name} />
              </span>
              {r.mile && (
                <span className="text-xs ml-auto" style={{ color: '#5a7860' }}>
                  Mile {r.mile}
                </span>
              )}
            </div>
            <p className="text-sm mb-2" style={{ color: '#4a6858' }}>
              <VerifyText text={r.description} />
            </p>
            <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: '#5a7860' }}>
              <span>Portage: <VerifyText text={r.portage} /></span>
              <span>· Source: <VerifyText text={r.source} /></span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LinksSection({ links, isKayak }: { links: DopeSheetLinks; isKayak: boolean }) {
  const groups = [
    { label: 'Trail / Route', items: links.trail },
    { label: 'Maps', items: links.maps },
    { label: 'Trip Reports', items: links.trip_reports },
    ...(isKayak && links.river_data ? [{ label: 'River Data', items: links.river_data }] : []),
  ].filter((g) => g.items?.length)

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="label-caps mb-2">{group.label}</p>
          <ul className="space-y-1.5">
            {group.items.map((url, i) => {
              const isVerify = /\[verify\]/i.test(url)
              return (
                <li key={i} className="text-sm">
                  {isVerify ? (
                    <span style={{ color: '#6e3e00' }}>[verify URL]</span>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                      style={{ color: '#0D3323' }}
                    >
                      {url}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function DopeSheetDisplay({ sheet, trailName }: DopeSheetDisplayProps) {
  const isKayak = sheet.type === 'kayak_day' || sheet.type === 'kayak_expedition'
  const isOvernight = sheet.type === 'backpack' || sheet.type === 'kayak_expedition'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div id="dope-sheet-content" className="mt-6">
      {/* Sheet title */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">DOPE Sheet</p>
          <h2
            style={{
              fontFamily: 'var(--font-playfair), Playfair Display, serif',
              fontWeight: 700,
              fontSize: 'clamp(20px, 3vw, 26px)',
              color: '#0D3323',
            }}
          >
            {sheet.header.trail_name}
          </h2>
        </div>
        <button
          onClick={handlePrint}
          className="pill-btn px-4 py-2 text-sm no-print"
          style={{
            background: '#edf1e4',
            border: '1px solid #c0ceac',
            color: '#4a6858',
          }}
        >
          Save as PDF
        </button>
      </div>

      {/* Safety callouts */}
      {sheet.safety_callouts.length > 0 && (
        <div
          className="tm-card p-4 mb-4"
          style={{ borderLeft: '3px solid #FCA944' }}
        >
          <p className="label-caps mb-2" style={{ color: '#6e3e00' }}>
            Safety notes
          </p>
          <ul className="space-y-1.5">
            {sheet.safety_callouts.map((note, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#4a6858' }}>
                <span style={{ color: '#FCA944' }}>·</span>
                <VerifyText text={note} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <Section title="Overview" defaultOpen>
        <div>
          <StatRow label="Trail / Route" value={sheet.header.trail_name} />
          <StatRow label="Total Distance" value={sheet.header.total_distance} />
          <StatRow
            label={isKayak ? 'Class Rating' : 'Elevation Gain'}
            value={sheet.header.elevation_or_class}
          />
          <StatRow label="Duration" value={sheet.header.duration} />
          <StatRow label="Participants" value={sheet.header.participants} />
          <StatRow label="Start" value={sheet.header.start} />
          {sheet.header.end !== sheet.header.start && (
            <StatRow label="End" value={sheet.header.end} />
          )}
        </div>
      </Section>

      <Section title="Daily Breakdown" defaultOpen>
        {sheet.days.map((day) => (
          <DayCard key={day.day} day={day} />
        ))}
      </Section>

      <Section title="Gear List" defaultOpen={false}>
        <GearSection gear={sheet.gear_list} />
      </Section>

      {isOvernight && sheet.food_plan && (
        <Section title="Food Plan" defaultOpen={false}>
          <FoodSection food={sheet.food_plan} />
        </Section>
      )}

      {!isOvernight && sheet.water_and_snacks && (
        <Section title="Water & Snacks" defaultOpen={false}>
          <p className="text-sm" style={{ color: '#4a6858', lineHeight: 1.7 }}>
            <VerifyText text={sheet.water_and_snacks} />
          </p>
        </Section>
      )}

      <Section title="Evacuation Plan" defaultOpen={false}>
        <EvacSection evac={sheet.evac_plan} />
      </Section>

      {isKayak && sheet.rapids && sheet.rapids.length > 0 && (
        <Section title="Rapids Breakdown" defaultOpen={false}>
          <RapidsSection rapids={sheet.rapids} />
        </Section>
      )}

      <Section title="Links & Resources" defaultOpen={false}>
        <LinksSection links={sheet.links} isKayak={isKayak} />
      </Section>

      <div className="flex justify-center mt-6 mb-2 no-print">
        <button
          onClick={handlePrint}
          className="pill-btn btn-green px-8 py-3 text-sm font-medium"
        >
          Download as PDF
        </button>
      </div>
    </div>
  )
}
