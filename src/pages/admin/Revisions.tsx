import { useState, useEffect } from 'react';
import { History, Filter } from 'lucide-react';
import {
    getRevisions,
    getAllRevisions,
    type ContentRevision
} from '../../services/revisionService';
import Skeleton from '../../components/common/Skeleton';

const Revisions = () => {
    const [revisions, setRevisions] = useState<ContentRevision[]>([]);
    const [loading, setLoading] = useState(true);
    const [entityTypeFilter, setEntityTypeFilter] = useState('all');
    const [entityTypes, setEntityTypes] = useState<string[]>([]);

    useEffect(() => { loadRevisions(); }, []);

    const loadRevisions = async () => {
        setLoading(true);
        try {
            const { data } = await getAllRevisions();
            if (data) {
                setRevisions(data);
                const types = [...new Set(data.map(r => r.entity_type))];
                setEntityTypes(types);
            }
        } catch (err) {
            console.error('Failed to load revisions:', err);
        }
        setLoading(false);
    };

    const loadFiltered = async (type: string) => {
        setEntityTypeFilter(type);
        if (type === 'all') {
            loadRevisions();
            return;
        }
        setLoading(true);
        try {
            const { data } = await getRevisions(type);
            if (data) setRevisions(data);
        } catch (err) {
            console.error('Failed to load filtered revisions:', err);
        }
        setLoading(false);
    };

    const truncate = (text: string, max = 80) =>
        text && text.length > max ? text.substring(0, max) + '...' : text || '—';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Revision History</h1>
                    <p className="text-gray-500">Track changes across site content</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-400" size={20} />
                    <select
                        value={entityTypeFilter}
                        onChange={(e) => loadFiltered(e.target.value)}
                        className="input min-w-[160px]"
                    >
                        <option value="all">All Types</option>
                        {entityTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-900">Entity</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Field</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Old Value</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">New Value</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">User</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <Skeleton className={`h-4 ${j === 0 ? 'w-20' : j === 6 ? 'w-24' : 'w-28'}`} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : revisions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                        <History className="mx-auto mb-3 text-gray-300" size={40} />
                                        No revisions recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                revisions.map((rev) => (
                                    <tr key={rev.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                                {rev.entity_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{rev.entity_id?.substring(0, 8) ?? '—'}...</code>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{rev.field_name}</td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded line-clamp-2 font-mono text-xs">
                                                {truncate(rev.old_value)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded line-clamp-2 font-mono text-xs">
                                                {truncate(rev.new_value)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{rev.user_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {rev.created_at ? new Date(rev.created_at).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Revisions;
