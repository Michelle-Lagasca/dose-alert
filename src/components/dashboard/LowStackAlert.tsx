import Link from 'next/link'
import { AlertTriangle, ChevronRight, Package } from 'lucide-react'

interface Medication {
  id: string
  name: string
  status: string
  stock: number
  total_stock: number
  pill_color: string
}

interface LowStockAlertProps {
  medications: Medication[]
}

export default function LowStockAlert({ medications }: LowStockAlertProps) {
  const lowStock = medications.filter(
    (m) =>
      m.status === 'low-stock' ||
      (m.status === 'active' && m.total_stock > 0 && m.stock / m.total_stock <= 0.3),
  )

  if (lowStock.length === 0) return null

  return (
    <div className="card p-5 border-amber-200 bg-amber-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-amber-800">Stock Alert</h2>
        </div>
        <Link
          href="/medications"
          className="text-xs text-amber-700 font-medium flex items-center gap-1 hover:text-amber-800"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {lowStock.map((med) => {
          const pct = med.total_stock > 0 ? Math.round((med.stock / med.total_stock) * 100) : 0
          return (
            <div key={med.id} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: med.pill_color + '25' }}
              >
                <Package className="w-4 h-4" style={{ color: med.pill_color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-700 truncate">{med.name}</p>
                  <p className="text-xs text-amber-700 font-semibold ml-2">{med.stock} left</p>
                </div>
                <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full progress-bar"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}