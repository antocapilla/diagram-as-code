import { ThemeProvider } from "@/components/theme-provider"
import MermaidEditor from '@/components/MermaidEditor'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <MermaidEditor />
    </ThemeProvider>
  )
}

export default App