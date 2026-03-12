import React, { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import axios from 'axios';
import API_BASE_URL from '../config/api';
const API_URL = `${API_BASE_URL}/api/ChitGroups`; 

interface GroupSelectProps {
    value: string;
    onChange: (value: string) => void;
}

interface ChitGroup {
    chitGroupId: string;
    groupName: string;
    groupCode: string;
    monthlyAmount: number;
    status: string; // "Active", "Suspended", "Completed", etc.
}

const GroupSelect: React.FC<GroupSelectProps> = ({ value, onChange }) => {
    const [groups, setGroups] = useState<ChitGroup[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                setLoading(true);
                const response = await axios.get(API_URL);
                
                // FILTER: Only show groups with 'Active' status
                const activeGroups = response.data.filter((g: ChitGroup) => g.status === 'Active');
                
                setGroups(activeGroups);
            } catch (error) {
                console.error("Error fetching groups", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
    }, []);

    return (
        <Form.Group className="mb-3">
            <Form.Label>Select Chit Group</Form.Label>
            <Form.Select 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                required
            >
                <option value="">-- Select a Group --</option>
                {groups.map(group => (
                    <option key={group.chitGroupId} value={group.chitGroupId}>
                        {group.groupName} ({group.groupCode}) - ₹{group.monthlyAmount}
                    </option>
                ))}
            </Form.Select>
            {loading && <Form.Text className="text-muted">Loading active groups...</Form.Text>}
        </Form.Group>
    );
};

export default GroupSelect;