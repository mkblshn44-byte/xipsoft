"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import TitleText from "@/components/Common/TitleText/TitleText";
import { updateUserProfileAction } from "@/app/_actions/user-actions";
import { ArrowLeft, Loader2, User, Link as LinkIcon, MapPin, Briefcase, Camera, Save, Globe, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EditProfileClient() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(document.cookie.includes("xipsoft_logged_in=1"));
  }, []);

  const user = { id: "", display_name: "", email: "", bio: "", website: "", location: "", job: "", branch: "", photo_url: null, created_at: "" } as any;
  const refresh = async () => {};
  const isAuthenticated = authed;
  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [job, setJob] = useState("");
  const [branch, setBranch] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/register");
      return;
    }
    setDisplayName(user.display_name || "");
    setOriginalDisplayName(user.display_name || "");
    setWebsite(user.website || "");
    setLocation(user.location || "");
    setJob(user.job || "");
    setBranch(user.branch || "");
    setBio(user.bio || "");
    setAvatarPreview(user.photo_url || null);
    setCoverPreview((user as any).cover_url || null);
  }, [isAuthenticated, user, router]);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (displayName.trim().length && displayName.trim().length < 2) {
      errors.displayName = "Kullanıcı adı en az 2 karakter olmalıdır";
    }
    if (displayName.length > 255) {
      errors.displayName = "Kullanıcı adı en fazla 255 karakter olabilir";
    }

    if (website.trim()) {
      if (website.length > 500) {
        errors.website = "Website URL'i en fazla 500 karakter olabilir";
      }
      try {
        const url = new URL(website);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.website = "geçerli bir HTTP/HTTPS URL'i giriniz";
        }
      } catch {
        errors.website = "geçerli bir URL formatı giriniz (https://... ile baslamalı)";
      }
    }

    if (location.length > 255) {
      errors.location = "Konum en fazla 255 karakter olabilir";
    }

    if (job.length > 255) {
      errors.job = "Is en fazla 255 karakter olabilir";
    }

    if (branch.length > 255) {
      errors.branch = "sube en fazla 255 karakter olabilir";
    }

    if (bio.length > 500) {
      errors.bio = "Biyografi en fazla 500 karakter olabilir";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");

    try {
      const { uploadAvatarAction } = await import("@/app/_actions/upload-actions");
      const result = await uploadAvatarAction(formData);
      if (result.success && result.url) {
        setAvatarPreview(result.url);
        setSuccess("✅ Avatar basarıyla yüklendi! (WebP formatında kaydedildi)");
        setTimeout(() => setSuccess(null), 3000);
        if (refresh) await refresh();
      } else {
        setError(result.error || "Avatar yüklenirken bir hata olustu.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Avatar yüklenirken bir hata olustu.");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "cover");

    try {
      const { uploadAvatarAction } = await import("@/app/_actions/upload-actions");
      const result = await uploadAvatarAction(formData);
      if (result.success && result.url) {
        setCoverPreview(result.url);
        setSuccess("✅ Arka plan resmi basarıyla yüklendi! (WebP formatında kaydedildi)");
        setTimeout(() => setSuccess(null), 3000);
        if (refresh) await refresh();
      } else {
        setError(result.error || "Arka plan resmi yüklenirken bir hata olustu.");
      }
    } catch (err) {
      console.error("Cover upload error:", err);
      setError("Arka plan resmi yüklenirken bir hata olustu.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await updateUserProfileAction({
        website: website.trim() || undefined,
        location: location.trim() || undefined,
        job: job.trim() || undefined,
        branch: branch.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Profil güncellenirken bir hata olustu.");
        return;
      }

      setSuccess("✅ Profil basarıyla güncellendi!");;
      if (refresh) await refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Profil güncellenirken bir hata olustu. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-black">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/10 blur-[120px] rounded-full -ml-48 -mb-48"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        <Link href={`/x/${user?.display_name || user?.id}`} className="inline-flex items-center gap-2 text-xs -black uppercase tracking-widest text-zinc-500 hover:text-purple-400 transition-all group italic">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Profile Dön
        </Link>

        <div className="space-y-2">
          <TitleText tag="h1" variant="hero" className="mb-2">
            Profilini Özellestir
          </TitleText>
          <p className="text-zinc-500 font-medium italic">XipSoft toplulugundaki kimligini yönet ve bilgilerini guncelle.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 p-1 shadow-2xl shadow-purple-500/20">
                  <div className="w-full h-full rounded-full bg-zinc-900 overflow-hidden relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl -black text-zinc-700 italic">
                        {displayName?.charAt(0) || "X"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
              </div>
              <div className="mt-6 text-center">
                <h4 className="text-white font-bold italic uppercase tracking-tight">{displayName || "Isimsiz"}</h4>
                <p className="text-[10px] text-zinc-500 -black uppercase tracking-widest mt-1">Avatarını degistirmek için tıkla</p>
                <p className="text-[9px] text-zinc-600 mt-1">WebP formatında kaydedilir</p>
              </div>
            </div>

            {/* Cover Image Section */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-xl">
              <div
                className="relative h-32 cursor-pointer group"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Arka Plan" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                      <p className="text-[10px] text-zinc-600 -black uppercase tracking-widest">Arka Plan Resmi</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                )}
                <input type="file" ref={coverInputRef} onChange={handleCoverChange} accept="image/*" className="hidden" />
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] text-zinc-500 -black uppercase tracking-widest">Arka planı degistirmek için tıkla</p>
                <p className="text-[9px] text-zinc-600 mt-1">1200×400 WebP formatında kaydedilir</p>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3 text-zinc-400">
                    <Globe className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] -black uppercase tracking-widest italic">Kayıt: {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '...'}</span>
                </div>
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name - Nick degistirilemez */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] -black uppercase tracking-widest text-zinc-500 italic">görunen Ad</label>
                  <span className="text-[10px] text-zinc-500 italic bg-zinc-800/60 px-2 py-0.5 rounded">Degistirilemez</span>
                </div>
                <input
                  type="text"
                  value={displayName}
                  disabled
                  readOnly
                  className="w-full bg-zinc-800/40 border border-zinc-700/50 rounded-xl px-5 py-4 text-zinc-500 font-bold italic cursor-not-allowed opacity-60"
                />
                <p className="mt-2 text-xs text-zinc-600 italic">Kullanıcı adı degistirilemez. Destek için iletisime geçin.</p>
              </div>

              {/* Website */}
              <div>
                <label className="text-[10px] -black uppercase tracking-widest text-zinc-500 italic mb-2 block">Website</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      setValidationErrors(prev => ({ ...prev, website: "" }));
                    }}
                    maxLength={500}
                    className={`w-full bg-white/5 border rounded-xl pl-12 pr-5 py-4 text-white font-bold italic focus:outline-none transition-all ${
                      validationErrors.website ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
                    }`}
                    placeholder="https://..."
                  />
                </div>
                {validationErrors.website && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {validationErrors.website}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] -black uppercase tracking-widest text-zinc-500 italic mb-2 block">Konum</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setValidationErrors(prev => ({ ...prev, location: "" }));
                    }}
                    maxLength={255}
                    className={`w-full bg-white/5 border rounded-xl pl-12 pr-5 py-4 text-white font-bold italic focus:outline-none transition-all ${
                      validationErrors.location ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
                    }`}
                    placeholder="Istanbul, TR"
                  />
                </div>
                {validationErrors.location && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {validationErrors.location}
                  </p>
                )}
              </div>

              {/* Job */}
              <div>
                <label className="text-[10px] -black uppercase tracking-widest text-zinc-500 italic mb-2 block">Meslek</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={job}
                    onChange={(e) => {
                      setJob(e.target.value);
                      setValidationErrors(prev => ({ ...prev, job: "" }));
                    }}
                    maxLength={255}
                    className={`w-full bg-white/5 border rounded-xl pl-12 pr-5 py-4 text-white font-bold italic focus:outline-none transition-all ${
                      validationErrors.job ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
                    }`}
                    placeholder="gelistirici"
                  />
                </div>
                {validationErrors.job && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {validationErrors.job}
                  </p>
                )}
              </div>

              {/* Branch */}
              <div>
                <label className="text-[10px] -black uppercase tracking-widest text-zinc-500 italic mb-2 block">sube / Alan</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setValidationErrors(prev => ({ ...prev, branch: "" }));
                  }}
                  maxLength={255}
                  className={`w-full bg-white/5 border rounded-xl px-5 py-4 text-white font-bold italic focus:outline-none transition-all ${
                    validationErrors.branch ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
                  }`}
                  placeholder="Frontend"
                />
                {validationErrors.branch && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {validationErrors.branch}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] -black uppercase tracking-widest text-zinc-500 italic">Hakkımda</label>
                  <span className="text-[10px] text-zinc-600 italic">{bio.length} / 500</span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    setValidationErrors(prev => ({ ...prev, bio: "" }));
                  }}
                  maxLength={500}
                  rows={4}
                  className={`w-full bg-white/5 border rounded-xl px-5 py-4 text-white font-bold italic focus:outline-none transition-all resize-none ${
                    validationErrors.bio ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
                  }`}
                />
                {validationErrors.bio && (
                  <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {validationErrors.bio}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 pt-4">
                <button
                  type="submit"
                  disabled={loading || Object.keys(validationErrors).length > 0}
                  className="w-full group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white -black italic uppercase tracking-widest shadow-2xl shadow-purple-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                  {loading ? "Kaydediliyor..." : "Degisiklikleri Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}