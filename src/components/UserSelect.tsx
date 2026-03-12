import React, { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const API_URL = `${API_BASE_URL}/api/Users`; 

interface UserSelectProps {
    value: string;
    onChange: (value: string) => void;
}

interface User {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    userRole: string; // Added to check for "Member", "Admin", etc.
}

const UserSelect: React.FC<UserSelectProps> = ({ value, onChange }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await axios.get(API_URL);

                // FILTER: 
                // 1. Must be Active
                // 2. Role must strictly be 'Member' (Excludes 'Admin', 'Agent')
                const eligibleUsers = response.data.filter((u: User) => 
                    u.isActive === true && 
                    u.userRole === 'Member'
                );

                setUsers(eligibleUsers);
            } catch (error) {
                console.error("Error fetching users", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    return (
        <Form.Group className="mb-3">
            <Form.Label>Select Member</Form.Label>
            <Form.Select 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                required
            >
                <option value="">-- Select a User --</option>
                {users.map(user => (
                    <option key={user.userId} value={user.userId}>
                        {user.firstName} {user.lastName} ({user.email})
                    </option>
                ))}
            </Form.Select>
            {loading && <Form.Text className="text-muted">Loading eligible members...</Form.Text>}
            {users.length === 0 && !loading && (
                <Form.Text className="text-danger">
                    No active users with 'Member' role found.
                </Form.Text>
            )}
        </Form.Group>
    );
};

export default UserSelect;