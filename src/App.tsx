import './index.css'
import { useNotebook } from './hooks/useNotebook'
import { SpreadView } from './components/SpreadView'
import { NotebookBar } from './components/NotebookBar'
import { SpreadScroller } from './components/SpreadScroller'

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#F5F0E8]">
      <div className="text-center">
        <p className="font-[Caveat] text-stone-500 text-2xl mb-4">No notebooks yet.</p>
        <button
          className="font-[Caveat] text-stone-700 border border-stone-400 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors text-xl"
          onClick={onCreate}
        >
          Create notebook
        </button>
      </div>
    </div>
  )
}

function App() {
  const [state, actions] = useNotebook()

  if (!state.ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#F5F0E8]">
        <div className="font-[Caveat] text-stone-400 text-xl">Loading…</div>
      </div>
    )
  }

  if (state.isEmpty || !state.tbManager) {
    return <EmptyState onCreate={() => actions.createNotebook('Notebook 1')} />
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#F5F0E8]">
      <NotebookBar state={state} actions={actions} />
      <SpreadView state={state} actions={actions} tbManager={state.tbManager} />
      <SpreadScroller state={state} actions={actions} />
    </div>
  )
}

export default App
