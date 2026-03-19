import React, { useEffect, useState } from "react";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import BranchTable from "../../components/admin/BranchTable";
import Button from "../../components/admin/Button";
import AddBranchWizard from "../../components/admin/AddBranchModal";
import { getBranches } from "../../services/api";

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const data = await getBranches();
    setBranches(data);
  };

  return (
    <div style={{ display: "flex", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header />

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

          <BranchTable branches={branches} />
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


