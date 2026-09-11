'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Pill, X, Clock, Loader2 } from 'lucide-react'
import TopNav from '@/components/layout/TopNav'
import { cn, getStatusColor, getStatusLabel, formatTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/browser'
import { createNotification } from '@/lib/notifications'
import { deriveStatus, getAdherenceRate } from '@/lib/medications'

const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────
interface Medication {
  id: string
  user_id: string
  name: string
  dosage: string
  frequency: string
  times: string[]
  category: string
  color: string
  pill_color: string
  shape: string
  stock: number
  total_stock: number
  prescribed_by: string
  start_date: string
  end_date: string
  refill_date: string
  instructions: string
  status: string
}

type MedicationForm = Omit<Medication, 'id' | 'user_id'>

const EMPTY_FORM: MedicationForm = {
  name: '',
  dosage: '',
  frequency: 'Once daily',
  times: ['08:00'],
  category: 'Other',
  color: 'blue',
  pill_color: '#4A90D9',
  shape: 'oval',
  stock: 0,
  total_stock: 0,
  prescribed_by: '',
  start_date: '',
  end_date: '',
  refill_date: '',
  instructions: '',
  status: 'active',
}

const MEDICATION_TYPES = [
  'Antibiotic',
  'Pain Reliever / Analgesic',
  'Antidiabetic',
  'Antihypertensive (Blood Pressure)',
  'ACE Inhibitor',
  'Calcium Channel Blocker',
  'Statin (Cholesterol)',
  'Antiplatelet / Blood Thinner',
  'Anticoagulant',
  'Supplement / Vitamin',
  'Antihistamine (Allergy)',
  'Respiratory Medication',
  'Gastrointestinal',
  'Hormonal Medication',
  'Other',
]

const DOSAGE_UNITS = [
  { value: 'mg', label: 'mg (milligrams)' },
  { value: 'mcg', label: 'mcg / µg (micrograms)' },
  { value: 'g', label: 'g (grams)' },
  { value: 'mL', label: 'mL (milliliters)' },
  { value: 'units', label: 'units' },
  { value: 'drops', label: 'drops' },
  { value: 'puffs', label: 'puffs' },
  { value: 'tablets/capsules', label: 'tablets/capsules' },
]

// Splits a combined dosage string (e.g. "500mg", "1000 IU") into amount + unit
// for the two-field editor. Falls back gracefully for legacy/free-typed units
// that aren't in DOSAGE_UNITS — the raw unit is kept so old data isn't silently
// rewritten the first time someone opens the Edit modal.
function parseDosage(dosage: string): { amount: string; unit: string } {
  const match = dosage.trim().match(/^([\d.]+)\s*(.*)$/)
  if (!match) return { amount: dosage.trim(), unit: DOSAGE_UNITS[0].value }
  const amount = match[1]
  const rawUnit = match[2].trim()
  if (!rawUnit) return { amount, unit: DOSAGE_UNITS[0].value }
  const known = DOSAGE_UNITS.find((u) => u.value.toLowerCase() === rawUnit.toLowerCase())
  return { amount, unit: known ? known.value : rawUnit }
}

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Three times daily',
  'Every 8 hours', 'As needed',
]

const FREQUENCY_TIMES: Record<string, string[]> = {
  'Once daily':        ['08:00'],
  'Twice daily':       ['08:00', '20:00'],
  'Three times daily': ['08:00', '14:00', '20:00'],
  'Every 8 hours':     ['06:00', '14:00', '22:00'],
  'As needed':         ['08:00'],
}

const STATUSES = ['All', 'active', 'low-stock', 'completed', 'expired']

// ── Main Page ─────────────────────────────────────────────────────────
export default function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchMeds = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) { showToast(error.message, 'error'); return }
    setMeds(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMeds() }, [fetchMeds])

  const handleDelete = async () => {
    if (!selectedMed) return
    setDeleting(true)

    // Also delete associated reminders
    await supabase.from('reminders').delete().eq('medication_id', selectedMed.id)
    const { error } = await supabase.from('medications').delete().eq('id', selectedMed.id)

    setDeleting(false)
    setShowDeleteModal(false)
    setSelectedMed(null)

    if (error) { showToast(error.message, 'error'); return }
    showToast('Medication removed.', 'success')
    fetchMeds()
  }

  const openEdit = (med: Medication) => { setSelectedMed(med); setShowModal(true) }
  const openDelete = (med: Medication) => { setSelectedMed(med); setShowDeleteModal(true) }

  const filtered = meds.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'All' || m.category === selectedCategory
    const matchStatus = selectedStatus === 'All' || m.status === selectedStatus
    return matchSearch && matchCat && matchStatus
  })

  return (
    <div>
      <TopNav title="Medications" subtitle="Manage your prescription list" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="pl-9 input-field"
              placeholder="Search medications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="input-field w-auto text-slate-600"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Medication Types</option>
              {MEDICATION_TYPES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              className="input-field w-auto text-slate-600"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Status' : getStatusLabel(s)}
                </option>
              ))}
            </select>
            <button
              onClick={() => { setSelectedMed(null); setShowModal(true) }}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Medication</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',     value: meds.length,                                        color: 'text-slate-700' },
            { label: 'Active',    value: meds.filter((m) => m.status === 'active').length,    color: 'text-emerald-600' },
            { label: 'Low Stock', value: meds.filter((m) => m.status === 'low-stock').length, color: 'text-amber-600' },
            { label: 'Expired',   value: meds.filter((m) => m.status === 'expired').length,   color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Medications Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 h-52 animate-pulse bg-slate-50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {meds.length === 0 ? 'No medications yet' : 'No medications found'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {meds.length === 0
                ? 'Click "Add Medication" to get started'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((med, i) => (
              <MedicationCard
                key={med.id}
                med={med}
                index={i}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <AddEditModal
          med={selectedMed}
          onClose={() => { setShowModal(false); setSelectedMed(null) }}
          onSaved={() => { setShowModal(false); setSelectedMed(null); fetchMeds(); showToast(selectedMed ? 'Medication updated!' : 'Medication added!', 'success') }}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedMed && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center">Remove Medication?</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                Are you sure you want to remove{' '}
                <span className="font-semibold text-slate-700">{selectedMed.name}</span>?
                This will also delete all associated reminders.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary flex-1"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Medication Card ───────────────────────────────────────────────────
function MedicationCard({
  med, index, onEdit, onDelete,
}: {
  med: Medication
  index: number
  onEdit: (m: Medication) => void
  onDelete: (m: Medication) => void
}) {
  const stockPct = med.total_stock > 0 ? Math.round((med.stock / med.total_stock) * 100) : 0
  const stockColor =
    stockPct <= 20 ? 'bg-red-500' : stockPct <= 40 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div
      className="card p-5 card-hover animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: (med.pill_color ?? '#94a3b8') + '20' }}
          >
            <Pill className="w-5 h-5" style={{ color: med.pill_color ?? '#94a3b8' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{med.name}</h3>
            <p className="text-xs text-slate-500">{med.dosage}</p>
          </div>
        </div>
        <span className={cn('badge text-[10px]', getStatusColor(med.status))}>
          {getStatusLabel(med.status)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Medication Type</span>
          <span className="text-slate-700 font-medium">{med.category}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Schedule</span>
          <span className="text-slate-700 font-medium">{med.frequency}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Time(s)</span>
          <span className="text-slate-700 font-medium">
            {(med.times || []).map(formatTime).join(', ')}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Instructions</span>
          <span className="text-slate-700 font-medium truncate ml-4 max-w-[140px]">
            {med.instructions || '—'}
          </span>
        </div>
      </div>

      {/* Stock bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">Stock</span>
          <span className="font-medium text-slate-700">
            {med.stock}/{med.total_stock} pills
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full progress-bar', stockColor)}
            style={{ width: `${stockPct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={() => onEdit(med)}
          className="flex-1 flex items-center justify-center gap-1.5 btn-secondary text-xs py-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={() => onDelete(med)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border border-slate-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────
function AddEditModal({
  med, onClose, onSaved,
}: {
  med: Medication | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<MedicationForm>(
    med
      ? {
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          times: med.times || ['08:00'],
          category: med.category,
          color: med.color,
          pill_color: med.pill_color ?? '#4A90D9',
          shape: med.shape,
          stock: med.stock,
          total_stock: med.total_stock,
          prescribed_by: med.prescribed_by,
          start_date: med.start_date,
          end_date: med.end_date,
          refill_date: med.refill_date,
          instructions: med.instructions,
          status: med.status,
        }
      : { ...EMPTY_FORM },
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const initialDosage = parseDosage(med?.dosage ?? '')
  const [dosageAmount, setDosageAmount] = useState(initialDosage.amount)
  const [dosageUnit, setDosageUnit] = useState(initialDosage.unit)

  const set = (key: keyof MedicationForm, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleFrequencyChange = (freq: string) => {
    set('frequency', freq)
    set('times', FREQUENCY_TIMES[freq] ?? ['08:00'])
  }

  const updateTime = (index: number, value: string) => {
    const next = [...form.times]
    next[index] = value
    set('times', next)
  }

  const addTime = () => set('times', [...form.times, '08:00'])
  const removeTime = (index: number) =>
    set('times', form.times.filter((_, i) => i !== index))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!dosageAmount.trim()) errs.dosage = 'Dosage amount is required'
    if (form.times.length === 0) errs.times = 'At least one time is required'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let adherence: number | null = null
    if (med && form.end_date && new Date(form.end_date) < new Date()) {
      adherence = await getAdherenceRate(med.id)
    }
    const derivedStatus = deriveStatus(form.stock, form.total_stock, form.end_date, adherence)
    const combinedDosage = `${dosageAmount.trim()} ${dosageUnit}`.trim()
    const payload = {
      ...form,
      dosage: combinedDosage,
      status: derivedStatus,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      refill_date: form.refill_date || null,
    }

    if (med) {
      // UPDATE
      const { error } = await supabase
        .from('medications')
        .update(payload)
        .eq('id', med.id)

      if (error) { setSaving(false); setErrors({ save: error.message }); return }

      // Update future reminders scheduled_time if times changed
      await supabase
        .from('reminders')
        .delete()
        .eq('medication_id', med.id)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])

      await createReminders(med.id, user.id, form.times)

      // Notify only when status just changed (avoid re-notifying on every save)
      if (derivedStatus !== med.status) {
        if (derivedStatus === 'low-stock') {
          await createNotification(
            user.id, 'warning',
            `${form.name} is running low (${form.stock} pill${form.stock === 1 ? '' : 's'} left)`,
          )
        } else if (derivedStatus === 'completed') {
          await createNotification(user.id, 'success', `${form.name} course completed`)
        } else if (derivedStatus === 'expired') {
          await createNotification(user.id, 'info', `${form.name} has expired`)
        }
      }
    } else {
      // INSERT
      const { data: newMed, error } = await supabase
        .from('medications')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()

      if (error) { setSaving(false); setErrors({ save: error.message }); return }

      // Create reminders for the next 30 days
      await createReminders(newMed.id, user.id, form.times)

      if (derivedStatus === 'low-stock') {
        await createNotification(
          user.id, 'warning',
          `${form.name} is running low (${form.stock} pill${form.stock === 1 ? '' : 's'} left)`,
        )
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {med ? 'Edit Medication' : 'Add New Medication'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">Medication Name *</label>
              <input
                className={cn('input-field', errors.name && 'border-red-400')}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Metformin"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Dosage Amount + Dosage Unit */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dosage Amount *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={cn('input-field', errors.dosage && 'border-red-400')}
                    value={dosageAmount}
                    onChange={(e) => setDosageAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="label">Dosage Unit *</label>
                  <select
                    className="input-field"
                    value={dosageUnit}
                    onChange={(e) => setDosageUnit(e.target.value)}
                  >
                    {DOSAGE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                    {!DOSAGE_UNITS.some((u) => u.value === dosageUnit) && (
                      <option value={dosageUnit}>{dosageUnit}</option>
                    )}
                  </select>
                </div>
              </div>
              {errors.dosage && <p className="text-xs text-red-500 mt-1">{errors.dosage}</p>}
            </div>

            {/* Category + Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Medication Type</label>
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {MEDICATION_TYPES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Frequency *</label>
                <select
                  className="input-field"
                  value={form.frequency}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                >
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Schedule Times */}
            <div>
              <label className="label">Schedule Times</label>
              <div className="space-y-2">
                {form.times.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 flex-1 input-field py-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <input
                        type="time"
                        className="flex-1 outline-none text-sm bg-transparent"
                        value={t}
                        onChange={(e) => updateTime(i, e.target.value)}
                      />
                    </div>
                    {form.times.length > 1 && (
                      <button
                        onClick={() => removeTime(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors border border-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTime}
                  className="text-xs text-teal-600 font-semibold hover:text-teal-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another time
                </button>
              </div>
              {errors.times && <p className="text-xs text-red-500 mt-1">{errors.times}</p>}
            </div>

            {/* Start + End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.start_date}
                  onChange={(e) => set('start_date', e.target.value)}
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.end_date}
                  onChange={(e) => set('end_date', e.target.value)}
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="label">Instructions</label>
              <input
                className="input-field"
                value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
                placeholder="e.g. Take with food"
              />
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Current Stock</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.stock}
                  min={0}
                  onChange={(e) => set('stock', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Total Stock</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.total_stock}
                  min={0}
                  onChange={(e) => set('total_stock', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Pill color */}
            <div>
              <label className="label">Pill Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-1"
                  value={form.pill_color}
                  onChange={(e) => set('pill_color', e.target.value)}
                />
                <span className="text-sm text-slate-500">{form.pill_color}</span>
              </div>
            </div>

            {/* Prescribed by */}
            <div>
              <label className="label">Prescribed By</label>
              <input
                className="input-field"
                value={form.prescribed_by}
                onChange={(e) => set('prescribed_by', e.target.value)}
                placeholder="Doctor's name"
              />
            </div>

            {errors.save && (
              <p className="text-xs text-red-500 font-medium">{errors.save}</p>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {med ? 'Save Changes' : 'Add Medication'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create reminders for the next 30 days ────────────────────────────
async function createReminders(medicationId: string, userId: string, times: string[]) {
  const today = new Date()
  const rows = []

  for (let d = 0; d < 30; d++) {
    const date = new Date(today)
    date.setDate(today.getDate() + d)
    const dateStr = date.toISOString().split('T')[0]

    for (const time of times) {
      rows.push({
        user_id: userId,
        medication_id: medicationId,
        scheduled_date: dateStr,
        scheduled_time: time,
        status: 'upcoming',
      })
    }
  }

  await supabase.from('reminders').insert(rows)
}