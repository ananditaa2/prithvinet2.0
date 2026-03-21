import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Key, User as UserIcon, Bell, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const { user, login } = useAuth(); // Need login to rehydrate token/user? Actually just window.location.reload() or we assume JWT is valid.
  const { toast } = useToast();
  
  const [name, setName] = useState(user?.name || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  const [passForm, setPassForm] = useState({ current: "", new: "", confirm: "" });
  const [updatingPass, setUpdatingPass] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setUpdatingProfile(true);
    try {
      const updatedUser = await api.auth.updateProfile({ name });
      localStorage.setItem("prithvinet_user", JSON.stringify(updatedUser)); // Optimistic UI update
      toast({ title: "Profile updated", description: "Your details have been saved successfully." });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.new.length < 6) return toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
    if (passForm.new !== passForm.confirm) return toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
    
    setUpdatingPass(true);
    try {
      await api.auth.changePassword({ current_password: passForm.current, new_password: passForm.new });
      toast({ title: "Password changed", description: "Your password has been updated securely." });
      setPassForm({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      toast({ title: "Change failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Settings & Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences and security</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <UserIcon className="w-10 h-10 text-blue-700" />
            </div>
            <h3 className="font-bold text-gray-900">{user?.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{user?.email}</p>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              {user?.role.replace("_", " ")}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-gray-500" />
              Notifications
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email Alerts</span>
                <input type="checkbox" defaultChecked className="accent-blue-700 w-4 h-4" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">SMS Notifications</span>
                <input type="checkbox" className="accent-blue-700 w-4 h-4" />
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <UserIcon className="w-5 h-5 text-gray-500" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input disabled value={user?.email || ""}
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Contact IT to change email.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button disabled={updatingProfile || name === user?.name} type="submit"
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {updatingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-gray-500" />
              Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input required type="password" value={passForm.current} onChange={e => setPassForm(f => ({...f, current: e.target.value}))}
                  className="w-full sm:w-2/3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input required type="password" value={passForm.new} onChange={e => setPassForm(f => ({...f, new: e.target.value}))} minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input required type="password" value={passForm.confirm} onChange={e => setPassForm(f => ({...f, confirm: e.target.value}))} minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-600" /> Password encrypts using BCrypt
              </p>
              <button disabled={updatingPass || !passForm.current || !passForm.new || !passForm.confirm} type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {updatingPass ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
