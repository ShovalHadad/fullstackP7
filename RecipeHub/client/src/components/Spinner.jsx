import './Spinner.css'

function Spinner({ label, size }) {
  const containerClass = size === 'small' ? 'spinner-container small' : 'spinner-container'
  const spinnerClass = size === 'small' ? 'spinner small' : 'spinner'

  return (
    <div className={containerClass}>
      <div className={spinnerClass} />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  )
}

export default Spinner
