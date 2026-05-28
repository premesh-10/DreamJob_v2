import { useState, useEffect } from 'react';
import SellerLayout from '../../components/SellerLayout';
import api from '../../lib/api';

function InterviewSchedule() {
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileForm, setProfileForm] = useState({ domain: '', price: '', meetingMode: 'Google Meet' });
    const [slotForm, setSlotForm] = useState({ date: '', startTime: '', endTime: '', meetingLink: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [addingSlot, setAddingSlot] = useState(false);
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [p, b] = await Promise.all([
                api.get('/interviews/mine'),
                api.get('/interviews/bookings/seller')
            ]);
            const prof = p.data.data;
            setProfile(prof);
            if (prof) setProfileForm({ domain: prof.domain, price: prof.price, meetingMode: prof.meetingMode });
            setBookings(b.data.data?.filter(b => b.type === 'interview') || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const saveProfile = async e => {
        e.preventDefault(); setSavingProfile(true); setMsg(''); setError('');
        try {
            await api.post('/interviews', profileForm);
            setMsg('Interview profile saved!');
            load();
        } catch (err) { setError(err?.response?.data?.message || 'Failed to save profile'); }
        finally { setSavingProfile(false); }
    };

    const addSlot = async e => {
        e.preventDefault(); setAddingSlot(true); setError('');
        try {
            if (!slotForm.meetingLink.trim()) { setError('Meeting link is required'); setAddingSlot(false); return; }
            const startTime = new Date(`${slotForm.date}T${slotForm.startTime}`).toISOString();
            const endTime = new Date(`${slotForm.date}T${slotForm.endTime}`).toISOString();
            await api.post('/interviews/slots', { startTime, endTime, meetingLink: slotForm.meetingLink });
            setShowSlotModal(false);
            setSlotForm({ date: '', startTime: '', endTime: '', meetingLink: '' });
            setMsg('Slot added!');
            load();
        } catch (err) { setError(err?.response?.data?.message || 'Failed to add slot'); }
        finally { setAddingSlot(false); }
    };

    const deleteSlot = async (slotId) => {
        if (!window.confirm('Remove this slot?')) return;
        try { await api.delete(`/interviews/slots/${slotId}`); load(); }
        catch (err) { alert('Failed to delete slot'); }
    };

    if (loading) return <SellerLayout><div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></SellerLayout>;

    return (
        <SellerLayout>
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Interview Schedule</h1>
                    <p className="text-slate-500 mt-1">Manage your interview profile, time slots, and bookings</p>
                </div>

                {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">{msg}</div>}
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

                {/* Interview Profile */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">🎙️ Interview Profile</h2>
                    <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Domain / Expertise *</label>
                            <input type="text" value={profileForm.domain} onChange={e => setProfileForm(p=>({...p,domain:e.target.value}))} required
                                placeholder="e.g. System Design, React, Python"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price per Session ($) *</label>
                            <input type="number" value={profileForm.price} onChange={e => setProfileForm(p=>({...p,price:e.target.value}))} required min="0"
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Meeting Mode</label>
                            <select value={profileForm.meetingMode} onChange={e => setProfileForm(p=>({...p,meetingMode:e.target.value}))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none">
                                {['Google Meet','Zoom','Teams','Custom Link'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <button type="submit" disabled={savingProfile}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold disabled:opacity-60 hover:shadow-md transition">
                                {savingProfile ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Time Slots */}
                {profile && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">🗓️ Available Slots</h2>
                            <button onClick={() => setShowSlotModal(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                                + Add Slot
                            </button>
                        </div>

                        {profile.slots?.length > 0 ? (
                            <div className="space-y-3">
                                {profile.slots.map(slot => (
                                    <div key={slot._id} className={`flex items-center justify-between p-4 rounded-xl border ${slot.isBooked ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-indigo-50 border-indigo-200'}`}>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">
                                                {new Date(slot.startTime).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} &nbsp;
                                                {new Date(slot.startTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} – {new Date(slot.endTime).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                                            </p>
                                            <a href={slot.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline truncate block max-w-xs">{slot.meetingLink}</a>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${slot.isBooked ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {slot.isBooked ? 'Booked' : 'Available'}
                                            </span>
                                            {!slot.isBooked && (
                                                <button onClick={() => deleteSlot(slot._id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400">
                                <span className="text-4xl">🗓️</span>
                                <p className="mt-2 text-sm">No slots yet. Add your first available slot!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Upcoming Bookings */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">📋 Upcoming Bookings</h2>
                    {bookings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-slate-500 border-b border-slate-100">{['Student','Date','Time','Amount','Meeting Link'].map(h=><th key={h} className="pb-3 pr-4 font-medium">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {bookings.map(b => (
                                        <tr key={b._id} className="hover:bg-slate-50">
                                            <td className="py-3 pr-4 font-medium text-slate-800">{b.user?.name}</td>
                                            <td className="py-3 pr-4 text-slate-600">{new Date(b.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 pr-4 text-slate-600">Confirmed</td>
                                            <td className="py-3 pr-4 font-semibold text-emerald-600">${b.amountPaid?.toFixed(2)}</td>
                                            <td className="py-3 pr-4">
                                                {b.meetingLink ? (
                                                    <a href={b.meetingLink} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs hover:underline font-medium">Join →</a>
                                                ) : <span className="text-slate-400 text-xs">N/A</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-slate-400 text-sm text-center py-8">No bookings yet</p>}
                </div>
            </div>

            {/* Add Slot Modal */}
            {showSlotModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-900">Add New Slot</h3>
                            <button onClick={() => setShowSlotModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">✕</button>
                        </div>
                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
                        <form onSubmit={addSlot} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
                                <input type="date" value={slotForm.date} onChange={e=>setSlotForm(p=>({...p,date:e.target.value}))} required
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Time *</label>
                                    <input type="time" value={slotForm.startTime} onChange={e=>setSlotForm(p=>({...p,startTime:e.target.value}))} required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Time *</label>
                                    <input type="time" value={slotForm.endTime} onChange={e=>setSlotForm(p=>({...p,endTime:e.target.value}))} required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Meeting Link <span className="text-red-500">*</span>
                                </label>
                                <input type="url" value={slotForm.meetingLink} onChange={e=>setSlotForm(p=>({...p,meetingLink:e.target.value}))} required
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <p className="text-xs text-slate-400 mt-1">Students will receive this link after booking</p>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowSlotModal(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl font-semibold text-slate-700">Cancel</button>
                                <button type="submit" disabled={addingSlot} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60">
                                    {addingSlot ? 'Adding...' : 'Add Slot'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SellerLayout>
    );
}

export default InterviewSchedule;
