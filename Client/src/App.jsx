import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RegisterStep1 from './pages/RegisterStep1';
import RegisterStep2 from './pages/RegisterStep2';
import RegisterStep3 from './pages/RegisterStep3';
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import SuperAdminHotelManagement from './pages/super-admin/HotelManagement';
import SuperAdminUserManagement from './pages/super-admin/UserManagement';
import SuperAdminUserDetails from './pages/super-admin/UserDetails';
import SuperAdminAddUser from './pages/super-admin/AddUser';
import BranchManagement from './pages/admin/BranchManagement';
import AddUser from './pages/admin/AddUser';
import EditUser from './pages/admin/EditUser';
import BranchProfile from './pages/admin/branch_profile';
import BranchProfileEdit from './pages/admin/branchProfileEdit';
import UserManagement from './pages/admin/UserManagement';
import AdminProductManagement from './pages/admin/ProductManagement';
import AdminAddProduct from './pages/admin/AddProduct';
import AdminProductDetails from './pages/admin/ProductDetails';
import ProductManagement from './pages/branch-admin/ProductManagement';
import AddProduct from './pages/branch-admin/AddProduct';
import ProductDetails from './pages/branch-admin/ProductDetails';
import BranchAdminUserManagement from './pages/branch-admin/UserManagement';
import BranchAdminAddUser from './pages/branch-admin/AddUser';
import BranchAdminEditUser from './pages/branch-admin/EditUser';
import CashierDashboard from './pages/cashier/CashierDashboard';
import CashierPos from './pages/cashier/CashierPos';
import InvoicePreview from './pages/cashier/InvoicePreview';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStatistics from './pages/admin/AdminStatistics';
import AdminTransactions from './pages/admin/Transactions';
import BranchTransactions from './pages/branch-admin/Transactions';

// Route wrapper: if logged-in user is a Branch Admin (role_id = 1),
// send them to Product Management instead of showing Branch Profile.
const BranchProfileRouter = () => {
  const { user } = useAuth();

  if (user?.role_id === 1) {
    return <Navigate to="/branch-admin/products" replace />;
  }

  return <BranchProfile />;
};
import AddRawMaterials from './pages/branch-admin/AddRawMaterials';
import InventoryDashboard from './pages/branch-admin/InventoryDashboard';
import SupplierManagement from './pages/branch-admin/SupplierManagement';
import BranchAdminDashboard from './pages/branch-admin/Dashboard';
import SalesRevenue from './pages/branch-admin/SalesRevenue';
import CashierPerformance from './pages/branch-admin/CashierPerformance';
import KitchenManagement from './pages/kitchen/KitchenManagement';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register/step-1" element={<RegisterStep1 />} />
      <Route path="/register/step-2" element={<RegisterStep2 />} />
      <Route path="/register/step-3" element={<RegisterStep3 />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[6]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/hotels"
        element={
          <ProtectedRoute allowedRoles={[6]}>
            <SuperAdminHotelManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/users"
        element={
          <ProtectedRoute allowedRoles={[6]}>
            <SuperAdminUserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/users/add"
        element={
          <ProtectedRoute allowedRoles={[6]}>
            <SuperAdminAddUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/users/:id/edit"
        element={
          <ProtectedRoute allowedRoles={[6]}>
            <SuperAdminUserDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branches"
        element={
          <ProtectedRoute allowedRoles={[2, 6]}>
            <BranchManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={[2, 6]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/users"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <BranchAdminUserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/add"
        element={
          <ProtectedRoute allowedRoles={[2, 6]}>
            <AddUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/users/add"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <BranchAdminAddUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId/edit"
        element={
          <ProtectedRoute allowedRoles={[2, 6]}>
            <EditUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/users/:userId/edit"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <BranchAdminEditUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch_profile/:branchId"
        element={
          <ProtectedRoute allowedRoles={[1, 2, 6]}>
            <BranchProfileRouter />
          </ProtectedRoute>
        }
      />

      {/* Fallback when branchId is missing (e.g. Login builds /branch_profile/ with empty id) */}
      <Route
        path="/branch_profile"
        element={
          <ProtectedRoute allowedRoles={[1, 2, 6]}>
            <BranchProfileRouter />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch_profile/:branchId/edit"
        element={
          <ProtectedRoute allowedRoles={[2, 6]}>
            <BranchProfileEdit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AdminProductManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products/add"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AdminAddProduct />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products/:productId"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AdminProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products/:productId/edit"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AdminProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products/:productId/delete"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AdminProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <ProductManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <BranchAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/add"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <AddProduct />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/:productId"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/:productId/edit"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/:productId/delete"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kitchen/orders"
        element={
          <ProtectedRoute allowedRoles={[9, 1, 2, 3]}>
            <KitchenManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/raw-ingredient"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <AddRawMaterials />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/inventory"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <InventoryDashboard />
          </ProtectedRoute>
        }

        />

      <Route
        path="/branch-admin/sales-revenue"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <SalesRevenue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/cashier-performance"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <CashierPerformance />
          </ProtectedRoute>
        }
      />


      <Route
        path="/branch-admin/suppliers"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <SupplierManagement />
          </ProtectedRoute>
        }

        />

        <Route
          path="/cashier/dashboard"
          element={
            <ProtectedRoute allowedRoles={[3]}>
              <CashierDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cashier/pos"
          element={
            <ProtectedRoute allowedRoles={[3]}>
              <CashierPos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cashier/invoice-preview"
          element={
            <ProtectedRoute allowedRoles={[3]}>
              <InvoicePreview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={[2]}>
              <AdminDashboard />
            </ProtectedRoute>
        }
      />

        <Route
          path="/admin/statistics"
          element={
            <ProtectedRoute allowedRoles={[2]}>
              <AdminStatistics />
            </ProtectedRoute>
       }
      />

        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute allowedRoles={[2]}>
              <AdminTransactions />
            </ProtectedRoute>
       }
      />

              <Route
          path="/branch-admin/transactions"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <BranchTransactions />
            </ProtectedRoute>
       }
      />

      <Route path="*" element={<Navigate to="/" />} />
      
    </Routes>
  );
}

export default App;























