import { useEffect, useState } from 'react';

const AdminTable = () => {
  const [minis] = useState([]);

  useEffect(() => {
    // Fetch data from the database or API
    // Example: fetch('/api/minis').then(response => response.json()).then(data => setMinis(data));
  }, []);

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Location</th>
          <th>Quantity</th>
          <th>Created At</th>
          <th>Updated At</th>
          {/* Add more columns as needed */}
        </tr>
      </thead>
      <tbody>
        {minis.map((mini: {
          id: string;
          name: string;
          description: string;
          location: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        }) => (
          <tr key={mini.id}>
            <td>{mini.name}</td>
            <td>{mini.description}</td>
            <td>{mini.location}</td>
            <td>{mini.quantity}</td>
            <td>{mini.created_at}</td>
            <td>{mini.updated_at}</td>
            {/* Add more data as needed */}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AdminTable; 