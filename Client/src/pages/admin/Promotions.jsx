import React, { useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import Header from '../../components/admin/Header';
import Button from '../../components/admin/Button';

const menuCategories = [
  {
    name: 'Burgers',
    items: [
      { id: 1, name: 'Classic Burger', description: 'Juicy beef patty with lettuce, tomato, and special sauce', price: '12.99', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100' },
      { id: 2, name: 'Cheese Burger', description: 'Classic burger with melted cheddar cheese', price: '14.89', image: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=100' },
      { id: 3, name: 'Chicken Burger', description: 'Grilled chicken fillet with mayo and lettuce', price: '13.99', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=100' },
    ],
  },
  {
    name: 'Salads',
    items: [
      { id: 4, name: 'Caesar Salad', description: 'Romaine lettuce, parmesan, croutons, and Caesar dressing', price: '9.99', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=100' },
      { id: 5, name: 'Greek Salad', description: 'Fresh vegetables with feta cheese and olives', price: '10.99', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100' },
    ],
  },
  {
    name: 'Sides',
    items: [
      { id: 6, name: 'French Fries', description: 'Crispy golden fries', price: '4.99', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=100' },
      { id: 7, name: 'Onion Rings', description: 'Crispy battered onion rings', price: '5.99', image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=100' },
    ],
  },
  {
    name: 'Drinks',
    items: [
      { id: 8, name: 'Coca Cola', description: 'Classic refreshing cola', price: '2.99', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=100' },
      { id: 9, name: 'Iced Tea', description: 'Fresh brewed iced tea with lemon', price: '3.49', image: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=100' },
    ],
  },
];

const Promotions = () => {
  const [view, setView] = useState('list');
  const [promotions, setPromotions] = useState([]);
  const [editingPromo, setEditingPromo] = useState(null);

  const handleDelete = (id) => {
    setPromotions(promotions.filter((p) => p.id !== id));
  };

  const handleEdit = (promo) => {
    setEditingPromo(promo);
    setView('create');
  };

  const [viewingPromo, setViewingPromo] = useState(null);

  const handleView = (promo) => {
    setViewingPromo(promo);
    setView('view');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Sidebar />
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header title="Promotions" />
        <div style={{ padding: '30px' }}>
          {view === 'list' ? (
            <PromotionsList
              promotions={promotions}
              onAddClick={() => setView('create')}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onView={handleView}
            />
          ) : view === 'view' ? (
            <ViewPromotion
              promo={viewingPromo}
              menuCategories={menuCategories}
              onBack={() => {
                setViewingPromo(null);
                setView('list');
              }}
              onEdit={() => {
                setEditingPromo(viewingPromo);
                setViewingPromo(null);
                setView('create');
              }}
            />
          ) : (
            <CreatePromotion
    onBack={() => {
      setEditingPromo(null);
      setView('list');
    }}
    initialData={editingPromo}
    onSubmit={(data) => {
      if (editingPromo) {
        setPromotions(promotions.map((p) =>
          p.id === editingPromo.id ? { ...data, id: editingPromo.id } : p
        ));
      } else {
        setPromotions([...promotions, { ...data, id: Date.now() }]);
      }
      setEditingPromo(null);
      setView('list');
    }}
  />
)}
        </div>
      </div>
    </div>
  );
};

const PromotionsList = ({ promotions, onAddClick, onDelete, onEdit, onView }) => (
  <div>
    
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
          Promotional Offers
        </h2>
        <p style={{ color: '#888', margin: '4px 0 0', fontSize: '14px' }}>
          Manage your restaurant's promotions
        </p>
      </div>

      
      <Button
        label="+ Add promotion"
        onClick={onAddClick}
      />
    </div>

    
    {promotions.length === 0 ? (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '80px 20px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontSize: '40px', color: '#ccc', marginBottom: '16px' }}>+</div>
        <h3 style={{ color: '#333', fontSize: '20px', marginBottom: '8px' }}>
          No promotions yet
        </h3>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>
          Create your first promotion to get started
        </p>

        
        <Button
          label="+ Create promotion"
          onClick={onAddClick}
        />
      </div>

    ) : (
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {promotions.map((promo) => (
          <div key={promo.id} 
           onClick={() => onView(promo)}style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '2px solid #3A4DBF',
            cursor: 'pointer'
          }}>
            {promo.imageUrl && (
              <img
                src={promo.imageUrl}
                alt={promo.title}
                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  {promo.title}
                </h3>
                <span style={{ color: '#22c55e', fontWeight: '700' }}>
                  ${promo.price}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px' }}>
                {promo.description}
              </p>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                Valid until: {promo.validUntil}
              </p>
              {/* Edit and Delete buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Button
                  label="Edit"
                  onClick={(e) => { e.stopPropagation(); onEdit(promo); }}
                  style={{
                    flex: 1,
                    background: 'white',
                    color: '#3A4DBF',
                    border: '1px solid #3A4DBF',
                    padding: '6px 12px',
                    fontSize: '13px'
                  }}
                />
                <Button
                  label="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this promotion?')) {
                      onDelete(promo.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    padding: '6px 12px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);


const CreatePromotion = ({ onBack, onSubmit, initialData }) => {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    validUntil: initialData?.validUntil || '',
    imageUrl: initialData?.imageUrl || '',
    selectedItems: initialData?.selectedItems || []
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.title || !form.price || !form.validUntil) {
      alert('Please fill Title, Price and Valid Until fields');
      return;
    }
    if (!form.selectedItems || form.selectedItems.length === 0) {
      alert('Please select at least one menu item');
      return;
    }
    onSubmit(form);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '6px',
    display: 'block'
  };

  return (
    <div>
      
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#3A4DBF',
          cursor: 'pointer',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: 0,
          fontWeight: '600'
        }}
      >
        ← Back to Promotions
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' }}>
        {initialData ? 'Edit Promotion' : 'Create New Promotion'}
        </h2>

      
      <p style={{ color: '#888', fontSize: '14px', margin: '0 0 24px' }}>
        Setup a new promotion package
      </p>

  
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '2px solid #3A4DBF',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 20px', color: '#1a1a2e' }}>
          Promotion Details
        </h3>

      
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g., Restaurant Happy Hour"
            style={inputStyle}
          />
        </div>

        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description *</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your promotion package..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <label style={labelStyle}>Promotion Price ($) *</label>
            <input
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="0.00"
              type="number"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Valid Until *</label>
            <input
              name="validUntil"
              value={form.validUntil}
              onChange={handleChange}
              type="date"
               min={new Date().toISOString().split('T')[0]}
              style={inputStyle}
            />
          </div>
        </div>

        
        <div>
          <label style={labelStyle}>Image URL *</label>
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/img.jpg"
            style={inputStyle}
          />
          <p style={{ fontSize: '12px', color: '#999', margin: '6px 0 0' }}>
            Tip: use unsplash or upload your image to a hosting service
          </p>
        </div>
        
      </div>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '2px solid #3A4DBF',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px', color: '#1a1a2e' }}>
          Select Menu Items
        </h3>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 20px' }}>
          Choose items to include in this promotion package
        </p>

        {menuCategories.map((category) => (
          <div key={category.name} style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: '0 0 12px' }}>
              {category.name}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {category.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    const exists = form.selectedItems?.includes(item.id);
                    setForm({
                      ...form,
                      selectedItems: exists
                        ? form.selectedItems.filter((i) => i !== item.id)
                        : [...(form.selectedItems || []), item.id]
                    });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: form.selectedItems?.includes(item.id)
                      ? '2px solid #3A4DBF'
                      : '1px solid #eee',
                    backgroundColor: form.selectedItems?.includes(item.id)
                      ? '#f0f3ff'
                      : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedItems?.includes(item.id) || false}
                    onChange={() => {}}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {item.description}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#3A4DBF' }}>
                    ${item.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>

        <Button
          label="Cancel"
          onClick={onBack}
          style={{
            background: 'white',
            color: '#333',
            border: '1px solid #ddd'
          }}
        />

        
        <Button
        label={initialData ? 'Update Promotion' : 'Create Promotion'}
          onClick={handleSubmit}
/>
      </div>
    </div>
  );
};
const ViewPromotion = ({ promo, menuCategories, onBack, onEdit }) => {
  const allItems = menuCategories.flatMap((c) => c.items);
  const selectedItems = allItems.filter((item) =>
    promo.selectedItems?.includes(item.id)
  );

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#3A4DBF', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0, fontWeight: '600' }}>
        ← Back to Promotions
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>Promotion Details</h2>
        <Button label="Edit Promotion" onClick={onEdit} />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '2px solid #3A4DBF', marginBottom: '24px' }}>
        {promo.imageUrl && (
          <img src={promo.imageUrl} alt={promo.title} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }} />
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Title', value: promo.title },
            { label: 'Price', value: `$${promo.price}`, color: '#22c55e' },
            { label: 'Valid Until', value: promo.validUntil },
            { label: 'Description', value: promo.description || 'No description' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: '15px', fontWeight: '600', color: color || '#1a1a2e', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px', color: '#1a1a2e' }}>Included Menu Items</h3>
        {selectedItems.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px' }}>No items selected</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {selectedItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', border: '2px solid #3A4DBF', backgroundColor: '#f0f3ff' }}>
                <img src={item.image} alt={item.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{item.description}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#3A4DBF' }}>${item.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Promotions;