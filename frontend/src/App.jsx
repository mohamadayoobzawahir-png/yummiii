import Navbar from './components/Navbar'
import DemoBanner from './components/DemoBanner'
import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import NotFound from './pages/NotFound'
import OrderSuccess from './pages/OrderSuccess'
import Login from './pages/Login'
import TrackOrder from './pages/TrackOrder'
import AdminRoute from './components/AdminRoute'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCategories from './pages/admin/AdminCategories'
import AdminSales from './pages/admin/AdminSales'
import AdminStock from './pages/admin/AdminStock'
import AdminStockHistory from './pages/admin/AdminStockHistory'

function App() {
  return (
    <div>
      <DemoBanner />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
          <Route path="/admin/sales" element={<AdminRoute><AdminSales /></AdminRoute>} />
          <Route path="/admin/stock" element={<AdminRoute><AdminStock /></AdminRoute>} />
          <Route path="/admin/stock/history" element={<AdminRoute><AdminStockHistory /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
