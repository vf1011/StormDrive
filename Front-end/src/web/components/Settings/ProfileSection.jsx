
import { useState, useEffect } from "react";
import { supabase } from "../../../supabase";
import "./Styles/ProfileSection.css";


const ProfileSection = () => {
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [country, setCountry] = useState("");
  const [cityState, setCityState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [orgId, setOrgId] = useState("");
   const [phoneError, setPhoneError] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [lastLogin, setLastLogin] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setName(user.user_metadata?.full_name || "");
        setEmail(user.email || "");
        setProfilePic(user.user_metadata?.avatar_url || "");
        setPhone(user.user_metadata?.phone || "");
        setLocation(user.user_metadata?.location || "");
        setBirthday(user.user_metadata?.birthday || "");
        setCountry(user.user_metadata?.country || "");
        setCityState(user.user_metadata?.city_state || "");
        setPostalCode(user.user_metadata?.postal_code || "");
        setOrgId(user.user_metadata?.org_id || "");
        setTwoFAEnabled(user.user_metadata?.twoFAEnabled || false);
        setLastLogin(user.last_sign_in_at || "Not available");
        setDeviceInfo(navigator.userAgent);
      }
    };

    fetchUserInfo();
  }, []);

const handleImageChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error("Not logged in");

   // unique path avoids stale-cache + filename collisions
   const path = `public/${user.id}/${Date.now()}_${file.name}`;

    const uploadResponse = await supabase.storage
      .from("avatars")

    .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadResponse.error) throw uploadResponse.error;


   const { publicUrl } = supabase.storage.from("avatars").getPublicUrl(path).data;

    setProfilePic(publicUrl);

   // ✅ immediately persist to auth metadata so Navbar can react
   const { error } = await supabase.auth.updateUser({
     data: { avatar_url: publicUrl, avatar_updated_at: new Date().toISOString() }
   });
   if (error) throw error;
  } catch (err) {
    console.error("Error uploading avatar:", err.message);
    alert("Failed to upload profile picture.");
  }
};
 

const handleSave = async () => {
  setLoading(true);

  // 1) phone must be digits only
  if (!/^\d+$/.test(phone)) {
    setPhoneError("Phone number must contain only digits.");
    setLoading(false);
    return;
  }
  // 2) enforce exact length (e.g. 10 digits)
  if (phone.length !== 10) {
    setPhoneError("Please enter a 10-digit phone number.");
    setLoading(false);
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const updates = {
      full_name: name,
      avatar_url: profilePic,
      phone,
      location,
      birthday,
      country,
      city_state: cityState,
      postal_code: postalCode,
      org_id: orgId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) throw error;
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("An error occurred while updating the profile.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="profile-settings">
      <h2 className="profile-title">Profile Settings</h2>
      <p className="profile-desc">Manage your profile information and security settings.</p>

      <div className="profile-grid">

        {/* Avatar */}
        <div className="section profile-overview">
          <h3>Profile Overview</h3>
          <div className="avatar-upload">
            <img src={profilePic || ""} alt="Avatar" />
            <label htmlFor="upload-avatar">Upload</label>
            <input id="upload-avatar" type="file" accept="image/*" onChange={handleImageChange} hidden />
          </div>
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        {/* Personal Information */}
        <div className="section">
          <h3>Personal Information</h3>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
              <input
      /* switch to text so we can fully control the sanitization */
                type="text"
                placeholder="Phone Number"
                value={phone}
                inputMode="numeric"           /* mobile keyboards will show numbers */
                pattern="\d*"                 /* hint for native validation */
                onChange={(e) => {
                  // strip everything except digits
                  const digits = e.target.value.replace(/\D/g, "");
                  setPhone(digits);
                  // optionally clear error as they type
                  if (phoneError) setPhoneError("");
                }}
              />
              {phoneError && <div className="error">{phoneError}</div>}
          <input type="date" placeholder="Birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          <div className="readonly">2FA Enabled: <span>{twoFAEnabled ? "Yes" : "No"}</span></div>
          <div className="readonly">Last Login: <span>{new Date(lastLogin).toLocaleString()}</span></div>
          <div className="readonly">Device Info: <span>{deviceInfo}</span></div>
        </div>

        {/* Address */}
        <div className="section">
          <h3>Account Address</h3>
          <input type="text" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
          <input type="text" placeholder="City/State" value={cityState} onChange={(e) => setCityState(e.target.value)} />
          <input type="text" placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          <input type="text" placeholder="Tax / Org ID (Optional)" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
        </div>

      </div>

      <button className="save-button" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
};

export default ProfileSection;
