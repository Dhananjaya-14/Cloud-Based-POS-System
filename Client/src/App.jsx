import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RegisterStep1 from './pages/RegisterStep1';
import RegisterStep2 from './pages/RegisterStep2';
import RegisterStep3 from './pages/RegisterStep3';
import BranchManagement from './pages/admin/BranchManagement';
import AddUser from './pages/admin/AddUser';
import EditUser from './pages/admin/EditUser';
import BranchProfile from './pages/admin/branch_profile';
import BranchProfileEdit from './pages/admin/branchProfileEdit';
import UserManagement from './pages/admin/UserManagement';
import ProductManagement from './pages/branch-admin/ProductManagement';
import AddProduct from './pages/branch-admin/AddProduct';
import ProductDetails from './pages/branch-admin/ProductDetails';
import ProtectedRoute from './components/ProtectedRoute';
import AddRawMaterials from './pages/branch-admin/AddRawMaterials';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register/step-1" element={<RegisterStep1 />} />
      <Route path="/register/step-2" element={<RegisterStep2 />} />
      <Route path="/register/step-3" element={<RegisterStep3 />} />

      <Route
        path="/branches"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <BranchManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/add"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AddUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/:userId/edit"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <EditUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch_profile/:branchId"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <BranchProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch_profile/:branchId/edit"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <BranchProfileEdit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <ProductManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/add"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <AddProduct />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/:productId"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/:productId/edit"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <ProductDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branch-admin/products/:productId/delete"
        element={
          <ProtectedRoute allowedRoles={[1, 2]}>
            <ProductDetails />
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

      <Route path="*" element={<Navigate to="/" />} />
      
    </Routes>
  );
}

export default App;

























// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Login from './pages/Login';
// import RegisterStep1 from './pages/RegisterStep1';
// import RegisterStep2 from './pages/RegisterStep2';
// import RegisterStep3 from './pages/RegisterStep3';
// import BranchManagement from './pages/admin/BranchManagement';
// import AddUser from './pages/admin/AddUser';
// import EditUser from './pages/admin/EditUser';


// import BranchProfile from './pages/admin/branch_profile';
// import BranchProfileEdit from './pages/admin/branchProfileEdit';
// import UserManagement from './pages/admin/UserManagement';


// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Login />} />
//         {/* <Route path="/" element={<Navigate to="/register/step-1" />} /> */}
//         <Route path="/register/step-1" element={<RegisterStep1 />} />
//         <Route path="/register/step-2" element={<RegisterStep2 />} />
//         <Route path="/register/step-3" element={<RegisterStep3 />} />
        

//         <Route path="/branches" element={<BranchManagement />} />
//         <Route path="/users" element={<UserManagement />} />
//         <Route path="/users/add" element={<AddUser />} />
//         <Route path="/users/:userId/edit" element={<EditUser/>}/>
//         <Route path="/branch_profile/:branchId" element={<BranchProfile />} />
//         <Route path="/branch_profile/:branchId/edit" element={<BranchProfileEdit />} />


//         <Route path="*" element={<Navigate to="/" />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;




