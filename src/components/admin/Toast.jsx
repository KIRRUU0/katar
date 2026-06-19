export default function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'success'
    ? 'bg-green-100 border-green-400 text-green-800'
    : 'bg-merah-100 border-merah-400 text-merah-800'

  return (
    <div className={`${bg} border rounded-xl px-4 py-3 mb-4 flex items-center justify-between`}>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-3 text-lg leading-none opacity-60 hover:opacity-100"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>
  )
}
