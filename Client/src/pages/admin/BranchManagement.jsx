import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import SuperAdminSidebar from "../../components/super-admin/Sidebar";
import SuperAdminHeader from "../../components/super-admin/Header";
import BranchTable from "../../components/admin/BranchTable";
import Button from "../../components/admin/Button";
import AddBranchWizard from "../../components/admin/AddBranchModal";
import { getBranches, setAuthToken, logout } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/super-admin/Spinner";


const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 64;

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchBranches();
  }, [navigate]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      console.error("fetchBranches error:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const addButtonStyle = {
  padding: "10px 18px",
  background: "#2E3E8F", // or backgroundColor: "#2E3E8F"
  color: "#fff",
  borderRadius: "8px",
  fontWeight: 600,
};

  return (
    <div style={{ display: "flex",minHeight: "100vh", background: "#F4F6F9" }}>
      {user?.role_id === 6 ? <SuperAdminSidebar /> : <Sidebar />}

      <div style={{ flex: 1, marginLeft: "240px" }}>
        {user?.role_id === 6 ? <SuperAdminHeader /> : <Header />}

        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h1 style={{ fontSize: "22px", margin: 10, fontWeight: "500" }}>Branch Management</h1>
            <Button label="+ New Branch" onClick={() => setShowModal(true)} />
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", marginTop: "24px", background: "#ffffff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)" }}>
              <Spinner size={36} />
            </div>
          ) : (
            <BranchTable branches={branches} />
          )}
        </div>
      </div>
      {showModal && (
        <AddBranchWizard
          onClose={() => setShowModal(false)}
          onSuccess={fetchBranches}
        />
      )}
    </div>
  );
};

export default BranchManagement;






















// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Sidebar from "../../components/admin/Sidebar";
// import Header from "../../components/admin/Header";
// import BranchTable from "../../components/admin/BranchTable";
// import Button from "../../components/admin/Button";
// import AddBranchWizard from "../../components/admin/AddBranchModal";
// import { getBranches, setAuthToken, logout } from "../../services/api";

// const BranchManagement = () => {
//   const [branches, setBranches] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/login");
//       return;
//     }
//     setAuthToken(token);
//     fetchBranches();
//   }, [navigate]);

//   const fetchBranches = async () => {
//     try {
//       const data = await getBranches();
//       setBranches(data);
//     } catch (err) {
//       console.error("fetchBranches error:", err);
//       if (err.response?.status === 401) {
//         logout();
//         navigate("/login");
//       }
//     }
//   };

//   return (
//     <div style={pageWrapper}>
//       {/* Fixed Sidebar */}
//       <Sidebar />

//       {/* Main Content Area */}
//       <div style={mainContent}>
//         <Header />

//         <div style={containerBody}>
//           <div style={contentHeader}>
//             <div>
//               <h1 style={titleStyle}>Branch Management</h1>
//               <p style={subtitleStyle}>Manage and monitor all your POS branch locations</p>
//             </div>
            
//             <Button 
//               label="+ New Branch" 
//               onClick={() => setShowModal(true)} 
//               // Passing extra style if your Button component supports it
//               style={addButtonStyle} 
//             />
//           </div>

//           <div style={tableWrapper}>
//             <BranchTable branches={branches} />
//           </div>
//         </div>
//       </div>

//       {showModal && (
//         <AddBranchWizard
//           onClose={() => setShowModal(false)}
//           onSuccess={fetchBranches}
//         />
//       )}
//     </div>
//   );
// };

// /* --- Modern Layout Styles --- */

// const pageWrapper = {
//   display: "flex",
//   background: "#F8FAFC", // Cleaner, lighter slate background
//   minHeight: "100vh",
//   width: "100%",
// };

// const mainContent = {
//   flex: 1,
//   marginLeft: "240px", // Matches your Sidebar width
//   display: "flex",
//   flexDirection: "column",
//   width: "calc(100% - 240px)",
// };

// const containerBody = {
//   padding: "30px", // More generous breathing room
//   flex: 1,
// };

// const contentHeader = {
//   display: "flex",
//   justifyContent: "space-between",
//   alignItems: "center",
//   marginBottom: "25px", // Separation from the table
// };

// const titleStyle = {
//   fontSize: "24px",
//   fontWeight: "700",
//   color: "#1E293B",
//   margin: 0,
// };

// const subtitleStyle = {
//   fontSize: "14px",
//   color: "#64748B",
//   marginTop: "4px",
// };

// const tableWrapper = {
//   background: "#FFFFFF",
//   borderRadius: "12px",
//   boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
//   overflow: "hidden", // Ensures table corners follow the border radius
// };

// const addButtonStyle = {
//   padding: "10px 20px",
//   backgroundColor: "#2E3E8F",
//   color: "#fff",
//   borderRadius: "8px",
//   fontWeight: "600",
// };

// export default BranchManagement;



































// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Sidebar from "../../components/admin/Sidebar";
// import Header from "../../components/admin/Header";
// import BranchTable from "../../components/admin/BranchTable";
// import Button from "../../components/admin/Button";
// import AddBranchWizard from "../../components/admin/AddBranchModal";
// import { getBranches, setAuthToken, logout } from "../../services/api";

// const BranchManagement = () => {
//   const [branches, setBranches] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/login");
//       return;
//     }
//     // ensure api instance has the Authorization header
//     setAuthToken(token);
//     fetchBranches();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const fetchBranches = async () => {
//     try {
//       const data = await getBranches();
//       setBranches(data);
//     } catch (err) {
//       console.error("fetchBranches error:", err);
//       if (err.response?.status === 401 || (err.response && err.response.data?.message === "Missing token")) {
//         // token missing/expired -> cleanup and redirect to login
//         logout();
//         navigate("/login");
//       }
//     }
//   };

//   return (
//     <div style={{ display: "flex", background: "#F4F6F9" }}>
//       <Sidebar />

//       <div style={{ flex: 1, marginLeft: "240px" }}>
//         <Header />

//         <div style={{ padding: "20px" }}>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <h1 style={{ fontSize: "22px", margin: 10, fontWeight: "500" }}>Branch Management</h1>
//             <Button label="+ New Branch" onClick={() => setShowModal(true)} />
//           </div>

//           <BranchTable branches={branches} />
//         </div>
//       </div>
//       {showModal && (
//         <AddBranchWizard
//           onClose={() => setShowModal(false)}
//           onSuccess={fetchBranches}
//         />
//       )}
//     </div>
//   );
// };

// export default BranchManagement;




















// // import React, { useEffect, useState } from "react";
// // import Sidebar from "../../components/admin/Sidebar";
// // import Header from "../../components/admin/Header";
// // import BranchTable from "../../components/admin/BranchTable";
// // import Button from "../../components/admin/Button";
// // import AddBranchWizard from "../../components/admin/AddBranchModal";
// // import { getBranches } from "../../services/api";

// // const BranchManagement = () => {
// //   const [branches, setBranches] = useState([]);
// //   const [showModal, setShowModal] = useState(false);

// //   useEffect(() => {
// //     fetchBranches();
// //   }, []);

// //   const fetchBranches = async () => {
// //     const data = await getBranches();
// //     setBranches(data);
// //   };

// //   return (
// //     <div style={{ display: "flex", background: "#F4F6F9" }}>
// //       <Sidebar />

// //       <div style={{ flex: 1, marginLeft: "240px" }}>
// //         <Header />

// //         <div style={{ padding: "20px" }}>
// //           <div
// //             style={{
// //               display: "flex",
// //               justifyContent: "space-between",
// //               alignItems: "center",
// //             }}
// //           >
// //             <h1 style={{ fontSize: "22px", margin: 10, fontWeight: "500" }}>Branch Management</h1>
// //             <Button label="+ New Branch" onClick={() => setShowModal(true)} />
// //           </div>

// //           <BranchTable branches={branches} />
// //         </div>
// //       </div>
// //       {showModal && (
// //         <AddBranchWizard
// //           onClose={() => setShowModal(false)}
// //           onSuccess={fetchBranches}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // export default BranchManagement;


