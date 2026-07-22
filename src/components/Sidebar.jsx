import { getElectrificationStrategy } from '../lib/strategy'
import { scoreToColor, scoreToMatchLabel } from '../lib/scoring'

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
        <span className="text-sm font-medium text-neutral-100">{scoreToMatchLabel(parcel.readiness_score)}</span>
        <span className="text-sm text-neutral-400">· Readiness score</span>
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
          <p className="mt-1 text-xs text-neutral-500">
            Score is the percentage of applicable criteria met — criteria this parcel has no data for are
            excluded rather than counted against it.
          </p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {parcel.readiness_breakdown.map((b) =>
              b.points === null ? (
                <li key={b.label} className="flex justify-between gap-2 text-neutral-500">
                  <span>{b.label}</span>
                  <span>excluded</span>
                </li>
              ) : (
                <li key={b.label} className="flex justify-between gap-2">
                  <span className="text-neutral-300">{b.label}</span>
                  <span className={b.points >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {b.points > 0 ? '+' : ''}
                    {b.points}
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t border-neutral-800 pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Electrification strategy
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">{strategy}</p>
      </div>

      <div className="mt-4 border-t border-neutral-800 pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Data sources</h3>
        <ul className="mt-2 space-y-1.5 text-xs text-neutral-400">
          <li>
            <span className="text-neutral-300">Address, year built, lot area, flood zone</span> — NYC PLUTO
            (Dept. of City Planning). Flood flag is FEMA's preliminary 100-year floodplain designation.
          </li>
          <li>
            <span className="text-neutral-300">Fuel type, GHG emissions</span> — NYC Local Law 84 energy
            benchmarking. Only buildings large enough to require LL84 filing have this data; smaller
            buildings show as unknown.
          </li>
          <li>
            <span className="text-neutral-300">Boiler make</span> — DOB NOW: Safety Boiler filings, matched
            via the building's LL84 record.
          </li>
          <li>
            <span className="text-neutral-300">Disadvantaged community</span> — NY State Climate Justice
            Working Group's Interim DAC (2020) tracts, matched by census tract. This match is approximate
            (PLUTO's 2010-vintage tracts vs. the DAC dataset's newer boundaries).
          </li>
          <li>
            <span className="text-neutral-300">Readiness score</span> — computed locally from the fields
            above as a percentage of applicable criteria met, so a parcel with no LL84 data isn't penalized
            for information it structurally can't have. The GHG comparison is against the median of the
            currently loaded neighborhood(s), not a citywide figure.
          </li>
        </ul>
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
