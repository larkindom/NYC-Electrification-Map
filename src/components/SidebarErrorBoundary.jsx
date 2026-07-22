import { Component } from 'react'

// A Sidebar crash previously took the entire app down with it (React
// unmounts the whole tree on an uncaught render error with no boundary in
// place) — this contains that blast radius to the sidebar panel alone.
export default class SidebarErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col gap-2 bg-neutral-900 p-4 text-neutral-100">
          <p className="text-sm text-red-400">Couldn't render this parcel's details.</p>
          <button
            onClick={() => {
              this.setState({ error: null })
              this.props.onClose?.()
            }}
            className="w-fit rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
