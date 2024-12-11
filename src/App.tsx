import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Testing from './pages/Testing'
import TypeCategoryAdmin from './pages/TypeCategoryAdmin'

function App() {
  return (
    <BrowserRouter basename="/dist">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="testing" element={<Testing />} />
          <Route path="type-category-admin" element={<TypeCategoryAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
export default App
