import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Testing from './pages/Testing'
import TypeCategoryAdmin from './pages/TypeCategoryAdmin'
import ProductAdmin from './pages/ProductAdmin'
import MiniatureOverview from './pages/MiniatureOverview'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="testing" element={<Testing />} />
        <Route path="type-category-admin" element={<TypeCategoryAdmin />} />
        <Route path="product-admin" element={<ProductAdmin />} />
        <Route path="/miniature-overview" element={<MiniatureOverview />} />
      </Route>
    </Routes>
  )
} 