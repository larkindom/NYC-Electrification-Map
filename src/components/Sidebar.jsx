import { getElectrificationStrategy } from '../lib/strategy'
import { scoreToColor } from '../lib/scoring'

export default function Sidebar({ parcel, onClose }) {
  if (!parcel) return null

  const strategy = getElectrificationStrategy(parcel)

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-neutral-900 p-4 text-neutral-100">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">{parcel.address ?? 'Selected parcel'}</h2>
          <p className="text-xs text-neutral-400">BBL {parcel.bbl}</p>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
          ✕
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="rounded px-2 py-1 text-sm font-semibold text-neutral-900"
          style={{ backgroundColor: scoreToColor(parcel.readiness_score) }}
        >
          {parcel.readiness_score}
        </span>
        <span className="text-sm text-neutral-400">Readiness score</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Field label="Year built" value={parcel.yearbuilt ?? '—'} />
        <Field label="Lot area" value={parcel.lotarea ? `${parcel.lotarea.toLocaleString()} sqft` : '—'} />
        <Field label="Fuel type" value={parcel.fuel_type ?? 'Unknown'} />
        <Field label="Boiler make" value={parcel.boiler_make ?? '—'} />
        <Field
          label="GHG emissions"
          value={parcel.total_ghg_emissions ? `${parcel.total_ghg_emissions.toLocaleString()} MTCO2e` : '—'}
        />
        <Field label="Flood zone" value={parcel.flood_zone ?? 'None flagged'} />
        <Field label="Disadvantaged community" value={parcel.disadvantaged_community ? 'Yes' : 'No'} />
      </dl>

      {parcel.readiness_breakdown?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Score breakdown</h3>
          <ul className="mt-1.5 space-y-1 text-sm">
            {parcel.readiness_breakdown.map((b) => (
              <li key={b.label} className="flex justify-between gap-2">
                <span className="text-neutral-300">{b.label}</span>
                <span className={b.points >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {b.points > 0 ? '+' : ''}
                  {b.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t border-neutral-800 pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Electrification strategy
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">{strategy}</p>
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-neutral-100">{value}</dd>
    </div>
  )
}
