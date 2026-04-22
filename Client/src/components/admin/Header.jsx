// import React from "react";
// import { FaBell, FaUserCircle } from "react-icons/fa";

// const Header = ({ title = "Branch Management" }) => {
//   return (
//     <div
//       style={{
//         position: "sticky",
//         top: 0,
//         zIndex: 30,
//         height: 64,
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         padding: "0 22px",
//         color: "#fff",
//         background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
//         boxSizing: "border-box",
//       }}
//     >
//       <h2 style={{ fontSize: 20, margin: 0, fontWeight: 600 }}>{title}</h2>

//       <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
//         <FaBell size={18} />

//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 10,
//             background: "rgba(255,255,255,0.12)",
//             padding: "6px 12px",
//             borderRadius: 20,
//           }}
//         >
//           <FaUserCircle size={28} />
//           <div style={{ lineHeight: 1 }}>
//             <div style={{ fontSize: 13, fontWeight: 600 }}>super Admin</div>
//             <div style={{ fontSize: 12, opacity: 0.9 }}>superadmin@gmail.com</div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Header;



































import React from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";

const Header = ({ title = "Branch Management" }) => {
  return (
    <div
      style={{
        height: "70px",
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        margin: 0,
        color: "#fff",
        background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
      }}
    >
      {/* <h2>Branch Management</h2> */}

      <h2 style={{ fontSize: "26px", margin: 0, fontWeight: "500" }}>
        {title}
      </h2>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <FaBell size={20} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,0.2)",
            padding: "5px 10px",
            borderRadius: "20px",
          }}
        >
          <FaUserCircle size={30} />
          <div>
            <div style={{ fontSize: "14px" }}>super Admin</div>
            <div style={{ fontSize: "12px" }}>
              superadmin@gmail.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;





















