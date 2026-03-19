import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RegisterStep1 from './pages/RegisterStep1';
import RegisterStep2 from './pages/RegisterStep2';
import RegisterStep3 from './pages/RegisterStep3';
import BranchManagement from './pages/admin/BranchManagement';
import AddUser from './pages/admin/AddUser';
import EditUser from './pages/admin/EditUser';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* <Route path="/" element={<Navigate to="/register/step-1" />} /> */}
        <Route path="/register/step-1" element={<RegisterStep1 />} />
        <Route path="/register/step-2" element={<RegisterStep2 />} />
        <Route path="/register/step-3" element={<RegisterStep3 />} />
        

        <Route path="/branches" element={<BranchManagement />} />
        <Route path="/users" element={<AddUser />} />
        <Route path="/edit" element={<EditUser/>}/>


        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;




