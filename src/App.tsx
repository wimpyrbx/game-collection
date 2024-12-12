import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Testing from './pages/Testing'
import TypeCategoryAdmin from './pages/TypeCategoryAdmin'
import ProductAdmin from './pages/ProductAdmin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="testing" element={<Testing />} />
          <Route path="type-category-admin" element={<TypeCategoryAdmin />} />
          <Route path="product-admin" element={<ProductAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
export default App
