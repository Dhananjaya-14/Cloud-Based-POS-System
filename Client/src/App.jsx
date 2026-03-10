import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RegisterStep1 from './pages/RegisterStep1';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* <Route path="/" element={<Navigate to="/register/step-1" />} /> */}
        <Route path="/register/step-1" element={<RegisterStep1 />} />
        




        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;




