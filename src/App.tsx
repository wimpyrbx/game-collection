import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { NotificationProvider } from './contexts/NotificationContext'

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </BrowserRouter>
  )
}
